import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Boton from "../Boton";
import ChipFiltro from "./ChipFiltro";
import { RANGOS_PRECIO } from "../../constants/filtrosCatalogo";
import { SABORES_PAN, SABORES_RELLENO } from "../../constants/catalogoSabores";
import { FiltrosCatalogo } from "../../types/pedido.types";
import { alternar, limpiarFiltros, textoNiveles, textoTamanio } from "../../utils/filtrosCatalogo";
import { NIVELES, TAMANIOS } from "../../utils/pedido";
import { COLORS } from "../../theme/colors";

interface PanelFiltrosProps {
    filtros: FiltrosCatalogo;
    onAplicar: (filtros: FiltrosCatalogo) => void;
}

// desplegable de "Filtrar" (F07 M5): se elige en un borrador y se aplica con
// "Ver resultados", asi no se consulta el servidor en cada toque
export default function PanelFiltros({filtros, onAplicar}: PanelFiltrosProps) {
    const [borrador, setBorrador] = useState(filtros);
    const cambiar = (parcial: Partial<FiltrosCatalogo>) => setBorrador((actual) => ({...actual, ...parcial}));

    return (
        <View style={styles.panel} testID="panel-filtros">
            <Seccion
                titulo="Precio"
                opciones={RANGOS_PRECIO.map((r) => ({valor: r.id, texto: r.texto}))}
                marcados={borrador.precio ? [borrador.precio] : []}
                onMarcar={(id) => cambiar({precio: borrador.precio === id ? null : id})}
            />
            <Seccion
                titulo="Pan"
                opciones={SABORES_PAN.map((s) => ({valor: s.id, texto: s.nombre}))}
                marcados={borrador.panes}
                onMarcar={(id) => cambiar({panes: alternar(borrador.panes, id)})}
            />
            <Seccion
                titulo="Relleno"
                opciones={SABORES_RELLENO.map((s) => ({valor: s.id, texto: s.nombre}))}
                marcados={borrador.rellenos}
                onMarcar={(id) => cambiar({rellenos: alternar(borrador.rellenos, id)})}
            />
            <Seccion
                titulo="Tamaño"
                opciones={TAMANIOS.map((t) => ({valor: t, texto: textoTamanio(t)}))}
                marcados={borrador.tamanios}
                onMarcar={(t) => cambiar({tamanios: alternar(borrador.tamanios, t)})}
            />
            <Seccion
                titulo="Niveles"
                opciones={NIVELES.map((n) => ({valor: n, texto: textoNiveles(n)}))}
                marcados={borrador.niveles}
                onMarcar={(n) => cambiar({niveles: alternar(borrador.niveles, n)})}
            />
            <View style={styles.acciones}>
                <Pressable onPress={() => setBorrador(limpiarFiltros(borrador))} accessibilityRole="button" hitSlop={8}>
                    <Text style={styles.limpiar}>Limpiar</Text>
                </Pressable>
                <Boton titulo="Ver resultados" onPress={() => onAplicar(borrador)} style={styles.botonAplicar} />
            </View>
        </View>
    );
}

interface SeccionProps<T> {
    titulo: string;
    opciones: {valor: T; texto: string}[];
    marcados: T[];
    onMarcar: (valor: T) => void;
}

// una fila por seccion con desplazamiento horizontal para que el panel sea bajo
function Seccion<T extends string | number>({titulo, opciones, marcados, onMarcar}: SeccionProps<T>) {
    return (
        <View style={styles.seccion}>
            <Text style={styles.titulo}>{titulo}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
                {opciones.map(({valor, texto}) => (
                    <ChipFiltro
                        key={String(valor)}
                        texto={texto}
                        marcado={marcados.includes(valor)}
                        onPress={() => onMarcar(valor)}
                        etiquetaAccesible={`${titulo} ${texto}`}
                    />
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    panel: {
        marginTop: 8,
        padding: 12,
        borderRadius: 14,
        backgroundColor: COLORS.BLANCO,
        borderWidth: 1,
        borderColor: COLORS.BOTON_SECUNDARIO,
        gap: 10,
    },
    seccion: {
        gap: 6,
    },
    titulo: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.TITULO,
    },
    fila: {
        gap: 6,
    },
    acciones: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    limpiar: {
        fontSize: 14,
        color: COLORS.BOTON_PRINCIPAL,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    botonAplicar: {
        minHeight: 40,
        paddingHorizontal: 20,
    },
});
