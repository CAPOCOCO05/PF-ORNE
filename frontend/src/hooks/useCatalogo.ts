import { useCallback, useEffect, useRef, useState } from "react";
import { listarCatalogo } from "../services/catalogoService";
import { PastelCatalogo } from "../types/pedido.types";

// catalogo paginado con scroll infinito (F01, D6)
export function useCatalogo() {
    const [pasteles, setPasteles] = useState<PastelCatalogo[]>([]);
    const [paginaSiguiente, setPaginaSiguiente] = useState(0);
    const [hayMas, setHayMas] = useState(true);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pidiendo = useRef(false); // evita pedir la misma pagina dos veces (onEndReached se dispara seguido)

    const cargarPagina = useCallback(async (pagina: number) => {
        if (pidiendo.current) return;
        pidiendo.current = true;
        setCargando(true);
        setError(null);

        const resultado = await listarCatalogo(pagina);

        pidiendo.current = false;
        setCargando(false);
        if (resultado.error) {
            setError(resultado.error);
            return;
        }
        setPasteles((anteriores) => pagina === 0 ? resultado.pasteles : [...anteriores, ...resultado.pasteles]);
        setPaginaSiguiente(pagina + 1);
        setHayMas(resultado.hayMas);
    }, []);

    useEffect(() => {
        cargarPagina(0);
    }, [cargarPagina]);

    // al llegar al final: solo si hay mas y la pagina anterior no fallo (se reintenta con el boton)
    const cargarMas = useCallback(() => {
        if (hayMas && !error) cargarPagina(paginaSiguiente);
    }, [hayMas, error, paginaSiguiente, cargarPagina]);

    const reintentar = useCallback(() => cargarPagina(paginaSiguiente), [paginaSiguiente, cargarPagina]);

    const recargar = useCallback(() => cargarPagina(0), [cargarPagina]);

    return {pasteles, hayMas, cargando, error, cargarMas, reintentar, recargar};
}
