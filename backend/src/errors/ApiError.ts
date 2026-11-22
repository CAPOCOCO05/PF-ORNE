// errores que la API devuelve al cliente con un codigo HTTP y un mensaje para el usuario

export const MENSAJES_API = {
    GENERICO: 'Ocurrió un error, inténtalo de nuevo',
    SIN_SESION: 'Inicia sesión para continuar',
    SESION_EXPIRADA: 'Tu sesión expiró, vuelve a iniciar sesión',
    SIN_PERMISO: 'No tienes permiso para realizar esta acción',
    RUTA_NO_ENCONTRADA: 'Recurso no encontrado',
    DATOS_INVALIDOS: 'Revisa los datos enviados',
} as const;

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        mensaje: string,
        // detalle opcional por campo (p. ej. errores de un formulario)
        public readonly detalles?: Record<string, string>,
    ) {
        super(mensaje);
        this.name = 'ApiError';
    }

    static solicitudInvalida(mensaje: string = MENSAJES_API.DATOS_INVALIDOS, detalles?: Record<string, string>) {
        return new ApiError(400, mensaje, detalles);
    }

    static noAutenticado(mensaje: string = MENSAJES_API.SIN_SESION) {
        return new ApiError(401, mensaje);
    }

    static prohibido(mensaje: string = MENSAJES_API.SIN_PERMISO) {
        return new ApiError(403, mensaje);
    }

    static noEncontrado(mensaje: string = MENSAJES_API.RUTA_NO_ENCONTRADA) {
        return new ApiError(404, mensaje);
    }

    static conflicto(mensaje: string, detalles?: Record<string, string>) {
        return new ApiError(409, mensaje, detalles);
    }
}

// error de Supabase (PostgREST o Storage) que llega desde la capa de datos
export class ErrorBaseDatos extends Error {
    constructor(mensaje: string, public readonly codigo?: string) {
        super(mensaje);
        this.name = 'ErrorBaseDatos';
    }
}

// codigos de Postgres que la API traduce
export const CODIGOS_PG = {
    DUPLICADO: '23505',        // unique_violation
    SIN_PERMISO: '42501',      // insufficient_privilege (RLS)
} as const;
