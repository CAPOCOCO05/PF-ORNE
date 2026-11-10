import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { ETIQUETA_ESTADO } from "../../constants/estadosPedido";
import { DATOS_BANCARIOS, METODO_PAGO } from "../../constants/pago";
import { esPrecioEstimado, formatearPrecio } from "../../constants/precios";
import { usePedidoDetalle } from "../../hooks/usePedidoDetalle";
import { COLORS } from "../../theme/colors";
import { PedidoCompleto } from "../../types/pedido.types";
import { formatearFecha } from "../../utils/fechas";
import Boton from "../Boton";
import ResumenPedido from "./ResumenPedido";

interface ComprobanteProps {
    id: string | undefined;
    titulo: string;
    acciones: React.ReactNode;   // botones al final (cambian entre confirmacion y detalle)
}

// comprobante digital: folio, resumen, total y datos bancarios del pago simulado (F03 D3, D4)
export default function Comprobante({id, titulo, acciones}: ComprobanteProps) {
    const {pedido, cargando, error, reintentar} = usePedidoDetalle(id);

    let contenido: React.ReactNode;
    if (cargando) {
        contenido = <ActivityIndicator testID="comprobante-cargando" color={COLORS.BOTON_PRINCIPAL} style={styles.estado} />;
    } else if (error || !pedido) {
        contenido = (
            <View style={styles.estado}>
                <Text style={styles.error}>{error}</Text>
                <Boton titulo="Reintentar" variante="secundario" onPress={reintentar} style={styles.boton} />
            </View>
        );
    } else {
        contenido = <Detalle pedido={pedido} />;
    }

    return (
        <ScrollView style={styles.fondo} contentContainerStyle={styles.contenido}>
            <Text style={styles.titulo}>{titulo}</Text>
            {contenido}
            <View style={styles.acciones}>{acciones}</View>
        </ScrollView>
    );
}

function Detalle({pedido}: {pedido: PedidoCompleto}) {
    return (
        <>
            <View style={styles.folio}>
                <Text style={styles.etiquetaFolio}>Folio de seguimiento</Text>
                <Text style={styles.textoFolio} selectable>{pedido.folio ?? 'Sin confirmar'}</Text>
                <Text style={styles.estadoPedido}>
                    {ETIQUETA_ESTADO[pedido.estado]} · {formatearFecha(pedido.creadoEn)}
                </Text>
            </View>

            {pedido.estado === 'no_entregado' ? <AvisoNoEntregado motivo={pedido.motivoNoEntrega} /> : null}

            <ResumenPedido pedido={pedido} />

            <View style={styles.total}>
                <Text style={styles.textoTotal}>Total: {formatearPrecio(pedido.total)}</Text>
                {esPrecioEstimado(pedido.niveles) ? (
                    <Text style={styles.leyenda}>Precio estimado, sujeto a confirmación de la pastelería</Text>
                ) : null}
            </View>

            {pedido.folio ? <DatosPago folio={pedido.folio} /> : null}
        </>
    );
}

// F07 M2: el repartidor no pudo entregar; la pastelería decide si se reprograma
function AvisoNoEntregado({motivo}: {motivo: string | null}) {
    return (
        <View testID="aviso-no-entregado" style={styles.noEntregado}>
            <Text style={styles.tituloNoEntregado}>No pudimos entregar tu pedido</Text>
            {motivo ? <Text style={styles.textoNoEntregado}>Motivo: {motivo}</Text> : null}
            <Text style={styles.textoNoEntregado}>La pastelería se pondrá en contacto contigo para reprogramar la entrega.</Text>
        </View>
    );
}

function DatosPago({folio}: {folio: string}) {
    return (
        <View style={styles.pago}>
            <Text style={styles.tituloPago}>Pago: {METODO_PAGO}</Text>
            <Text style={styles.textoPago}>Banco: {DATOS_BANCARIOS.banco}</Text>
            <Text style={styles.textoPago}>Titular: {DATOS_BANCARIOS.titular}</Text>
            <Text style={styles.textoPago}>CLABE: {DATOS_BANCARIOS.clabe}</Text>
            <Text style={styles.textoPago}>Referencia: {folio}</Text>
            <Text style={styles.leyendaPago}>{DATOS_BANCARIOS.leyenda}</Text>
        </View>
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
        marginBottom: 20,
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
    folio: {
        alignItems: 'center',
        padding: 20,
        marginBottom: 16,
        borderRadius: 16,
        backgroundColor: COLORS.BOTON_SECUNDARIO,
    },
    etiquetaFolio: {
        fontSize: 13,
        color: COLORS.TITULO,
    },
    textoFolio: {
        fontSize: 30,
        fontWeight: '700',
        letterSpacing: 2,
        color: COLORS.LOGO,
        marginVertical: 4,
    },
    estadoPedido: {
        fontSize: 13,
        color: COLORS.TEXTO_SUAVE,
    },
    noEntregado: {
        padding: 16,
        marginBottom: 16,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.BOTON_PRINCIPAL,
        backgroundColor: COLORS.FONDO,
        gap: 4,
    },
    tituloNoEntregado: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.TITULO,
    },
    textoNoEntregado: {
        fontSize: 14,
        color: COLORS.TEXTO,
    },
    total: {
        marginTop: 4,
        marginBottom: 16,
    },
    textoTotal: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.TITULO,
    },
    leyenda: {
        marginTop: 4,
        fontSize: 12,
        color: COLORS.TEXTO_SUAVE,
    },
    pago: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: COLORS.BOTON_SECUNDARIO,
    },
    tituloPago: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.TITULO,
        marginBottom: 6,
    },
    textoPago: {
        fontSize: 14,
        color: COLORS.TEXTO,
        marginTop: 2,
    },
    leyendaPago: {
        marginTop: 8,
        fontSize: 12,
        fontStyle: 'italic',
        color: COLORS.TEXTO_SUAVE,
    },
    acciones: {
        marginTop: 24,
        gap: 12,
    },
});
