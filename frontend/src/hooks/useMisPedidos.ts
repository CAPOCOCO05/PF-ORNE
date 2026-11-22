import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { eliminarBorrador, listarMisPedidos } from "../services/pedidosService";
import { ResumenPedido } from "../types/pedido.types";

// pedidos del cliente; se recargan cada vez que se abre la pantalla (puede haber un borrador nuevo)
export function useMisPedidos() {
    const {user} = useAuth();
    const usuarioId = user?.id ?? null;
    const [pedidos, setPedidos] = useState<ResumenPedido[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [eliminando, setEliminando] = useState<string | null>(null); // id del borrador que se esta borrando
    const peticion = useRef(0); // solo se aplica la respuesta de la ultima carga

    const cargar = useCallback(async () => {
        if (!usuarioId) return;
        const miPeticion = ++peticion.current;
        setCargando(true);
        setError(null);
        const resultado = await listarMisPedidos();
        if (miPeticion !== peticion.current) return;
        setCargando(false);
        if (resultado.error) {
            setError(resultado.error);
            return;
        }
        setPedidos(resultado.pedidos);
    }, [usuarioId]);

    useFocusEffect(useCallback(() => {
        cargar();
    }, [cargar]));

    // devuelve el mensaje de error; si sale bien, lo quita de la lista sin recargar
    const eliminar = useCallback(async (id: string) => {
        if (!usuarioId) return null;
        setEliminando(id);
        const {error: errorEliminar} = await eliminarBorrador(id);
        setEliminando(null);
        if (!errorEliminar) setPedidos((lista) => lista.filter((p) => p.id !== id));
        return errorEliminar;
    }, [usuarioId]);

    return {pedidos, cargando, error, eliminando, recargar: cargar, eliminar};
}
