import { Niveles, OrdenCatalogo, RangoPrecioId, RellenoId, SaborPanId, Tamanio } from '../types/catalogo.types';

// reglas del catalogo (F01 D6/D7, F07 M4 y M5)

export const PASTELES_POR_PAGINA = 10;

export const TAMANIOS: Tamanio[] = ['10', '15', '20', '30'];
export const NIVELES: Niveles[] = [1, 2, 3, 4];
export const SABORES_PAN: SaborPanId[] = ['vainilla', 'chocolate', 'redvelvet', 'tresleches', 'fresa', 'zanahoria'];
export const RELLENOS: RellenoId[] = ['cajeta', 'chocolate', 'cremapastelera', 'mantequillademani', 'mermeladafresa'];
export const ORDENES: OrdenCatalogo[] = ['nombre', 'precioAsc', 'precioDesc'];

// niveles maximos que soporta cada tamaño
export const NIVELES_MAX: Record<Tamanio, Niveles> = { '10': 1, '15': 2, '20': 3, '30': 4 };

// rangos del filtro de precio (M5 D2): mayorQue es exclusivo y hasta inclusivo
export const RANGOS_PRECIO: Record<RangoPrecioId, { mayorQue?: number; hasta?: number }> = {
    hasta500: { hasta: 500 },
    '500a800': { mayorQue: 500, hasta: 800 },
    '800a1200': { mayorQue: 800, hasta: 1200 },
    mas1200: { mayorQue: 1200 },
};

export const MAX_NOMBRE_PASTEL = 60;
export const MAX_DESCRIPCION_PASTEL = 200;
export const MAX_URL_IMAGEN = 500;

// imagenes del catalogo: mismos formatos y limite que acepta la app
export const MAX_BYTES_IMAGEN = 5 * 1024 * 1024;
export const EXTENSION_POR_MIME: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/heic': 'heic',
    'image/heif': 'heif',
};

export const BUCKET_CATALOGO = 'catalogo';

export const MENSAJES_CATALOGO = {
    OBLIGATORIO: 'Este campo es obligatorio',
    OPCION_INVALIDA: 'Opción no válida',
    NOMBRE_VACIO: 'Ingresa el nombre del pastel',
    NOMBRE_LARGO: `Máximo ${MAX_NOMBRE_PASTEL} caracteres`,
    NOMBRE_REPETIDO: 'Ya existe un pastel con ese nombre',
    DESCRIPCION_LARGA: `Máximo ${MAX_DESCRIPCION_PASTEL} caracteres`,
    NIVELES_EXCEDIDOS: 'Demasiados niveles para ese tamaño',
    IMAGEN_URL: 'La imagen no es válida',
    IMAGEN_FORMATO: 'Solo se aceptan archivos de imagen',
    IMAGEN_VACIA: 'No se recibió ninguna imagen',
    IMAGEN: 'No se pudo subir la imagen. Inténtalo de nuevo',
    NO_ENCONTRADO: 'No encontramos este pastel',
    FILTROS: 'Los filtros del catálogo no son válidos',
} as const;
