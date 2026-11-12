import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { guardarPastel, obtenerPastelAdmin, ResultadoGuardarPastel } from "../services/catalogoService";
import { FormularioPastel } from "../types/pedido.types";
import { ErroresPastel, FORMULARIO_PASTEL_VACIO, formularioDePastel, MENSAJES_CATALOGO, validarPastel } from "../utils/catalogo";

export const ID_PASTEL_NUEVO = 'nuevo';

// formulario de alta (id = 'nuevo') o edicion de un pastel del catalogo (F07 M4)
export function usePastelAdmin(id: string | undefined) {
    const esNuevo = id === ID_PASTEL_NUEVO;
    const [formulario, setFormulario] = useState<FormularioPastel>(FORMULARIO_PASTEL_VACIO);
    const [errores, setErrores] = useState<ErroresPastel>({});
    const [cargando, setCargando] = useState(!esNuevo);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    // las pantallas del menu lateral siguen montadas al salir: al entrar se parte
    // de cero (alta) o de lo guardado (edicion), sin cambios sin guardar de otra visita
    const cargar = useCallback(async () => {
        setErrores({});
        setError(null);
        if (esNuevo) {
            setFormulario(FORMULARIO_PASTEL_VACIO);
            setCargando(false);
            return;
        }
        if (!id) {
            setCargando(false);
            setError(MENSAJES_CATALOGO.NO_ENCONTRADO);
            return;
        }
        setCargando(true);
        const resultado = await obtenerPastelAdmin(id);
        setCargando(false);
        if (resultado.error || !resultado.pastel) {
            setError(resultado.error ?? MENSAJES_CATALOGO.NO_ENCONTRADO);
            return;
        }
        setFormulario(formularioDePastel(resultado.pastel));
    }, [id, esNuevo]);

    useFocusEffect(useCallback(() => {
        cargar();
    }, [cargar]));

    // al corregir un campo se quita su error (F05: mensaje junto al campo)
    const actualizar = useCallback((cambios: Partial<FormularioPastel>) => {
        setFormulario((anterior) => ({...anterior, ...cambios}));
        setErrores((anteriores) => {
            const siguientes = {...anteriores};
            for (const campo of Object.keys(cambios)) delete siguientes[campo as keyof ErroresPastel];
            return siguientes;
        });
    }, []);

    // true si el formulario es valido; los errores quedan junto a cada campo
    const validar = useCallback((): boolean => {
        const encontrados = validarPastel(formulario);
        setErrores(encontrados);
        return Object.keys(encontrados).length === 0;
    }, [formulario]);

    const guardar = useCallback(async (): Promise<ResultadoGuardarPastel> => {
        setGuardando(true);
        const resultado = await guardarPastel(esNuevo ? null : id ?? null, formulario);
        setGuardando(false);
        if (resultado.errorNombre) setErrores((anteriores) => ({...anteriores, nombre: resultado.errorNombre ?? undefined}));
        return resultado;
    }, [esNuevo, id, formulario]);

    return {esNuevo, formulario, errores, cargando, error, guardando, actualizar, validar, guardar, reintentar: cargar};
}
