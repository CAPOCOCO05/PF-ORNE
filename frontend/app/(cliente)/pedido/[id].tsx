import { useLocalSearchParams, useRouter } from "expo-router";
import Boton from "../../../src/components/Boton";
import Comprobante from "../../../src/components/pedido/Comprobante";

// detalle de un pedido ya confirmado, solo consulta (F03 D4)
export default function DetallePedido() {
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
