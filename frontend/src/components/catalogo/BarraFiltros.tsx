import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import PanelFiltros from "./PanelFiltros";
import FiltrosAplicados from "./FiltrosAplicados";
import { ORDENES_CATALOGO } from "../../constants/filtrosCatalogo";
import { FiltrosCatalogo, OrdenCatalogo } from "../../types/pedido.types";
import { contarFiltros, textoOrden } from "../../utils/filtrosCatalogo";
import { COLORS } from "../../theme/colors";

type Desplegable = 'filtros' | 'orden' | null;

interface BarraFiltrosProps {
    filtros: FiltrosCatalogo;
    onCambiar: (filtros: FiltrosCatalogo) => void;
}

// F07 M5: barra compacta con dos desplegables ("Filtrar" y "Ordenar") que se abren
// debajo, sin cubrir el catalogo; los filtros aplicados se ven como chips con "×"
export default function BarraFiltros({filtros, onCambiar}: BarraFiltrosProps) {
    const [abierto, setAbierto] = useState<Desplegable>(null);
    const alternarDesplegable = (cual: Desplegable) => setAbierto((actual) => actual === cual ? null : cual);
    const aplicar = (nuevos: FiltrosCatalogo) => {
        setAbierto(null);
        onCambiar(nuevos);
    };
    const total = contarFiltros(filtros);

    return (
        <View style={styles.contenedor}>
            <View style={styles.barra}>
                <BotonDesplegable
                    texto={total > 0 ? `Filtrar (${total})` : 'Filtrar'}
                    abierto={abierto === 'filtros'}
                    activo={total > 0}
                    onPress={() => alternarDesplegable('filtros')}
                />
                <BotonDesplegable
                    texto={`Ordenar: ${textoOrden(filtros.orden)}`}
                    abierto={abierto === 'orden'}
                    activo={filtros.orden !== 'nombre'}
                    onPress={() => alternarDesplegable('orden')}
                />
            </View>
            {abierto === 'filtros' && <PanelFiltros filtros={filtros} onAplicar={aplicar} />}
            {abierto === 'orden' && <MenuOrden orden={filtros.orden} onElegir={(orden) => aplicar({...filtros, orden})} />}
            <FiltrosAplicados filtros={filtros} onCambiar={onCambiar} />
        </View>
    );
}

interface BotonDesplegableProps {
    texto: string;
    abierto: boolean;
    activo: boolean;     // con filtros u orden distinto al de por defecto: se resalta
    onPress: () => void;
}

function BotonDesplegable({texto, abierto, activo, onPress}: BotonDesplegableProps) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={texto}
            accessibilityState={{expanded: abierto}}
            style={[styles.desplegable, (activo || abierto) && styles.desplegableActivo]}
        >
            <Text style={[styles.textoDesplegable, activo && styles.textoActivo]} numberOfLines={1}>{texto}</Text>
            <Text style={styles.flecha}>{abierto ? '▴' : '▾'}</Text>
        </Pressable>
    );
}

function MenuOrden({orden, onElegir}: {orden: OrdenCatalogo; onElegir: (orden: OrdenCatalogo) => void}) {
    return (
        <View style={styles.menu} accessibilityRole="radiogroup" accessibilityLabel="Ordenar por">
            {ORDENES_CATALOGO.map(({id, texto}) => {
                const elegido = id === orden;
                return (
                    <Pressable
                        key={id}
                        onPress={() => onElegir(id)}
                        accessibilityRole="radio"
                        accessibilityLabel={texto}
                        accessibilityState={{selected: elegido}}
                        style={styles.opcionMenu}
                    >
                        <Text style={[styles.textoOpcion, elegido && styles.textoActivo]}>{texto}</Text>
                        {elegido && <Text style={styles.marca}>✓</Text>}
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    contenedor: {
        alignSelf: 'stretch',
        marginHorizontal: 8,
        marginTop: 12,
    },
    barra: {
        flexDirection: 'row',
        gap: 8,
    },
    desplegable: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 38,
        paddingHorizontal: 12,
        borderRadius: 19,
        borderWidth: 1.5,
        borderColor: COLORS.FONDO,
        backgroundColor: COLORS.FONDO,
    },
    desplegableActivo: {
        borderColor: COLORS.BOTON_PRINCIPAL,
    },
    textoDesplegable: {
        flexShrink: 1,
        fontSize: 13,
        color: COLORS.TEXTO,
    },
    textoActivo: {
        color: COLORS.TITULO,
        fontWeight: '700',
    },
    flecha: {
        marginLeft: 6,
        fontSize: 13,
        color: COLORS.TITULO,
    },
    menu: {
        marginTop: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.BOTON_SECUNDARIO,
        backgroundColor: COLORS.BLANCO,
        overflow: 'hidden',
    },
    opcionMenu: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    textoOpcion: {
        fontSize: 14,
        color: COLORS.TEXTO,
    },
    marca: {
        fontSize: 14,
        color: COLORS.BOTON_PRINCIPAL,
        fontWeight: '700',
    },
});
