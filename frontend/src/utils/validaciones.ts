// validaciones de formularios de autenticacion (F00 / F05)

export const MIN_CONTRASENA = 6; // regla por defecto de Supabase Auth

export const MENSAJES_VALIDACION = {
    CORREO_VACIO: 'Ingresa tu correo',
    CORREO_INVALIDO: 'Ingresa un correo válido',
    CONTRASENA_VACIA: 'Ingresa tu contraseña',
    CONTRASENA_CORTA: `La contraseña debe tener al menos ${MIN_CONTRASENA} caracteres`,
    NOMBRE_VACIO: 'Ingresa tu nombre',
    CONFIRMAR_VACIO: 'Confirma tu contraseña',
    NO_COINCIDEN: 'Las contraseñas no coinciden',
} as const;

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface DatosLogin {
    correo: string;
    contrasena: string;
}

export interface DatosRegistro extends DatosLogin {
    nombre: string;
    confirmar: string;
}

// solo contiene los campos con error; un objeto vacio significa formulario valido
export type ErroresFormulario<T> = Partial<Record<keyof T, string>>;

export function validarCorreo(correo: string): string | undefined {
    const limpio = correo.trim();
    if (!limpio) return MENSAJES_VALIDACION.CORREO_VACIO;
    if (!REGEX_CORREO.test(limpio)) return MENSAJES_VALIDACION.CORREO_INVALIDO;
    return undefined;
}

export function validarLogin({correo, contrasena}: DatosLogin): ErroresFormulario<DatosLogin> {
    const errores: ErroresFormulario<DatosLogin> = {};
    const errorCorreo = validarCorreo(correo);
    if (errorCorreo) errores.correo = errorCorreo;
    if (!contrasena) errores.contrasena = MENSAJES_VALIDACION.CONTRASENA_VACIA;
    return errores;
}

export function validarRegistro(datos: DatosRegistro): ErroresFormulario<DatosRegistro> {
    const errores: ErroresFormulario<DatosRegistro> = validarLogin(datos);
    if (!datos.nombre.trim()) errores.nombre = MENSAJES_VALIDACION.NOMBRE_VACIO;
    if (datos.contrasena && datos.contrasena.length < MIN_CONTRASENA) {
        errores.contrasena = MENSAJES_VALIDACION.CONTRASENA_CORTA;
    }
    if (!datos.confirmar) {
        errores.confirmar = MENSAJES_VALIDACION.CONFIRMAR_VACIO;
    } else if (datos.confirmar !== datos.contrasena) {
        errores.confirmar = MENSAJES_VALIDACION.NO_COINCIDEN;
    }
    return errores;
}

export function tieneErrores<T>(errores: ErroresFormulario<T>): boolean {
    return Object.keys(errores).length > 0;
}
