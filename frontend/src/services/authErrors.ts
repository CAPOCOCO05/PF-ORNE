// traduce los errores de Supabase Auth a los mensajes de la spec F00
import { MENSAJE_SIN_CONEXION } from "./erroresDatos";

export const MENSAJES_AUTH = {
    CREDENCIALES: 'Correo o contraseña incorrectos',
    CORREO_REGISTRADO: 'Este correo ya tiene una cuenta',
    CONEXION: MENSAJE_SIN_CONEXION,
    CONTRASENA_DEBIL: 'La contraseña debe tener al menos 6 caracteres',
    DEMASIADOS_INTENTOS: 'Demasiados intentos, espera un momento',
    CORREO_INVALIDO: 'Ingresa un correo válido',
    GENERICO: 'Ocurrió un error, inténtalo de nuevo',
} as const;

// forma minima de un AuthError de Supabase (no se depende de sus clases internas)
export interface ErrorAuthLike {
    name?: string;
    message?: string;
    code?: string;
    status?: number;
}

const MENSAJE_POR_CODIGO: Record<string, string> = {
    invalid_credentials: MENSAJES_AUTH.CREDENCIALES,
    user_already_exists: MENSAJES_AUTH.CORREO_REGISTRADO,
    email_exists: MENSAJES_AUTH.CORREO_REGISTRADO,
    weak_password: MENSAJES_AUTH.CONTRASENA_DEBIL,
    over_request_rate_limit: MENSAJES_AUTH.DEMASIADOS_INTENTOS,
    email_address_invalid: MENSAJES_AUTH.CORREO_INVALIDO,
};

export function traducirErrorAuth(error: ErrorAuthLike): string {
    // fallo de red: Supabase no llego a responder
    if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
        return MENSAJES_AUTH.CONEXION;
    }
    if (error.code && MENSAJE_POR_CODIGO[error.code]) {
        return MENSAJE_POR_CODIGO[error.code];
    }
    console.warn('Error de autenticación sin traducir:', error.code, error.message);
    return MENSAJES_AUTH.GENERICO;
}
