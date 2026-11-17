import { Stack } from "expo-router";
import RequiereCuenta from "../../../../src/components/RequiereCuenta";
import { PedidoProvider } from "../../../../src/context/PedidoContext";

// wizard del pedido: el estado vive en PedidoContext para no perderlo al ir y venir entre pasos
// F09: solo con cuenta (el catalogo envia al visitante al registro antes de llegar aqui)
export default function PedidoNuevoLayout() {
    return (
        <RequiereCuenta mensaje="Crea tu cuenta para hacer tu pedido.">
            <PedidoProvider>
                <Stack screenOptions={{ headerShown: false }}>
                    {/* el pedido ya se confirmo: sin gesto de regreso al wizard (F03 D4) */}
                    <Stack.Screen name="confirmacion" options={{ gestureEnabled: false }} />
                </Stack>
            </PedidoProvider>
        </RequiereCuenta>
    );
}
