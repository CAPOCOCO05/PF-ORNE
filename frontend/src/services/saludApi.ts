import { API_URL } from "./apiUrl";
import { marcarRespuestaApi } from "../utils/eventosRed";

// comprueba si la API ya responde (lo usa el banner de conexion mientras esta visible, F10 A8).
// Esta aparte de api.ts para no cargar el cliente de Supabase desde el banner

export const LIMITE_COMPROBACION_MS = 3000;

export async function comprobarApi(): Promise<boolean> {
    const control = new AbortController();
    const limite = setTimeout(() => control.abort(), LIMITE_COMPROBACION_MS);
    try {
        const respuesta = await fetch(`${API_URL}/salud`, {signal: control.signal});
        marcarRespuestaApi(true);
        return respuesta.ok;
    } catch {
        return false;   // sigue sin respuesta; el aviso ya estaba marcado
    } finally {
        clearTimeout(limite);
    }
}
