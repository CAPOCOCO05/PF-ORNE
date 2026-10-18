import { StyleSheet, Text, View } from "react-native";
import { nombrePan, nombreRelleno } from "../constants/catalogoSabores";
import { ETIQUETA_ESTADO } from "../constants/estadosPedido";
import { formatearPrecio } from "../constants/precios";
import { COLORS } from "../theme/colors";
import { ResumenPedido } from "../types/pedido.types";
import { formatearFecha } from "../utils/fechas";
import Boton from "./Boton";

interface TarjetaPedidoProps {
    pedido: ResumenPedido;
    eliminando: boolean;
    onContinuar: (pedido: ResumenPedido) => void;
    onEliminar: (pedido: ResumenPedido) => void;
}

// renglon de "Mis pedidos"; los borradores se pueden continuar o eliminar (F01, D2)
export default function TarjetaPedido({pedido, eliminando, onContinuar, onEliminar}: TarjetaPedidoProps) {
    const esBorrador = pedido.estado === 'borrador';

    return (
        <View style={styles.tarjeta}>
            <View style={styles.encabezado}>
                <Text style={styles.titulo}>{pedido.folio ? `Pedido ${pedido.folio}` : 'Pedido sin confirmar'}</Text>
                <View style={[styles.estado, esBorrador && styles.estadoBorrador]}>
                    <Text style={styles.textoEstado}>{ETIQUETA_ESTADO[pedido.estado]}</Text>
                </View>
            </View>
            <Text style={styles.fecha}>{formatearFecha(pedido.creadoEn)}</Text>
            <Text style={styles.detalle}>{describirPastel(pedido)}</Text>
            <Text style={styles.total}>{formatearPrecio(pedido.total)}</Text>

            {esBorrador ? (
                <View style={styles.acciones}>
                    <Boton titulo="Eliminar" variante="secundario" onPress={() => onEliminar(pedido)} cargando={eliminando} style={styles.boton} />
                    <Boton titulo="Continuar pedido" onPress={() => onContinuar(pedido)} deshabilitado={eliminando} style={styles.boton} />
                </View>
            ) : null}
        </View>
    );
}

// "15 personas · 2 niveles · Fresa con Chocolate" (omite lo que aun no se elige)
function describirPastel({tamanio, niveles, tipoPan, relleno}: ResumenPedido): string {
    const partes: string[] = [];
    if (tamanio) partes.push(`${tamanio} personas`);
    if (niveles) partes.push(niveles === 1 ? '1 nivel' : `${niveles} niveles`);
    if (tipoPan && relleno) partes.push(`${nombrePan(tipoPan)} con ${nombreRelleno(relleno)}`);
    else if (tipoPan) partes.push(nombrePan(tipoPan));
    return partes.join(' · ');
}

const styles = StyleSheet.create({
    tarjeta: {
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        backgroundColor: COLORS.FONDO,
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
        color: COLORS.TITULO,
    },
    estado: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 10,
        backgroundColor: COLORS.BLANCO,
    },
    estadoBorrador: {
        backgroundColor: COLORS.BOTON_SECUNDARIO,
    },
    textoEstado: {
        fontSize: 12,
        color: COLORS.TITULO,
    },
    fecha: {
        marginTop: 2,
        fontSize: 12,
        color: COLORS.TEXTO_SUAVE,
    },
    detalle: {
        marginTop: 8,
        fontSize: 14,
        color: COLORS.TEXTO,
    },
    total: {
        marginTop: 4,
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.TEXTO,
    },
    acciones: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    boton: {
        flex: 1,
        minHeight: 40,
    },
});
