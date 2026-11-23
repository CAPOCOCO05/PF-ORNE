import { StyleSheet, Text, View } from "react-native";
import { calcularPrecio, esPrecioEstimado, formatearPrecio } from "../../constants/precios";
import { COLORS } from "../../theme/colors";
import { PedidoEnCurso } from "../../types/pedido.types";

// precio en tiempo real (D7): "desde" mientras no hay relleno; leyenda de estimado con 3+ niveles (D5)
export default function PrecioPedido({pedido}: {pedido: PedidoEnCurso}) {
    const precio = calcularPrecio(pedido);

    return (
        <View style={styles.bloque}>
            <View style={styles.fila}>
                <Text style={styles.etiqueta}>Precio:</Text>
                <View style={styles.pastilla}>
                    <Text style={styles.monto} testID="precio-pedido">
                        {precio === null ? '—' : `${pedido.relleno ? '' : 'desde '}${formatearPrecio(precio)}`}
                    </Text>
                </View>
            </View>
            {esPrecioEstimado(pedido.niveles) ? (
                <Text style={styles.leyenda}>Precio estimado, sujeto a confirmación de la pastelería</Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    bloque: {
        marginTop: 8,
        marginBottom: 20,
    },
    fila: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    etiqueta: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.TEXTO,
        marginRight: 12,
    },
    pastilla: {
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: COLORS.PRECIO,
    },
    monto: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.TITULO,
    },
    leyenda: {
        marginTop: 6,
        fontSize: 12,
        color: COLORS.TEXTO_SUAVE,
    },
});
