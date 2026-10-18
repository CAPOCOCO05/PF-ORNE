import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../theme/colors";

export interface Opcion<T> {
    valor: T;
    texto: string;
    deshabilitada?: boolean;
}

interface SelectorOpcionesProps<T> {
    etiqueta: string;
    opciones: Opcion<T>[];
    seleccionada: T | null;
    onSeleccionar: (valor: T) => void;
    error?: string;
}

// fila de opciones tipo "chip" para tamaño y niveles; la elegida se resalta
export default function SelectorOpciones<T extends string | number>({etiqueta, opciones, seleccionada, onSeleccionar, error}: SelectorOpcionesProps<T>) {
    return (
        <View style={styles.bloque}>
            <Text style={styles.etiqueta}>{etiqueta}</Text>
            <View style={styles.fila} accessibilityRole="radiogroup" accessibilityLabel={etiqueta}>
                {opciones.map(({valor, texto, deshabilitada}) => {
                    const elegida = valor === seleccionada;
                    return (
                        <Pressable
                            key={String(valor)}
                            onPress={() => onSeleccionar(valor)}
                            disabled={deshabilitada}
                            accessibilityRole="radio"
                            accessibilityLabel={`${etiqueta} ${texto}`}
                            accessibilityState={{selected: elegida, disabled: deshabilitada}}
                            style={[
                                styles.opcion,
                                elegida && styles.opcionElegida,
                                deshabilitada && styles.opcionDeshabilitada,
                                !!error && styles.opcionConError,
                            ]}
                        >
                            <Text style={[styles.texto, elegida && styles.textoElegido]}>{texto}</Text>
                        </Pressable>
                    );
                })}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    bloque: {
        marginBottom: 20,
    },
    etiqueta: {
        fontSize: 15,
        color: COLORS.TEXTO,
        marginBottom: 8,
    },
    fila: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    opcion: {
        minWidth: 52,
        minHeight: 40,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.FONDO,
        backgroundColor: COLORS.FONDO,
        alignItems: 'center',
        justifyContent: 'center',
    },
    opcionElegida: {
        borderColor: COLORS.BOTON_PRINCIPAL,
        backgroundColor: COLORS.BOTON_SECUNDARIO,
    },
    opcionDeshabilitada: {
        opacity: 0.35,
    },
    opcionConError: {
        borderColor: COLORS.ERROR,
    },
    texto: {
        fontSize: 15,
        color: COLORS.TEXTO,
    },
    textoElegido: {
        color: COLORS.TITULO,
        fontWeight: '700',
    },
    error: {
        marginTop: 6,
        fontSize: 13,
        color: COLORS.ERROR,
    },
});
