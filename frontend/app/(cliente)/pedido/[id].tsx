import { useLocalSearchParams, useRouter } from "expo-router";
import Boton from "../../../src/components/Boton";
import Comprobante from "../../../src/components/pedido/Comprobante";
import RequiereCuenta from "../../../src/components/RequiereCuenta";

// detalle de un pedido ya confirmado, solo consulta (F03 D4)
// F09: sin sesion se invita a crear cuenta en lugar de consultar datos
export default function DetallePedidoProtegida() {
    return (
        <RequiereCuenta mensaje="Inicia sesión para ver el detalle de tu pedido.">
            <DetallePedido />
        </RequiereCuenta>
    );
}

function DetallePedido() {
    const router = useRouter();
    const {id} = useLocalSearchParams<{id?: string}>();

    return (
        <Comprobante
            id={id}
            titulo="Mi pedido"
            acciones={<Boton titulo="Ver mis pedidos" variante="secundario" onPress={() => router.navigate('/pedidos')} />}
        />
    );
}
