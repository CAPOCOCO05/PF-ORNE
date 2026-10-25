import { useCallback, useEffect, useState } from "react";
import { cambiarEstado, obtenerPedidoAdmin, ResultadoCambio } from "../services/adminService";
import { AccionEstado } from "../constants/estadosPedido";
import { PedidoAdmin } from "../types/pedido.types";

export const MENSAJE_PEDIDO_ADMIN_NO_ENCONTRADO = 'No encontramos este pedido';

// detalle del admin y cambio de estado (F04 D5, D6)
export function usePedidoAdmin(id: string | undefined) {
    const [pedido, setPedido] = useState<PedidoAdmin | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actualizando, setActualizando] = useState(false);

    const cargar = useCallback(async () => {
        if (!id) {
            setCargando(false);
            setError(MENSAJE_PEDIDO_ADMIN_NO_ENCONTRADO);
            return;
        }
        setCargando(true);
        setError(null);
        const resultado = await obtenerPedidoAdmin(id);
        setCargando(false);
        if (resultado.error || !resultado.pedido) {
            setError(resultado.error ?? MENSAJE_PEDIDO_ADMIN_NO_ENCONTRADO);
            return;
        }
        setPedido(resultado.pedido);
    }, [id]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    // si sale bien o el pedido cambio en otro lado, se recarga; si falla, el estado mostrado no cambia
    const aplicar = useCallback(async (accion: AccionEstado, repartidorId?: string): Promise<{resultado: ResultadoCambio; error: string | null}> => {
        if (!pedido) return {resultado: 'error', error: MENSAJE_PEDIDO_ADMIN_NO_ENCONTRADO};
        setActualizando(true);
        const cambio = await cambiarEstado({id: pedido.id, estadoActual: pedido.estado, destino: accion.destino, repartidorId});
        setActualizando(false);
        if (cambio.resultado !== 'error') await cargar();
        return cambio;
    }, [pedido, cargar]);

    return {pedido, cargando, error, actualizando, reintentar: cargar, aplicar};
}
