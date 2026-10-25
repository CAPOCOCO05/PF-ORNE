import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../theme/colors";
import { Niveles } from "../../types/pedido.types";
import { fechaMaxima, fechaMinima, semanasDelMes, validarFechaEntrega } from "../../utils/entrega";

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface CalendarioProps {
    seleccionada: string | null;     // 'YYYY-MM-DD'
    niveles: Niveles | null;
    hoy: string;
    onSeleccionar: (fecha: string) => void;
    error?: string;
}

interface Mes {
    anio: number;
    mes: number;   // 0-11
}

function mesDe(fecha: string): Mes {
    const [anio, mes] = fecha.split('-').map(Number);
    return {anio, mes: mes - 1};
}

function moverMes({anio, mes}: Mes, delta: number): Mes {
    const total = anio * 12 + mes + delta;
    return {anio: Math.floor(total / 12), mes: total % 12};
}

const claveMes = ({anio, mes}: Mes) => anio * 12 + mes;

// calendario mensual propio (F02 D7): los dias fuera de rango y los domingos no se pueden elegir
export default function Calendario({seleccionada, niveles, hoy, onSeleccionar, error}: CalendarioProps) {
    const primerMes = mesDe(fechaMinima(niveles, hoy));
    const ultimoMes = mesDe(fechaMaxima(hoy));
    const [visible, setVisible] = useState<Mes>(() => (seleccionada ? mesDe(seleccionada) : primerMes));

    const puedeAtras = claveMes(visible) > claveMes(primerMes);
    const puedeAdelante = claveMes(visible) < claveMes(ultimoMes);

    return (
        <View style={[styles.contenedor, !!error && styles.contenedorError]}>
            <View style={styles.encabezado}>
                <Flecha texto="‹" etiqueta="Mes anterior" activa={puedeAtras} onPress={() => setVisible(moverMes(visible, -1))} />
                <Text style={styles.mes}>{MESES[visible.mes]} {visible.anio}</Text>
                <Flecha texto="›" etiqueta="Mes siguiente" activa={puedeAdelante} onPress={() => setVisible(moverMes(visible, 1))} />
            </View>
            <View style={styles.semana}>
                {DIAS_SEMANA.map((dia, i) => <Text key={i} style={styles.diaSemana}>{dia}</Text>)}
            </View>
            {semanasDelMes(visible.anio, visible.mes).map((semana, i) => (
                <View key={i} style={styles.semana}>
                    {semana.map((fecha, j) => fecha ? (
                        <Dia
                            key={fecha}
                            fecha={fecha}
                            disponible={!validarFechaEntrega(fecha, niveles, hoy)}
                            elegida={fecha === seleccionada}
                            onPress={() => onSeleccionar(fecha)}
                        />
                    ) : <View key={j} style={styles.celda} />)}
                </View>
            ))}
        </View>
    );
}

function Flecha({texto, etiqueta, activa, onPress}: {texto: string; etiqueta: string; activa: boolean; onPress: () => void}) {
    return (
        <Pressable onPress={onPress} disabled={!activa} accessibilityRole="button" accessibilityLabel={etiqueta}
            accessibilityState={{disabled: !activa}} style={styles.flecha} hitSlop={8}>
            <Text style={[styles.textoFlecha, !activa && styles.textoFlechaInactiva]}>{texto}</Text>
        </Pressable>
    );
}

function Dia({fecha, disponible, elegida, onPress}: {fecha: string; disponible: boolean; elegida: boolean; onPress: () => void}) {
    return (
        <Pressable onPress={onPress} disabled={!disponible} accessibilityRole="button" accessibilityLabel={fecha}
            accessibilityState={{disabled: !disponible, selected: elegida}} style={styles.celda}>
            <View style={[styles.dia, elegida && styles.diaElegido]}>
                <Text style={[styles.numero, !disponible && styles.numeroNoDisponible, elegida && styles.numeroElegido]}>
                    {Number(fecha.slice(8))}
                </Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    contenedor: {
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: COLORS.FONDO,
        backgroundColor: COLORS.FONDO,
        padding: 12,
    },
    contenedorError: {
        borderColor: COLORS.ERROR,
    },
    encabezado: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    mes: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.TITULO,
    },
    flecha: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textoFlecha: {
        fontSize: 26,
        color: COLORS.BOTON_PRINCIPAL,
    },
    textoFlechaInactiva: {
        color: COLORS.TEXTO_SUAVE,
        opacity: 0.35,
    },
    semana: {
        flexDirection: 'row',
    },
    diaSemana: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.TEXTO_SUAVE,
        marginBottom: 4,
    },
    celda: {
        flex: 1,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dia: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    diaElegido: {
        backgroundColor: COLORS.BOTON_PRINCIPAL,
    },
    numero: {
        fontSize: 14,
        color: COLORS.TEXTO,
    },
    numeroNoDisponible: {
        color: COLORS.TEXTO_SUAVE,
        opacity: 0.4,
    },
    numeroElegido: {
        color: COLORS.BLANCO,
        fontWeight: '700',
    },
});
