import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { usePedido } from "../context/PedidoContext";
import { PasoPedido } from "../types/pedido.types";
import { validarPaso } from "../utils/pedido";

// logica comun de los pasos del wizard: validar, guardar con "Siguiente" y salir (F01, D2-D4)

export const RUTA_PASO: Record<PasoPedido, string> = {
    1: '/pedido/nuevo',
    2: '/pedido/nuevo/sabor',
    3: '/pedido/nuevo/decoracion',
    4: '/pedido/nuevo/entrega',
    5: '/pedido/nuevo/pago',
};

// paso en el que se retomara el borrador despues de completar cada paso
const PASO_AL_COMPLETAR: Record<PasoPedido, PasoPedido> = {1: 2, 2: 3, 3: 4, 4: 5, 5: 5};

export function usePasoPedido(paso: PasoPedido) {
    const router = useRouter();
    const {pedido, guardar} = usePedido();
    const [intentoAvanzar, setIntentoAvanzar] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const faltantes = validarPaso(paso, pedido);
    // los campos faltantes se marcan en rojo solo despues de presionar "Siguiente" (D4)
    const errores = intentoAvanzar ? faltantes : {};

    // el paso 4 valida con sus propias reglas (utils/entrega.ts) y pasa sus errores en `otrosErrores`
    const siguiente = useCallback(async (alGuardar: () => void, otrosErrores: object = {}) => {
        setIntentoAvanzar(true);
        if (Object.keys(faltantes).length > 0 || Object.keys(otrosErrores).length > 0) return;

        const intentar = async () => {
            setGuardando(true);
            const error = await guardar({pasoActual: PASO_AL_COMPLETAR[paso], sincronizarImagen: paso === 3, guardarEntrega: paso === 4});
            setGuardando(false);
            if (!error) {
                alGuardar();
                return;
            }
            // D3: el usuario decide; no se le bloquea
            Alert.alert('No se pudo guardar', error, [
                {text: 'Cancelar', style: 'cancel'},
                {text: 'Reintentar', onPress: intentar},
            ]);
        };
        await intentar();
    }, [faltantes, guardar, paso]);

    // salir del wizard (boton "Salir" o atras de Android en el paso 1, D3)
    const salir = useCallback(() => {
        if (!pedido.id) {
            Alert.alert('¿Salir del pedido?', 'Se perderá lo que capturaste.', [
                {text: 'Cancelar', style: 'cancel'},
                {text: 'Salir', style: 'destructive', onPress: () => router.navigate('/home')},
            ]);
            return;
        }

        const guardarYSalir = async () => {
            // se conserva el paso mas avanzado al que llego
            const error = await guardar({pasoActual: pedido.pasoActual});
            if (!error) {
                router.navigate('/pedidos');
                return;
            }
            Alert.alert('No se pudo guardar', error, [
                {text: 'Salir sin guardar', style: 'destructive', onPress: () => router.navigate('/pedidos')},
                {text: 'Reintentar', onPress: guardarYSalir},
            ]);
        };
        Alert.alert('¿Salir del pedido?', 'Tu pedido se guardará en "Mis pedidos" para que lo termines después.', [
            {text: 'Cancelar', style: 'cancel'},
            {text: 'Salir', onPress: guardarYSalir},
        ]);
    }, [pedido.id, pedido.pasoActual, guardar, router]);

    return {errores, intentoAvanzar, guardando, siguiente, salir};
}
