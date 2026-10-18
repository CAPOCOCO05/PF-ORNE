import { ImagenLocal, Niveles, PasoPedido, PedidoEnCurso, Tamanio } from "../types/pedido.types";

// reglas del pedido de F01 (D5, D8, D9) sin dependencias de pantalla

export const MENSAJES_PEDIDO = {
    OBLIGATORIO: 'Este campo es obligatorio',
    IMAGEN_FORMATO: 'Solo se aceptan archivos de imagen',
    IMAGEN_TAMANO: 'La imagen supera 5 MB',
} as const;

export const TAMANIOS: Tamanio[] = ['10', '15', '20', '30'];
export const NIVELES: Niveles[] = [1, 2, 3, 4];

// combinaciones validas tamaño → niveles maximos (D5 — ⚠️ pendiente de confirmar)
export const NIVELES_MAX: Record<Tamanio, Niveles> = {
    '10': 1,
    '15': 2,
    '20': 3,
    '30': 4,
};

export function nivelesPermitidos(tamanio: Tamanio | null): Niveles[] {
    if (!tamanio) return NIVELES;
    return NIVELES.filter((n) => n <= NIVELES_MAX[tamanio]);
}

// si al bajar el tamaño los niveles quedan invalidos, se ajustan al maximo y se avisa
export function ajustarNiveles(tamanio: Tamanio, niveles: Niveles | null): {niveles: Niveles | null; ajustado: boolean} {
    const maximo = NIVELES_MAX[tamanio];
    if (niveles !== null && niveles > maximo) {
        return {niveles: maximo, ajustado: true};
    }
    return {niveles, ajustado: false};
}

// mensaje de decoracion: se cuentan caracteres visibles (un emoji = 1) (D8)
export const MAX_MENSAJE = 500;

export function contarCaracteres(texto: string): number {
    return [...texto].length;
}

export function limitarMensaje(texto: string): string {
    const caracteres = [...texto];
    return caracteres.length > MAX_MENSAJE ? caracteres.slice(0, MAX_MENSAJE).join('') : texto;
}

// texto vacio o solo espacios se guarda como null
export function normalizarMensaje(texto: string): string | null {
    const limpio = texto.trim();
    return limpio === '' ? null : limpio;
}

// imagen de referencia (D9)
export const MAX_BYTES_IMAGEN = 5 * 1024 * 1024;

const EXTENSION_POR_MIME: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/heic': 'heic',
    'image/heif': 'heif',
};

const MIME_POR_EXTENSION: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    heic: 'image/heic',
    heif: 'image/heif',
};

function extensionDeNombre(nombre: string | null | undefined): string | null {
    const coincidencia = nombre?.toLowerCase().match(/\.([a-z0-9]+)(?:\?.*)?$/);
    return coincidencia ? coincidencia[1] : null;
}

// MIME de la imagen: el que informa el picker o, si no lo informa, por la extension
export function mimeImagen(imagen: ImagenLocal): string | null {
    const informado = imagen.mimeType?.toLowerCase();
    if (informado) return EXTENSION_POR_MIME[informado] ? informado : null;
    const extension = extensionDeNombre(imagen.fileName) ?? extensionDeNombre(imagen.uri);
    return extension ? MIME_POR_EXTENSION[extension] ?? null : null;
}

export function extensionImagen(mime: string): string {
    return EXTENSION_POR_MIME[mime] ?? 'jpg';
}

export function validarImagen(imagen: ImagenLocal): string | undefined {
    if (!mimeImagen(imagen)) return MENSAJES_PEDIDO.IMAGEN_FORMATO;
    if (imagen.fileSize && imagen.fileSize > MAX_BYTES_IMAGEN) return MENSAJES_PEDIDO.IMAGEN_TAMANO;
    return undefined;
}

// campos obligatorios de cada paso (D4); el paso 3 no tiene obligatorios
export type CampoPedido = 'tamanio' | 'niveles' | 'tipoPan' | 'relleno';

const CAMPOS_POR_PASO: Record<PasoPedido, CampoPedido[]> = {
    1: ['tamanio', 'niveles'],
    2: ['tipoPan', 'relleno'],
    3: [],
};

export function validarPaso(paso: PasoPedido, pedido: PedidoEnCurso): Partial<Record<CampoPedido, string>> {
    const errores: Partial<Record<CampoPedido, string>> = {};
    for (const campo of CAMPOS_POR_PASO[paso]) {
        if (pedido[campo] === null) errores[campo] = MENSAJES_PEDIDO.OBLIGATORIO;
    }
    return errores;
}
