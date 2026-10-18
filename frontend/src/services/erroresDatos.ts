// traduce los errores de la base de datos y Storage a mensajes para el usuario (F01, F05)

export const MENSAJES_DATOS = {
    CONEXION: 'Error de conexión, inténtalo de nuevo',
    GUARDAR_CONEXION: 'Error de conexión. Tu progreso no se guardó, inténtalo de nuevo',
    IMAGEN: 'No se pudo subir la imagen, inténtalo de nuevo',
    GENERICO: 'Ocurrió un error, inténtalo de nuevo',
} as const;

// forma minima de un error de PostgREST o Storage (no se depende de sus clases internas)
export interface ErrorDatosLike {
    message?: string;
    code?: string;
}

// fallo de red: supabase-js no llego a recibir respuesta del servidor
export function esErrorDeConexion(error: ErrorDatosLike): boolean {
    return !error.code && /network request failed|failed to fetch|network error/i.test(error.message ?? '');
}

// mensajeConexion permite usar el texto de la spec de cada operacion (ej. guardar borrador)
export function traducirErrorDatos(error: ErrorDatosLike, mensajeConexion: string = MENSAJES_DATOS.CONEXION): string {
    if (esErrorDeConexion(error)) return mensajeConexion;
    console.warn('Error de datos sin traducir:', error.code, error.message);
    return MENSAJES_DATOS.GENERICO;
}
