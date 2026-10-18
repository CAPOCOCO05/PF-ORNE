import { Stack } from "expo-router";
import { PedidoProvider } from "../../../../src/context/PedidoContext";

// wizard del pedido: el estado vive en PedidoContext para no perderlo al ir y venir entre pasos
export default function PedidoNuevoLayout() {
    return (
        <PedidoProvider>
            <Stack screenOptions={{ headerShown: false }} />
        </PedidoProvider>
    );
}
