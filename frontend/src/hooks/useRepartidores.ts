import { useCallback, useEffect, useState } from "react";
import { listarRepartidores } from "../services/adminService";
import { Repartidor } from "../types/pedido.types";

// repartidores para "Enviar a reparto" (F04 D7); solo se piden cuando hacen falta
export function useRepartidores(activo: boolean) {
    const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [intento, setIntento] = useState(0);

    useEffect(() => {
        if (!activo) return;
        let cancelado = false;
        setCargando(true);
        setError(null);
        listarRepartidores().then((resultado) => {
            if (cancelado) return;
            setCargando(false);
            setError(resultado.error);
            setRepartidores(resultado.repartidores);
        });
        return () => { cancelado = true; };
    }, [activo, intento]);

    const reintentar = useCallback(() => setIntento((n) => n + 1), []);

    return {repartidores, cargando, error, reintentar};
}
