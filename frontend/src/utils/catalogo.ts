import { FormularioPastel, PastelAdmin } from "../types/pedido.types";
import { MENSAJES_PEDIDO, NIVELES_MAX } from "./pedido";

// reglas del formulario de pasteles del catalogo (F07 M4), sin dependencias de pantalla

export const MAX_NOMBRE_PASTEL = 60;
export const MAX_DESCRIPCION_PASTEL = 200;

export const MENSAJES_CATALOGO = {
    NOMBRE_VACIO: 'Ingresa el nombre del pastel',
    NOMBRE_LARGO: `Máximo ${MAX_NOMBRE_PASTEL} caracteres`,
    NOMBRE_REPETIDO: 'Ya existe un pastel con ese nombre',
    DESCRIPCION_LARGA: `Máximo ${MAX_DESCRIPCION_PASTEL} caracteres`,
    NIVELES_EXCEDIDOS: 'Demasiados niveles para ese tamaño',
    IMAGEN: 'No se pudo subir la imagen. Inténtalo de nuevo',
    NO_ENCONTRADO: 'No encontramos este pastel',
} as const;

export type CampoPastel = 'nombre' | 'descripcion' | 'tamanio' | 'niveles' | 'tipoPan' | 'relleno';
export type ErroresPastel = Partial<Record<CampoPastel, string>>;

export const FORMULARIO_PASTEL_VACIO: FormularioPastel = {
    nombre: '',
    descripcion: '',
    tamanio: null,
    niveles: null,
    tipoPan: null,
    relleno: null,
    activo: true,       // por defecto se publica (M4, datos de entrada)
    imagenUrl: null,
    imagenLocal: null,
};

export function formularioDePastel(pastel: PastelAdmin): FormularioPastel {
    return {
        nombre: pastel.nombre,
        descripcion: pastel.descripcion ?? '',
        tamanio: pastel.tamanio,
        niveles: pastel.niveles,
        tipoPan: pastel.tipo_pan,
        relleno: pastel.relleno,
        activo: pastel.activo,
        imagenUrl: pastel.imagen_url,
        imagenLocal: null,
    };
}

function validarNombrePastel(nombre: string): string | undefined {
    const limpio = nombre.trim();
    if (!limpio) return MENSAJES_CATALOGO.NOMBRE_VACIO;
    if (limpio.length > MAX_NOMBRE_PASTEL) return MENSAJES_CATALOGO.NOMBRE_LARGO;
    return undefined;
}

// un objeto vacio significa formulario valido; el nombre repetido lo detecta la base (012)
export function validarPastel(formulario: FormularioPastel): ErroresPastel {
    const errores: ErroresPastel = {};
    const errorNombre = validarNombrePastel(formulario.nombre);
    if (errorNombre) errores.nombre = errorNombre;
    if (formulario.descripcion.trim().length > MAX_DESCRIPCION_PASTEL) errores.descripcion = MENSAJES_CATALOGO.DESCRIPCION_LARGA;
    if (formulario.tamanio === null) errores.tamanio = MENSAJES_PEDIDO.OBLIGATORIO;
    if (formulario.niveles === null) errores.niveles = MENSAJES_PEDIDO.OBLIGATORIO;
    else if (formulario.tamanio && formulario.niveles > NIVELES_MAX[formulario.tamanio]) errores.niveles = MENSAJES_CATALOGO.NIVELES_EXCEDIDOS;
    if (formulario.tipoPan === null) errores.tipoPan = MENSAJES_PEDIDO.OBLIGATORIO;
    if (formulario.relleno === null) errores.relleno = MENSAJES_PEDIDO.OBLIGATORIO;
    return errores;
}

// nombre del archivo en el bucket: unico en cada subida para no mostrar imagenes viejas en cache (D3)
export function nombreImagenCatalogo(extension: string, ahora: number = Date.now(), aleatorio: number = Math.random()): string {
    return `pastel-${ahora}-${aleatorio.toString(36).slice(2, 8)}.${extension}`;
}

// ruta dentro del bucket 'catalogo' de una URL publica; null si la imagen no es de ese bucket
export function rutaDeUrlCatalogo(url: string | null): string | null {
    const marca = '/storage/v1/object/public/catalogo/';
    const indice = url?.indexOf(marca) ?? -1;
    if (!url || indice < 0) return null;
    return decodeURIComponent(url.slice(indice + marca.length).split('?')[0]) || null;
}
