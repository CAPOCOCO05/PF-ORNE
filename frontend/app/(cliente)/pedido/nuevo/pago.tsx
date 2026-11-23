import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import PantallaPaso from "../../../../src/components/pedido/PantallaPaso";
import ResumenPedido from "../../../../src/components/pedido/ResumenPedido";
import { METODO_PAGO } from "../../../../src/constants/pago";
import { useDialogo } from "../../../../src/context/DialogoContext";
import { usePedido } from "../../../../src/context/PedidoContext";
import { RUTA_PASO } from "../../../../src/hooks/usePasoPedido";
import { CodigoConfirmacion, confirmarPedido } from "../../../../src/services/pedidosService";
import { COLORS } from "../../../../src/theme/colors";
import { PasoPedido, PedidoEnCurso } from "../../../../src/types/pedido.types";
import { validarPaso } from "../../../../src/utils/pedido";

// primer paso con datos faltantes, para "Faltan datos de tu pedido" (F03 D5)
function primerPasoIncompleto(pedido: PedidoEnCurso): PasoPedido {
    if (Object.keys(validarPaso(1, pedido)).length > 0) return 1;
    if (Object.keys(validarPaso(2, pedido)).length > 0) return 2;
    return 4;
}

// F03 paso 5: resumen completo, metodo de pago y "Confirmar pedido"
export default function PasoPago() {
    const router = useRouter();
    const {pedido} = usePedido();
    const [confirmando, setConfirmando] = useState(false);
    const dialogo = useDialogo();

    // a donde lleva cada error de confirmar_pedido (D5); CONEXION se reintenta aparte.
    // dismissTo regresa a un paso que ya esta en la pila en lugar de abrir otro encima
    const destinoError = (codigo: CodigoConfirmacion): (() => void) | null => {
        switch (codigo) {
            case 'FECHA_NO_DISPONIBLE':
            case 'FUERA_DE_ZONA': return () => router.dismissTo(RUTA_PASO[4]);
            case 'PEDIDO_INCOMPLETO': return () => router.dismissTo(RUTA_PASO[primerPasoIncompleto(pedido)]);
            case 'PEDIDO_YA_CONFIRMADO': return () => router.replace(`/pedido/${pedido.id}`);
            case 'PEDIDO_NO_ENCONTRADO': return () => router.navigate('/pedidos');
            default: return null;
        }
    };

    const confirmar = async () => {
        if (!pedido.id) return;
        setConfirmando(true);
        const {error} = await confirmarPedido(pedido.id);
        setConfirmando(false);
        if (!error) {
            // reemplaza el paso 5: "Atrás" ya no regresa al pago (D4)
            router.replace({pathname: '/pedido/nuevo/confirmacion', params: {id: pedido.id}});
            return;
        }
        const ir = destinoError(error.codigo);
        if (ir) {
            await dialogo.avisar({tipo: 'error', titulo: 'No se pudo confirmar', mensaje: error.mensaje});
            ir();
            return;
        }
        // sin conexion o error inesperado: el borrador sigue intacto y se puede reintentar
        const reintentar = await dialogo.confirmar({tipo: 'error', titulo: 'No se pudo confirmar', mensaje: error.mensaje, textoConfirmar: 'Reintentar'});
        if (reintentar) await confirmar();
    };

    return (
        <PantallaPaso
            paso={5}
            textoAtras="Atrás"
            onAtras={() => router.back()}
            textoSiguiente="Confirmar pedido"
            onSiguiente={confirmar}
            guardando={confirmando}
        >
            <ResumenPedido pedido={pedido} onEditar={(paso) => router.dismissTo(RUTA_PASO[paso])} />

            <View style={styles.pago}>
                <Text style={styles.etiqueta}>Método de pago</Text>
                <View style={styles.metodo} accessibilityRole="radio" accessibilityState={{selected: true}}>
                    <View style={styles.radio}><View style={styles.radioPunto} /></View>
                    <Text style={styles.textoMetodo}>{METODO_PAGO}</Text>
                </View>
            </View>
        </PantallaPaso>
    );
}

const styles = StyleSheet.create({
    pago: {
        marginTop: 8,
        marginBottom: 8,
    },
    etiqueta: {
        fontSize: 15,
        color: COLORS.TEXTO,
        marginBottom: 8,
    },
    metodo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.ACENTO,
        backgroundColor: COLORS.BOTON_SECUNDARIO,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLORS.ACENTO,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioPunto: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.BOTON_PRINCIPAL,
    },
    textoMetodo: {
        flexShrink: 1,
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.TITULO,
    },
});
