import { Pressable, StyleSheet, Text, View } from "react-native";
import { FiltrosCatalogo } from "../../types/pedido.types";
import { filtrosAplicados, limpiarFiltros, quitarFiltro } from "../../utils/filtrosCatalogo";
import { COLORS } from "../../theme/colors";

interface FiltrosAplicadosProps {
    filtros: FiltrosCatalogo;
    onCambiar: (filtros: FiltrosCatalogo) => void;
}

// chips de los filtros aplicados con "×" para quitarlos uno por uno, y "Quitar todos" (F07 M5)
export default function FiltrosAplicados({filtros, onCambiar}: FiltrosAplicadosProps) {
    const chips = filtrosAplicados(filtros);
    if (chips.length === 0) return null;

    return (
        <View style={styles.fila}>
            {chips.map((chip) => (
                <Pressable
                    key={chip.clave}
                    onPress={() => onCambiar(quitarFiltro(filtros, chip))}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar filtro ${chip.texto}`}
                    hitSlop={4}
                    style={styles.chip}
                >
                    <Text style={styles.texto}>{chip.texto}</Text>
                    <Text style={styles.quitar}>×</Text>
                </Pressable>
            ))}
            {chips.length > 1 && (
                <Pressable onPress={() => onCambiar(limpiarFiltros(filtros))} accessibilityRole="button" hitSlop={8}>
                    <Text style={styles.quitarTodos}>Quitar todos</Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    fila: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 10,
        paddingRight: 8,
        paddingVertical: 4,
        borderRadius: 14,
        backgroundColor: COLORS.BOTON_SECUNDARIO,
    },
    texto: {
        fontSize: 12,
        color: COLORS.TITULO,
    },
    quitar: {
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.TITULO,
    },
    quitarTodos: {
        fontSize: 12,
        color: COLORS.ACENTO,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});
