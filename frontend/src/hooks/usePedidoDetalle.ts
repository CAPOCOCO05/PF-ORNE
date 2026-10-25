import { useCallback, useEffect, useState } from "react";
import { obtenerPedido } from "../services/pedidosService";
import { PedidoCompleto } from "../types/pedido.types";

export const MENSAJE_PEDIDO_NO_ENCONTRADO = 'No encontramos este pedido';

// carga un pedido para el comprobante (confirmacion y detalle, F03 D4)
export function usePedidoDetalle(id: string | undefined) {
    const [pedido, setPedido] = useState<PedidoCompleto | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [intento, setIntento] = useState(0);

    useEffect(() => {
        if (!id) {
            setCargando(false);
            setError(MENSAJE_PEDIDO_NO_ENCONTRADO);
            return;
        }
        let cancelado = false;
        setCargando(true);
        setError(null);
        obtenerPedido(id).then((resultado) => {
            if (cancelado) return;
            setCargando(false);
            setPedido(resultado.pedido);
            if (resultado.error || !resultado.pedido) setError(resultado.error ?? MENSAJE_PEDIDO_NO_ENCONTRADO);
        });
        return () => { cancelado = true; };
    }, [id, intento]);

    const reintentar = useCallback(() => setIntento((n) => n + 1), []);

    return {pedido, cargando, error, reintentar};
}
