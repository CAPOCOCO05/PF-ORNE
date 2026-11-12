import { useCallback, useEffect, useRef, useState } from "react";
import { listarCatalogo } from "../services/catalogoService";
import { FILTROS_VACIOS } from "../constants/filtrosCatalogo";
import { FiltrosCatalogo, PastelCatalogo } from "../types/pedido.types";

// catalogo paginado con scroll infinito (F01, D6); con filtros del servidor (F07 M5)
export function useCatalogo(filtros: FiltrosCatalogo = FILTROS_VACIOS) {
    const [pasteles, setPasteles] = useState<PastelCatalogo[]>([]);
    const [paginaSiguiente, setPaginaSiguiente] = useState(0);
    const [hayMas, setHayMas] = useState(true);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pidiendo = useRef(false); // evita pedir la misma pagina dos veces (onEndReached se dispara seguido)
    const ultimaSolicitud = useRef(0); // al cambiar filtros se ignoran las respuestas de la consulta anterior

    // reiniciar: nueva consulta por cambio de filtros; vacia la lista y no espera a la anterior
    const cargarPagina = useCallback(async (pagina: number, reiniciar = false) => {
        if (pidiendo.current && !reiniciar) return;
        const solicitud = ++ultimaSolicitud.current;
        pidiendo.current = true;
        setCargando(true);
        setError(null);
        if (reiniciar) setPasteles([]);

        const resultado = await listarCatalogo(pagina, filtros);

        if (solicitud !== ultimaSolicitud.current) return;
        pidiendo.current = false;
        setCargando(false);
        if (resultado.error) {
            setError(resultado.error);
            return;
        }
        setPasteles((anteriores) => pagina === 0 ? resultado.pasteles : [...anteriores, ...resultado.pasteles]);
        setPaginaSiguiente(pagina + 1);
        setHayMas(resultado.hayMas);
    }, [filtros]);

    // primera carga y cada cambio de filtros: vuelve a la primera pagina
    useEffect(() => {
        cargarPagina(0, true);
    }, [cargarPagina]);

    // al llegar al final: solo si hay mas y la pagina anterior no fallo (se reintenta con el boton)
    const cargarMas = useCallback(() => {
        if (hayMas && !error) cargarPagina(paginaSiguiente);
    }, [hayMas, error, paginaSiguiente, cargarPagina]);

    const reintentar = useCallback(() => cargarPagina(paginaSiguiente), [paginaSiguiente, cargarPagina]);

    const recargar = useCallback(() => cargarPagina(0), [cargarPagina]);

    return {pasteles, hayMas, cargando, error, cargarMas, reintentar, recargar};
}
