import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { guardarDatosCliente, obtenerDatosCliente } from "../services/perfilService";
import { DatosCliente } from "../types/pedido.types";
import { normalizarNombre } from "../utils/validaciones";

export const MENSAJE_SIN_SESION = 'Tu sesión expiró, inicia sesión de nuevo';

// perfil del cliente: nombre (perfiles) y datos de contacto (datos_cliente) (F07 M7)
export function useDatosCliente() {
    const {user, perfil, actualizarNombre} = useAuth();
    const userId = user?.id ?? null;
    const [datos, setDatos] = useState<DatosCliente | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        if (!userId) return;
        setCargando(true);
        setError(null);
        const resultado = await obtenerDatosCliente();
        setCargando(false);
        if (resultado.error) {
            setError(resultado.error);
            return;
        }
        setDatos(resultado.datos);
    }, [userId]);

    // al enfocar: el Drawer no desmonta las pantallas y los datos pudieron cambiar en "Editar datos"
    useFocusEffect(useCallback(() => {
        cargar();
    }, [cargar]));

    // primero los datos de contacto y luego el nombre (solo si cambio); devuelve el error
    const guardar = useCallback(async (nombre: string, nuevos: DatosCliente): Promise<string | null> => {
        if (!userId) return MENSAJE_SIN_SESION;
        const {error: errorDatos} = await guardarDatosCliente(nuevos);
        if (errorDatos) return errorDatos;
        setDatos(nuevos);
        const limpio = normalizarNombre(nombre);
        if (limpio === perfil?.nombre) return null;
        const {error: errorNombre} = await actualizarNombre(limpio);
        return errorNombre;
    }, [userId, perfil?.nombre, actualizarNombre]);

    return {nombre: perfil?.nombre ?? '', correo: user?.email ?? '', datos, cargando, error, recargar: cargar, guardar};
}
