import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { listarPedidosAdmin } from "../services/adminService";
import { FiltroAdmin } from "../constants/estadosPedido";
import { PedidoAdminResumen } from "../types/pedido.types";

// lista del admin paginada y filtrada por estado (F04 D3, D4); la primera pagina
// se recarga al volver a la pantalla y al cambiar de filtro
export function usePedidosAdmin() {
    const [filtro, setFiltro] = useState<FiltroAdmin>('activos');
    const [pedidos, setPedidos] = useState<PedidoAdminResumen[]>([]);
    const [paginaSiguiente, setPaginaSiguiente] = useState(0);
    const [hayMas, setHayMas] = useState(true);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const peticion = useRef(0);       // solo se aplica la respuesta de la ultima carga
    const pidiendo = useRef(false);   // onEndReached se dispara seguido

    const cargarPagina = useCallback(async (pagina: number) => {
        const miPeticion = ++peticion.current;
        pidiendo.current = true;
        setCargando(true);
        setError(null);

        const resultado = await listarPedidosAdmin(filtro, pagina);

        if (miPeticion !== peticion.current) return;
        pidiendo.current = false;
        setCargando(false);
        if (resultado.error) {
            setError(resultado.error);
            return;
        }
        setPedidos((anteriores) => pagina === 0 ? resultado.pedidos : [...anteriores, ...resultado.pedidos]);
        setPaginaSiguiente(pagina + 1);
        setHayMas(resultado.hayMas);
    }, [filtro]);

    useFocusEffect(useCallback(() => {
        cargarPagina(0);
    }, [cargarPagina]));

    const cambiarFiltro = useCallback((nuevo: FiltroAdmin) => {
        if (nuevo === filtro) return;
        setPedidos([]);
        setHayMas(true);
        setFiltro(nuevo);
    }, [filtro]);

    // al llegar al final: solo si hay mas y la pagina anterior no fallo (se reintenta con el boton)
    const cargarMas = useCallback(() => {
        if (hayMas && !error && !pidiendo.current) cargarPagina(paginaSiguiente);
    }, [hayMas, error, paginaSiguiente, cargarPagina]);

    const reintentar = useCallback(() => cargarPagina(paginaSiguiente), [paginaSiguiente, cargarPagina]);

    const recargar = useCallback(() => cargarPagina(0), [cargarPagina]);

    return {filtro, cambiarFiltro, pedidos, hayMas, cargando, error, cargarMas, reintentar, recargar};
}
