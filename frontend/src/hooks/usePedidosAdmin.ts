import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { contarPorEstado, listarPedidosAdmin } from "../services/adminService";
import { ConteoEstados, EstadoActivo, FILTRO_ADMIN_INICIAL, FiltroAdmin, PestaniaAdmin } from "../constants/estadosPedido";
import { PedidoAdminResumen } from "../types/pedido.types";
import { alternarEstado } from "../utils/estados";

// lista del admin paginada y filtrada por estado (F04 D3, D4); la primera pagina
// se recarga al volver a la pantalla y al cambiar de filtro. El filtro vive aqui,
// asi que se conserva al ir al detalle y regresar (F07 M3 D4)
export function usePedidosAdmin() {
    const [filtro, setFiltro] = useState<FiltroAdmin>(FILTRO_ADMIN_INICIAL);
    const [conteos, setConteos] = useState<ConteoEstados | null>(null);
    const [pedidos, setPedidos] = useState<PedidoAdminResumen[]>([]);
    const [paginaSiguiente, setPaginaSiguiente] = useState(0);
    const [hayMas, setHayMas] = useState(true);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const peticion = useRef(0);       // solo se aplica la respuesta de la ultima carga
    const pidiendo = useRef(false);   // onEndReached se dispara seguido

    // contadores de los chips (M3 D2); si fallan, los chips se muestran sin numero
    // y la lista sigue funcionando
    const conteo = useRef(0);
    const cargarConteos = useCallback(async () => {
        const miConteo = ++conteo.current;
        const resultado = await contarPorEstado();
        if (miConteo === conteo.current) setConteos(resultado.conteos);
    }, []);

    const cargarPagina = useCallback(async (pagina: number) => {
        const miPeticion = ++peticion.current;
        pidiendo.current = true;
        setCargando(true);
        setError(null);
        if (pagina === 0) cargarConteos();

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
    }, [filtro, cargarConteos]);

    useFocusEffect(useCallback(() => {
        cargarPagina(0);
    }, [cargarPagina]));

    const aplicarFiltro = useCallback((nuevo: FiltroAdmin) => {
        setPedidos([]);
        setHayMas(true);
        setFiltro(nuevo);
    }, []);

    const cambiarPestania = useCallback((pestania: PestaniaAdmin) => {
        if (pestania !== filtro.pestania) aplicarFiltro({...filtro, pestania});
    }, [filtro, aplicarFiltro]);

    const marcarEstado = useCallback((estado: EstadoActivo) => {
        aplicarFiltro({...filtro, estados: alternarEstado(filtro.estados, estado)});
    }, [filtro, aplicarFiltro]);

    const limpiarEstados = useCallback(() => {
        if (filtro.estados.length > 0) aplicarFiltro({...filtro, estados: []});
    }, [filtro, aplicarFiltro]);

    // al llegar al final: solo si hay mas y la pagina anterior no fallo (se reintenta con el boton)
    const cargarMas = useCallback(() => {
        if (hayMas && !error && !pidiendo.current) cargarPagina(paginaSiguiente);
    }, [hayMas, error, paginaSiguiente, cargarPagina]);

    const reintentar = useCallback(() => cargarPagina(paginaSiguiente), [paginaSiguiente, cargarPagina]);

    const recargar = useCallback(() => cargarPagina(0), [cargarPagina]);

    return {filtro, cambiarPestania, marcarEstado, limpiarEstados, conteos, pedidos, hayMas, cargando, error, cargarMas, reintentar, recargar};
}
