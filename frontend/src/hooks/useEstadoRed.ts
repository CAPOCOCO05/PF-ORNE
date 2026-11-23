import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { addNetworkStateListener, getNetworkStateAsync, NetworkState } from "expo-network";
import { comprobarApi } from "../services/saludApi";
import { estaSinConexion } from "../utils/conexion";
import { apiSinRespuesta, suscribirRespuestaApi } from "../utils/eventosRed";

// cada cuanto se prueba si la API volvio a responder mientras el banner esta visible
export const INTERVALO_COMPROBACION_MS = 4000;

// estado de la red que reporta el sistema; se vuelve a consultar al regresar al frente porque
// al activar el modo avion desde el centro de control el aviso del cambio se puede perder
export function useEstadoRed(): NetworkState {
    const [estado, setEstado] = useState<NetworkState>({});

    useEffect(() => {
        let activo = true;
        const consultar = () => {
            getNetworkStateAsync()
                .then((nuevo) => { if (activo) setEstado(nuevo); })
                .catch((e: unknown) => console.warn('useEstadoRed: no se pudo leer la red', e));
        };
        consultar();
        const cambios = addNetworkStateListener(setEstado);
        const alFrente = AppState.addEventListener('change', (app) => { if (app === 'active') consultar(); });
        return () => {
            activo = false;
            cambios.remove();
            alFrente.remove();
        };
    }, []);

    return estado;
}

// true mientras la API no responda; mientras tanto se prueba cada INTERVALO_COMPROBACION_MS si
// ya volvio, para quitar el aviso aunque el usuario no haga nada
function useApiSinRespuesta(): boolean {
    const [sinRespuesta, setSinRespuesta] = useState(apiSinRespuesta());

    useEffect(() => suscribirRespuestaApi(setSinRespuesta), []);

    useEffect(() => {
        if (!sinRespuesta) return;
        const intervalo = setInterval(() => { void comprobarApi(); }, INTERVALO_COMPROBACION_MS);
        return () => clearInterval(intervalo);
    }, [sinRespuesta]);

    return sinRespuesta;
}

// sin conexion (F10 A8): lo dice el sistema, o la API dejo de responder
export function useSinConexion(): boolean {
    const red = useEstadoRed();
    const sinRespuesta = useApiSinRespuesta();
    return estaSinConexion(red) || sinRespuesta;
}
