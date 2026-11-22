// traduce los errores de la base de datos y Storage a mensajes para el usuario (F01, F05)

// texto comun cuando no hay internet (datos, autenticacion y perfil) (F10 A7)
export const MENSAJE_SIN_CONEXION = 'Sin conexión a internet. Revisa tu conexión e inténtalo de nuevo';

export const MENSAJES_DATOS = {
    CONEXION: MENSAJE_SIN_CONEXION,
    GUARDAR_CONEXION: 'Sin conexión a internet. Tu progreso no se guardó, inténtalo de nuevo',
    IMAGEN: 'No se pudo subir la imagen, inténtalo de nuevo',
    GENERICO: 'Ocurrió un error, inténtalo de nuevo',
} as const;

// forma minima de un error de PostgREST o Storage (no se depende de sus clases internas)
export interface ErrorDatosLike {
    message?: string;
    code?: string;
}

// mensajes de una peticion que no llego al servidor:
// - fetch de React Native: "Network request failed" / "timed out"
// - expo/fetch (fetch global desde Expo SDK 52+): "fetch failed: <mensaje nativo>", p. ej.
//   Android "Unable to resolve host ..." / "Failed to connect to ...",
//   iOS "The Internet connection appears to be offline."
// - navegador: "Failed to fetch" / "NetworkError"
const PATRON_CONEXION = new RegExp([
    'network request failed',
    'network request timed out',
    'failed to fetch',
    'fetch failed',
    'network ?error',
    'unable to resolve host',
    'failed to connect',
    'internet connection appears to be offline',
    'not connected to the internet',
    'connection (was )?(lost|refused|reset|abort)',
    'timed? ?out',
].join('|'), 'i');

// fallo de red: la peticion (a la API o a Supabase Auth) no recibio respuesta (sin codigo de error)
export function esErrorDeConexion(error: ErrorDatosLike): boolean {
    return !error.code && PATRON_CONEXION.test(error.message ?? '');
}

// mensajeConexion permite usar el texto de la spec de cada operacion (ej. guardar borrador)
export function traducirErrorDatos(error: ErrorDatosLike, mensajeConexion: string = MENSAJES_DATOS.CONEXION): string {
    if (esErrorDeConexion(error)) return mensajeConexion;
    console.warn('Error de datos sin traducir:', error.code, error.message);
    return MENSAJES_DATOS.GENERICO;
}

// excepcion atrapada en un try/catch (p. ej. leer o subir una imagen): sin internet
// se avisa la falta de conexion; cualquier otra falla usa el mensaje de la operacion
export function mensajeDeExcepcion(excepcion: unknown, mensajeOtro: string): string {
    const message = excepcion instanceof Error ? `${excepcion.name}: ${excepcion.message}` : String(excepcion);
    return esErrorDeConexion({message}) ? MENSAJE_SIN_CONEXION : mensajeOtro;
}
