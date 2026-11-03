import { useCallback, useEffect, useState } from "react";
import { marcarEntregado, obtenerEntrega, ResultadoEntrega } from "../services/repartidorService";
import { EntregaRepartidor } from "../types/pedido.types";

export const MENSAJE_ENTREGA_NO_ENCONTRADA = 'No encontramos esta entrega';

// detalle de una entrega y "Marcar como entregado" (F06)
export function useEntrega(id: string | undefined) {
    const [entrega, setEntrega] = useState<EntregaRepartidor | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actualizando, setActualizando] = useState(false);

    const cargar = useCallback(async () => {
        if (!id) {
            setCargando(false);
            setError(MENSAJE_ENTREGA_NO_ENCONTRADA);
            return;
        }
        setCargando(true);
        setError(null);
        const resultado = await obtenerEntrega(id);
        setCargando(false);
        if (resultado.error || !resultado.entrega) {
            setError(resultado.error ?? MENSAJE_ENTREGA_NO_ENCONTRADA);
            return;
        }
        setEntrega(resultado.entrega);
    }, [id]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    // si falla, la entrega se queda como estaba para reintentar
    const entregar = useCallback(async (): Promise<{resultado: ResultadoEntrega; error: string | null}> => {
        if (!entrega) return {resultado: 'error', error: MENSAJE_ENTREGA_NO_ENCONTRADA};
        setActualizando(true);
        const cambio = await marcarEntregado(entrega.id);
        setActualizando(false);
        return cambio;
    }, [entrega]);

    return {entrega, cargando, error, actualizando, reintentar: cargar, entregar};
}
