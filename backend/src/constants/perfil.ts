// reglas del perfil (F00, F07 M6 y M7)

export const MAX_NOMBRE = 80;

// letras (con acentos, ñ y ü), espacios, apostrofo y guion
export const REGEX_NOMBRE = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
export const REGEX_LETRA = /[A-Za-zÀ-ÖØ-öø-ÿ]/g;

export const MENSAJES_PERFIL = {
    NO_ENCONTRADO: 'No encontramos tu perfil',
    NOMBRE_VACIO: 'Ingresa tu nombre completo',
    NOMBRE_INCOMPLETO: 'Escribe tu nombre y al menos un apellido',
    NOMBRE_CARACTERES: 'El nombre solo puede tener letras y espacios',
    NOMBRE_LARGO: `El nombre no puede tener más de ${MAX_NOMBRE} caracteres`,
} as const;
