import { BUCKET_CATALOGO } from '../constants/catalogo';

// funciones puras del catalogo, sin acceso a datos

// pagina empieza en 0; se pide un registro de mas para saber si hay otra pagina sin contar aparte
export function rangoDePagina(pagina: number, porPagina: number): { desde: number; hasta: number } {
    const desde = pagina * porPagina;
    return { desde, hasta: desde + porPagina };
}

export function recortarPagina<T>(filas: T[], porPagina: number): { pasteles: T[]; hayMas: boolean } {
    return { pasteles: filas.slice(0, porPagina), hayMas: filas.length > porPagina };
}

// nombre del archivo en el bucket: unico en cada subida para no mostrar imagenes viejas en cache (M4 D3)
export function nombreImagenCatalogo(extension: string, ahora: number = Date.now(), aleatorio: number = Math.random()): string {
    return `pastel-${ahora}-${aleatorio.toString(36).slice(2, 8)}.${extension}`;
}

// ruta dentro del bucket del catalogo de una URL publica; null si la imagen no es de ese bucket
export function rutaDeUrlCatalogo(url: string | null): string | null {
    const marca = `/storage/v1/object/public/${BUCKET_CATALOGO}/`;
    const indice = url?.indexOf(marca) ?? -1;
    if (!url || indice < 0) return null;
    return decodeURIComponent(url.slice(indice + marca.length).split('?')[0]) || null;
}
