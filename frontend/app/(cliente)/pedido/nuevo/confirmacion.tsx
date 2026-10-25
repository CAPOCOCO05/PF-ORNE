import { useCallback } from "react";
import { BackHandler } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import Boton from "../../../../src/components/Boton";
import Comprobante from "../../../../src/components/pedido/Comprobante";

// F03 paso 6: comprobante con el folio recien generado. El pedido ya no es borrador,
// asi que "Atrás" (incluido el de Android) no regresa al wizard: lleva a "Mis pedidos" (D4)
export default function Confirmacion() {
    const router = useRouter();
    const {id} = useLocalSearchParams<{id?: string}>();

    useFocusEffect(useCallback(() => {
        const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
            router.navigate('/pedidos');
            return true;
        });
        return () => suscripcion.remove();
    }, [router]));

    return (
        <Comprobante
            id={id}
            titulo="¡Pedido confirmado!"
            acciones={
                <>
                    <Boton titulo="Ver mis pedidos" onPress={() => router.navigate('/pedidos')} />
                    <Boton titulo="Volver al catálogo" variante="secundario" onPress={() => router.navigate('/home')} />
                </>
            }
        />
    );
}
