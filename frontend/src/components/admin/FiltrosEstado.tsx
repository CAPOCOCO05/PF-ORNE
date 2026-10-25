import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { FiltroAdmin, FILTROS_ADMIN } from "../../constants/estadosPedido";
import { COLORS } from "../../theme/colors";

interface FiltrosEstadoProps {
    seleccionado: FiltroAdmin;
    onSeleccionar: (filtro: FiltroAdmin) => void;
}

// chips de estado arriba de la lista del admin, con scroll horizontal (F04 D3)
export default function FiltrosEstado({seleccionado, onSeleccionar}: FiltrosEstadoProps) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.fila}
            accessibilityRole="radiogroup"
            accessibilityLabel="Filtrar por estado"
        >
            {FILTROS_ADMIN.map(({valor, texto}) => {
                const elegido = valor === seleccionado;
                return (
                    <Pressable
                        key={valor}
                        onPress={() => onSeleccionar(valor)}
                        accessibilityRole="radio"
                        accessibilityState={{selected: elegido}}
                        style={[styles.chip, elegido && styles.chipElegido]}
                    >
                        <Text style={[styles.texto, elegido && styles.textoElegido]}>{texto}</Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    fila: {
        gap: 8,
        paddingBottom: 16,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: COLORS.FONDO,
        backgroundColor: COLORS.FONDO,
    },
    chipElegido: {
        borderColor: COLORS.BOTON_PRINCIPAL,
        backgroundColor: COLORS.BOTON_SECUNDARIO,
    },
    texto: {
        fontSize: 14,
        color: COLORS.TEXTO,
    },
    textoElegido: {
        color: COLORS.TITULO,
        fontWeight: '700',
    },
});
