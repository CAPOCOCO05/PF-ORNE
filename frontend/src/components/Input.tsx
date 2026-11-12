import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { COLORS } from "../theme/colors";

interface InputProps extends TextInputProps {
    etiqueta: string;
    error?: string | null; // se muestra en rojo bajo el campo (F05)
    contador?: {actual: number; maximo: number}; // ej. mensaje de decoracion 123/500 (F01)
    ayuda?: string; // texto gris bajo el campo; el error lo reemplaza (F07 M6)
}

export default function Input({etiqueta, error, contador, ayuda, style, ...textInputProps}: InputProps) {
    return (
        <View style={styles.contenedor}>
            <Text style={styles.etiqueta}>{etiqueta}</Text>
            <TextInput
                placeholderTextColor={COLORS.TEXTO_SUAVE}
                accessibilityLabel={etiqueta}
                {...textInputProps}
                style={[styles.input, error ? styles.inputError : null, style]}
            />
            <View style={styles.pie}>
                {error
                    ? <Text style={styles.error}>{error}</Text>
                    : ayuda ? <Text style={styles.ayuda}>{ayuda}</Text> : <View />}
                {contador && (
                    <Text style={styles.contador}>{contador.actual}/{contador.maximo}</Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    contenedor: {
        width: '100%',
        marginBottom: 8,
    },
    etiqueta: {
        color: COLORS.TITULO,
        fontSize: 15,
        textTransform: 'uppercase',
        marginBottom: 4,
        marginLeft: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.TITULO,
        borderRadius: 12,
        backgroundColor: COLORS.BLANCO,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: COLORS.TEXTO,
    },
    inputError: {
        borderColor: COLORS.ERROR,
    },
    pie: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        minHeight: 18,
        marginTop: 2,
        marginHorizontal: 4,
    },
    error: {
        color: COLORS.ERROR,
        fontSize: 12,
        flexShrink: 1,
    },
    ayuda: {
        color: COLORS.TEXTO_SUAVE,
        fontSize: 12,
        flexShrink: 1,
    },
    contador: {
        color: COLORS.TEXTO_SUAVE,
        fontSize: 12,
    },
});
