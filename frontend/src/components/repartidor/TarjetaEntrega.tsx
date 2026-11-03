import { Pressable, StyleSheet, Text } from "react-native";
import { textoBloque } from "../../constants/horarios";
import { COLORS } from "../../theme/colors";
import { EntregaResumen } from "../../types/pedido.types";
import { formatearFechaEntrega } from "../../utils/fechas";

interface TarjetaEntregaProps {
    entrega: EntregaResumen;
    onVer: (entrega: EntregaResumen) => void;
}

// renglon de "Mis entregas": folio, cliente, horario y direccion resumida (F06)
export default function TarjetaEntrega({entrega, onVer}: TarjetaEntregaProps) {
    const fecha = entrega.fechaEntrega ? formatearFechaEntrega(entrega.fechaEntrega) : 'Sin fecha';
    const hora = textoBloque(entrega.horaEntrega);

    return (
        <Pressable
            onPress={() => onVer(entrega)}
            accessibilityRole="button"
            accessibilityLabel={`Ver entrega ${entrega.folio ?? ''}`}
            style={({pressed}) => [styles.tarjeta, pressed && styles.presionada]}
        >
            <Text style={styles.titulo}>{entrega.folio ?? 'Sin folio'}</Text>
            <Text style={styles.cliente}>{entrega.cliente}</Text>
            <Text style={styles.detalle}>{hora ? `${fecha} · ${hora}` : fecha}</Text>
            <Text style={styles.detalle} numberOfLines={1}>{entrega.direccion || 'Sin dirección'}</Text>
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
    titulo: {
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
});
