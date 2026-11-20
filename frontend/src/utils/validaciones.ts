// validaciones de formularios de autenticacion (F00 / F05)

export const MIN_CONTRASENA = 6; // regla por defecto de Supabase Auth
export const MAX_NOMBRE = 80; // F07 M6
export const MAX_CORREO = 254;     // F10 A6: largo maximo de un correo (RFC 5321)
export const MAX_CONTRASENA = 72;  // F10 A6: Supabase Auth (bcrypt) no usa mas de 72 caracteres

export const MENSAJES_VALIDACION = {
    CORREO_VACIO: 'Ingresa tu correo',
    CORREO_INVALIDO: 'Ingresa un correo válido',
    CONTRASENA_VACIA: 'Ingresa tu contraseña',
    CONTRASENA_CORTA: `La contraseña debe tener al menos ${MIN_CONTRASENA} caracteres`,
    NOMBRE_VACIO: 'Ingresa tu nombre completo',
    NOMBRE_INCOMPLETO: 'Escribe tu nombre y al menos un apellido',
    NOMBRE_CARACTERES: 'El nombre solo puede tener letras y espacios',
    NOMBRE_LARGO: `El nombre no puede tener más de ${MAX_NOMBRE} caracteres`,
    CONFIRMAR_VACIO: 'Confirma tu contraseña',
    NO_COINCIDEN: 'Las contraseñas no coinciden',
} as const;

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// letras (con acentos, ñ y ü), espacios, apostrofo y guion; rango explicito en vez de
// \p{L} para no depender del soporte de Unicode del motor JS
const REGEX_NOMBRE = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
const REGEX_LETRA = /[A-Za-zÀ-ÖØ-öø-ÿ]/g;

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

// trim y espacios repetidos colapsados: asi se guarda en perfiles.nombre (F07 M6)
export function normalizarNombre(nombre: string): string {
    return nombre.trim().replace(/\s+/g, ' ');
}

// nombre y al menos un apellido: dos o mas palabras de 2+ letras (F07 M6, D4)
export function validarNombreCompleto(nombre: string): string | undefined {
    const limpio = normalizarNombre(nombre);
    if (!limpio) return MENSAJES_VALIDACION.NOMBRE_VACIO;
    if (!REGEX_NOMBRE.test(limpio)) return MENSAJES_VALIDACION.NOMBRE_CARACTERES;
    if (limpio.length > MAX_NOMBRE) return MENSAJES_VALIDACION.NOMBRE_LARGO;
    const palabras = limpio.split(' ').filter((p) => (p.match(REGEX_LETRA) ?? []).length >= 2);
    if (palabras.length < 2) return MENSAJES_VALIDACION.NOMBRE_INCOMPLETO;
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
    const errorNombre = validarNombreCompleto(datos.nombre);
    if (errorNombre) errores.nombre = errorNombre;
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
