import { supabase } from "./supabase";
import { MENSAJES_DATOS, mensajeDeExcepcion } from "./erroresDatos";

// cliente HTTP de la API de ORNE (backend/). Manda el token de la sesion de Supabase Auth
// para que la API sepa quien es el usuario; sin sesion la peticion va como visitante

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

type ValorQuery = string | number | null | undefined | (string | number)[];

export interface OpcionesApi {
    metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    query?: Record<string, ValorQuery>;
    cuerpo?: unknown;                                   // se manda como JSON
    archivo?: { contenido: ArrayBuffer; mime: string }; // se manda tal cual (imagenes)
    mensajeConexion?: string;                           // texto si no hay internet
}

export interface RespuestaApi<T> {
    data: T | null;
    error: string | null;
    status: number;                       // 0 si la peticion no llego a la API
    detalles?: Record<string, string>;    // errores por campo (400, 409)
}

// ?a=1&b=x,y — las listas se mandan separadas por coma y se omiten los valores vacios
export function armarQuery(query: Record<string, ValorQuery> = {}): string {
    const partes = Object.entries(query)
        .map(([clave, valor]) => [clave, Array.isArray(valor) ? valor.join(',') : valor] as const)
        .filter(([, valor]) => valor !== null && valor !== undefined && valor !== '')
        .map(([clave, valor]) => `${encodeURIComponent(clave)}=${encodeURIComponent(String(valor))}`);
    return partes.length ? `?${partes.join('&')}` : '';
}

async function cabeceras(opciones: OpcionesApi): Promise<Record<string, string>> {
    const resultado: Record<string, string> = {Accept: 'application/json'};
    const {data} = await supabase.auth.getSession();
    if (data.session?.access_token) resultado.Authorization = `Bearer ${data.session.access_token}`;
    if (opciones.archivo) resultado['Content-Type'] = opciones.archivo.mime;
    else if (opciones.cuerpo !== undefined) resultado['Content-Type'] = 'application/json';
    return resultado;
}

function cuerpoDe(opciones: OpcionesApi): BodyInit | undefined {
    if (opciones.archivo) return opciones.archivo.contenido;
    return opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo);
}

async function leerJson(respuesta: Response): Promise<Record<string, unknown> | null> {
    try {
        return await respuesta.json() as Record<string, unknown>;
    } catch {
        return null;
    }
}

export async function peticionApi<T>(ruta: string, opciones: OpcionesApi = {}): Promise<RespuestaApi<T>> {
    let respuesta: Response;
    try {
        respuesta = await fetch(`${API_URL}${ruta}${armarQuery(opciones.query)}`, {
            method: opciones.metodo ?? 'GET',
            headers: await cabeceras(opciones),
            body: cuerpoDe(opciones),
        });
    } catch (e) {
        console.warn(`API ${ruta}:`, e);
        const mensaje = mensajeDeExcepcion(e, MENSAJES_DATOS.GENERICO);
        return {data: null, error: mensaje === MENSAJES_DATOS.CONEXION ? opciones.mensajeConexion ?? mensaje : mensaje, status: 0};
    }
    const json = await leerJson(respuesta);
    if (respuesta.ok) return {data: json as T, error: null, status: respuesta.status};
    const error = typeof json?.error === 'string' ? json.error : MENSAJES_DATOS.GENERICO;
    return {data: null, error, status: respuesta.status, detalles: json?.detalles as Record<string, string> | undefined};
}
