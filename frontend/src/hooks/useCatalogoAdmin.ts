import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { listarCatalogoAdmin } from "../services/catalogoService";
import { PastelAdmin } from "../types/pedido.types";

// catalogo del admin, publicados y ocultos, de 10 en 10 (F07 M4 D5); la primera
// pagina se recarga al volver del formulario para ver los cambios
export function useCatalogoAdmin() {
    const [pasteles, setPasteles] = useState<PastelAdmin[]>([]);
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

        const resultado = await listarCatalogoAdmin(pagina);

        if (miPeticion !== peticion.current) return;
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

    useFocusEffect(useCallback(() => {
        cargarPagina(0);
    }, [cargarPagina]));

    // al llegar al final: solo si hay mas y la pagina anterior no fallo (se reintenta con el boton)
    const cargarMas = useCallback(() => {
        if (hayMas && !error && !pidiendo.current) cargarPagina(paginaSiguiente);
    }, [hayMas, error, paginaSiguiente, cargarPagina]);

    const reintentar = useCallback(() => cargarPagina(paginaSiguiente), [paginaSiguiente, cargarPagina]);

    const recargar = useCallback(() => cargarPagina(0), [cargarPagina]);

    return {pasteles, cargando, error, cargarMas, reintentar, recargar};
}
