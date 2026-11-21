import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Boton from "../../../src/components/Boton";
import AccionesPedido from "../../../src/components/admin/AccionesPedido";
import EtiquetaEstado from "../../../src/components/admin/EtiquetaEstado";
import ResumenPedido from "../../../src/components/pedido/ResumenPedido";
import { METODO_PAGO } from "../../../src/constants/pago";
import { esPrecioEstimado, formatearPrecio } from "../../../src/constants/precios";
import { usePedidoAdmin } from "../../../src/hooks/usePedidoAdmin";
import { COLORS } from "../../../src/theme/colors";
import { PagoPedido, PedidoAdmin } from "../../../src/types/pedido.types";
import { formatearFecha } from "../../../src/utils/fechas";

const ETIQUETA_PAGO: Record<PagoPedido['estado'], string> = {
    pendiente: 'Pendiente',
    confirmado: 'Confirmado',
};

// F04: detalle completo del pedido y cambio de estado (D5, D6, D7)
export default function AdminDetallePedido() {
    const router = useRouter();
    const {id} = useLocalSearchParams<{id?: string}>();
    const {pedido, cargando, error, actualizando, reintentar, aplicar} = usePedidoAdmin(id);

    let contenido: React.ReactNode;
    if (cargando && !pedido) {
        contenido = <ActivityIndicator testID="admin-detalle-cargando" color={COLORS.BOTON_PRINCIPAL} style={styles.estado} />;
    } else if (error || !pedido) {
        contenido = (
            <View style={styles.estado}>
                <Text style={styles.error}>{error}</Text>
                <Boton titulo="Reintentar" variante="secundario" onPress={reintentar} style={styles.boton} />
            </View>
        );
    } else {
        contenido = (
            <>
                <Detalle pedido={pedido} />
                {/* key: al cambiar de estado se reinicia el repartidor elegido */}
                <AccionesPedido key={pedido.estado} pedido={pedido} actualizando={actualizando || cargando} onAplicar={aplicar} />
            </>
        );
    }

    return (
        <ScrollView style={styles.fondo} contentContainerStyle={styles.contenido}>
            <Text style={styles.titulo}>{pedido?.folio ? `Pedido ${pedido.folio}` : 'Pedido'}</Text>
            {contenido}
            <Boton titulo="Volver a pedidos" variante="secundario" onPress={() => router.navigate('/admin')} style={styles.volver} />
        </ScrollView>
    );
}

function Detalle({pedido}: {pedido: PedidoAdmin}) {
    return (
        <>
            <View style={styles.cabecera}>
                <EtiquetaEstado estado={pedido.estado} />
                <Text style={styles.suave}>Creado el {formatearFecha(pedido.creadoEn)}</Text>
            </View>

            <Seccion titulo="Cliente">
                <Dato etiqueta="Nombre" valor={pedido.cliente} />
                <Dato etiqueta="Teléfono" valor={pedido.entrega.telefono || '—'} />
            </Seccion>

            <ResumenPedido pedido={pedido} imagenesSabor />

            {pedido.repartidor ? (
                <Seccion titulo="Reparto">
                    <Dato etiqueta="Repartidor" valor={pedido.repartidor} />
                </Seccion>
            ) : null}

            {/* F07 M2: se conserva el motivo del ultimo intento aunque ya se haya reprogramado */}
            {pedido.motivoNoEntrega ? (
                <Seccion titulo={pedido.estado === 'no_entregado' ? 'No se pudo entregar' : 'Intento de entrega anterior'}>
                    <Dato etiqueta="Motivo" valor={pedido.motivoNoEntrega} />
                </Seccion>
            ) : null}

            <Seccion titulo="Pago">
                <Dato etiqueta="Método" valor={pedido.pago ? METODO_PAGO : '—'} />
                <Dato etiqueta="Monto" valor={formatearPrecio(pedido.pago?.monto ?? pedido.total)} />
                <Dato etiqueta="Estado del pago" valor={pedido.pago ? ETIQUETA_PAGO[pedido.pago.estado] : 'Sin registro'} />
                {esPrecioEstimado(pedido.niveles) ? <Text style={styles.suave}>Precio estimado, sujeto a confirmación</Text> : null}
            </Seccion>
        </>
    );
}

function Seccion({titulo, children}: {titulo: string; children: React.ReactNode}) {
    return (
        <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>{titulo}</Text>
            {children}
        </View>
    );
}

function Dato({etiqueta, valor}: {etiqueta: string; valor: string}) {
    return (
        <Text style={styles.texto}>
            <Text style={styles.etiqueta}>{etiqueta}: </Text>{valor}
        </Text>
    );
}

const styles = StyleSheet.create({
    fondo: {
        backgroundColor: COLORS.BLANCO,
    },
    contenido: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 32,
    },
    titulo: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        textAlign: 'center',
        color: COLORS.TITULO,
        marginBottom: 16,
    },
    cabecera: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    estado: {
        marginTop: 32,
        alignItems: 'stretch',
    },
    error: {
        fontSize: 15,
        color: COLORS.ERROR,
        textAlign: 'center',
    },
    boton: {
        marginTop: 12,
    },
    seccion: {
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        backgroundColor: COLORS.FONDO,
    },
    tituloSeccion: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.TITULO,
        marginBottom: 6,
    },
    texto: {
        fontSize: 14,
        color: COLORS.TEXTO,
        marginTop: 2,
    },
    etiqueta: {
        fontWeight: '700',
    },
    suave: {
        fontSize: 13,
        color: COLORS.TEXTO_SUAVE,
        marginTop: 4,
    },
    volver: {
        marginTop: 12,
    },
});
