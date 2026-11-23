import { Pressable, StyleSheet, Text } from "react-native";
import { COLORS } from "../../theme/colors";

interface ChipFiltroProps {
    texto: string;
    marcado: boolean;
    onPress: () => void;
    etiquetaAccesible?: string;
}

// chip compacto de los desplegables del catalogo (F07 M5); mismo estilo que los del admin (M3)
export default function ChipFiltro({texto, marcado, onPress, etiquetaAccesible}: ChipFiltroProps) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="checkbox"
            accessibilityLabel={etiquetaAccesible ?? texto}
            accessibilityState={{checked: marcado}}
            style={[styles.chip, marcado && styles.chipMarcado]}
        >
            <Text style={[styles.texto, marcado && styles.textoMarcado]}>{texto}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: COLORS.FONDO,
        backgroundColor: COLORS.FONDO,
    },
    chipMarcado: {
        borderColor: COLORS.ACENTO,
        backgroundColor: COLORS.BOTON_SECUNDARIO,
    },
    texto: {
        fontSize: 13,
        color: COLORS.TEXTO,
    },
    textoMarcado: {
        color: COLORS.TITULO,
        fontWeight: '700',
    },
});
