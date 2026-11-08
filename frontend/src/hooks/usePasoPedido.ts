import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { useDialogo } from "../context/DialogoContext";
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
    const {confirmar, mostrar} = useDialogo();
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
            const reintentar = await confirmar({tipo: 'error', titulo: 'No se pudo guardar', mensaje: error, textoConfirmar: 'Reintentar'});
            if (reintentar) await intentar();
        };
        await intentar();
    }, [faltantes, guardar, paso, confirmar]);

    // salir del wizard (boton "Salir" o atras de Android en el paso 1, D3)
    const salir = useCallback(async () => {
        if (!pedido.id) {
            const salirSinGuardar = await confirmar({
                titulo: '¿Salir del pedido?', mensaje: 'Se perderá lo que capturaste.', textoConfirmar: 'Sí, salir', destructiva: true,
            });
            if (salirSinGuardar) router.navigate('/home');
            return;
        }

        const guardarYSalir = async () => {
            // se conserva el paso mas avanzado al que llego
            const error = await guardar({pasoActual: pedido.pasoActual});
            if (!error) {
                router.navigate('/pedidos');
                return;
            }
            // cerrar el dialogo (atras / tocar fuera) deja al usuario en el paso, sin salir
            const respuesta = await mostrar({
                tipo: 'error', titulo: 'No se pudo guardar', mensaje: error, textoConfirmar: 'Reintentar', textoCancelar: 'Salir sin guardar',
            });
            if (respuesta === 'confirmar') await guardarYSalir();
            if (respuesta === 'cancelar') router.navigate('/pedidos');
        };
        const salirGuardando = await confirmar({
            titulo: '¿Salir del pedido?', mensaje: 'Tu pedido se guardará en "Mis pedidos" para que lo termines después.', textoConfirmar: 'Guardar y salir',
        });
        if (salirGuardando) await guardarYSalir();
    }, [pedido.id, pedido.pasoActual, guardar, router, confirmar, mostrar]);

    return {errores, intentoAvanzar, guardando, siguiente, salir};
}
