import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Sabor } from "../../constants/catalogoSabores";
import { COLORS } from "../../theme/colors";

interface SelectorSaborProps<T extends string> {
    etiqueta: string;
    sabores: Sabor<T>[];
    seleccionado: T | null;
    onSeleccionar: (id: T) => void;
    error?: string;
}

// sabores con imagen; el elegido se resalta con borde y fondo (F01, regla de negocio)
export default function SelectorSabor<T extends string>({etiqueta, sabores, seleccionado, onSeleccionar, error}: SelectorSaborProps<T>) {
    return (
        <View style={styles.bloque}>
            <Text style={styles.etiqueta}>{etiqueta}</Text>
            <View
                style={[styles.rejilla, !!error && styles.rejillaConError]}
                accessibilityRole="radiogroup"
                accessibilityLabel={etiqueta}
            >
                {sabores.map(({id, nombre, imagen}) => {
                    const elegido = id === seleccionado;
                    return (
                        <Pressable
                            key={id}
                            onPress={() => onSeleccionar(id)}
                            accessibilityRole="radio"
                            accessibilityLabel={nombre}
                            accessibilityState={{selected: elegido}}
                            style={[styles.sabor, elegido && styles.saborElegido]}
                        >
                            <Image source={imagen} style={styles.imagen} resizeMode="contain" />
                            <Text style={[styles.nombre, elegido && styles.nombreElegido]} numberOfLines={2}>{nombre}</Text>
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
    rejilla: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    rejillaConError: {
        borderColor: COLORS.ERROR,
    },
    sabor: {
        width: '31%',
        alignItems: 'center',
        padding: 6,
        margin: '1%',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    saborElegido: {
        borderColor: COLORS.ACENTO,
        backgroundColor: COLORS.BOTON_SECUNDARIO,
    },
    imagen: {
        width: 64,
        height: 56,
    },
    nombre: {
        marginTop: 4,
        fontSize: 11,
        textAlign: 'center',
        textTransform: 'uppercase',
        color: COLORS.TEXTO_SUAVE,
    },
    nombreElegido: {
        color: COLORS.TITULO,
        fontWeight: '700',
    },
    error: {
        marginTop: 6,
        fontSize: 13,
        color: COLORS.ERROR,
    },
});
