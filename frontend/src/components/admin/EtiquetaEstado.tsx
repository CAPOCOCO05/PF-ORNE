import { StyleSheet, Text, View } from "react-native";
import { COLOR_ESTADO, ETIQUETA_ESTADO } from "../../constants/estadosPedido";
import { EstadoPedido } from "../../types/pedido.types";

// estado del pedido con un color distinto por estado (F04 D2)
export default function EtiquetaEstado({estado}: {estado: EstadoPedido}) {
    const color = COLOR_ESTADO[estado];
    return (
        <View style={[styles.etiqueta, {backgroundColor: color.fondo}]}>
            <Text style={[styles.texto, {color: color.texto}]}>{ETIQUETA_ESTADO[estado]}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    etiqueta: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 10,
    },
    texto: {
        fontSize: 12,
        fontWeight: '600',
    },
});
