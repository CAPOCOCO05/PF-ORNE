import { Pressable, StyleSheet, Text, View } from "react-native";
import { textoBloque } from "../../constants/horarios";
import { formatearPrecio } from "../../constants/precios";
import { COLORS } from "../../theme/colors";
import { PedidoAdminResumen } from "../../types/pedido.types";
import { formatearFechaEntrega } from "../../utils/fechas";
import EtiquetaEstado from "./EtiquetaEstado";

interface TarjetaPedidoAdminProps {
    pedido: PedidoAdminResumen;
    onVer: (pedido: PedidoAdminResumen) => void;
}

const TEXTO_TIPO = {domicilio: 'A domicilio', recoleccion: 'Recolección en sucursal'} as const;

// renglon de la lista del admin: folio, cliente, entrega, total y estado (F04)
export default function TarjetaPedidoAdmin({pedido, onVer}: TarjetaPedidoAdminProps) {
    const fecha = pedido.fechaEntrega ? formatearFechaEntrega(pedido.fechaEntrega) : 'Sin fecha';
    const hora = textoBloque(pedido.horaEntrega);

    return (
        <Pressable
            onPress={() => onVer(pedido)}
            accessibilityRole="button"
            accessibilityLabel={`Ver pedido ${pedido.folio ?? ''}`}
            style={({pressed}) => [styles.tarjeta, pressed && styles.presionada]}
        >
            <View style={styles.encabezado}>
                <Text style={styles.titulo}>{pedido.folio ?? 'Sin folio'}</Text>
                <EtiquetaEstado estado={pedido.estado} />
            </View>
            <Text style={styles.cliente}>{pedido.cliente}</Text>
            <Text style={styles.detalle}>{hora ? `${fecha} · ${hora}` : fecha}</Text>
            <View style={styles.pie}>
                <Text style={styles.detalle}>{pedido.tipoEntrega ? TEXTO_TIPO[pedido.tipoEntrega] : '—'}</Text>
                <Text style={styles.total}>{formatearPrecio(pedido.total)}</Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    tarjeta: {
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        backgroundColor: COLORS.FONDO,
    },
    presionada: {
        opacity: 0.7,
    },
    encabezado: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    titulo: {
        flexShrink: 1,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
        color: COLORS.TITULO,
    },
    cliente: {
        marginTop: 6,
        fontSize: 15,
        color: COLORS.TEXTO,
    },
    detalle: {
        marginTop: 2,
        fontSize: 13,
        color: COLORS.TEXTO_SUAVE,
    },
    pie: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    total: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.TEXTO,
    },
});
