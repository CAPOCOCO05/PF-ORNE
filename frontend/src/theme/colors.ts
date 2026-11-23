// paleta de ORNE (ver specs/00-project.md, "Diseño", y specs/design_2/)
export const COLORS = {
    FONDO: '#f6f4f3',
    LOGO: '#4a2c2a',
    TITULO: '#4a2c2a',               // titulos e iconos (perfil, pastel)
    DECORACION: '#f9c6d3',           // figura decorativa (la de enfrente)
    DECORACION_CLARA: '#ffdadd',     // figura decorativa (la de atras)
    BOTON_PRINCIPAL: '#f7afbf',      // solo como relleno; el texto encima va en TITULO
    BOTON_SECUNDARIO: '#ffdadd',
    BOTON_DESTRUCTIVO: '#ec7c9b',    // rosa fuerte: acciones que no se deshacen (salir, eliminar, cancelar)
    PRECIO: '#c5ede7',               // pastilla del precio
    // apoyo (no estan en la paleta del cliente)
    // ACENTO: texto, bordes de lo elegido, spinners, pin del mapa y pestaña activa. Los rosas
    // de la paleta son muy claros para eso sobre el fondo, asi que se usa el cafe de los titulos
    ACENTO: '#4a2c2a',
    BLANCO: '#ffffff',
    TEXTO: '#1a1a1a',
    TEXTO_SUAVE: '#6b6b6b',
    ERROR: '#d32f2f', // rojo de error estandar
} as const;
