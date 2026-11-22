import { SupabaseClient } from '@supabase/supabase-js';
import { BUCKET_CATALOGO, EXTENSION_POR_MIME, MENSAJES_CATALOGO, PASTELES_POR_PAGINA } from '../constants/catalogo';
import { ApiError, CODIGOS_PG, ErrorBaseDatos } from '../errors/ApiError';
import * as catalogoRepo from '../repositories/catalogo.repository';
import * as storageRepo from '../repositories/storage.repository';
import { DatosPastel, FiltrosCatalogo, PaginaCatalogo, PastelAdmin, PastelCatalogo } from '../types/catalogo.types';
import { nombreImagenCatalogo, rangoDePagina, recortarPagina, rutaDeUrlCatalogo } from '../utils/catalogo';

// capa de negocio del catalogo (F01 D6, F07 M4 y M5): paginacion, imagenes y reglas
// al guardar. No conoce HTTP ni las consultas: usa los repositorios

export async function listarCatalogo(db: SupabaseClient, filtros: FiltrosCatalogo, pagina: number): Promise<PaginaCatalogo<PastelCatalogo>> {
    const { desde, hasta } = rangoDePagina(pagina, PASTELES_POR_PAGINA);
    const filas = await catalogoRepo.listarPublicos(db, filtros, desde, hasta);
    return recortarPagina(filas, PASTELES_POR_PAGINA);
}

export async function obtenerPastel(db: SupabaseClient, id: string): Promise<PastelCatalogo> {
    const pastel = await catalogoRepo.obtenerPublico(db, id);
    if (!pastel) throw ApiError.noEncontrado(MENSAJES_CATALOGO.NO_ENCONTRADO);
    return pastel;
}

export async function listarCatalogoAdmin(db: SupabaseClient, pagina: number): Promise<PaginaCatalogo<PastelAdmin>> {
    const { desde, hasta } = rangoDePagina(pagina, PASTELES_POR_PAGINA);
    const filas = await catalogoRepo.listarTodos(db, desde, hasta);
    return recortarPagina(filas, PASTELES_POR_PAGINA);
}

export async function obtenerPastelAdmin(db: SupabaseClient, id: string): Promise<PastelAdmin> {
    const pastel = await catalogoRepo.obtenerAdmin(db, id);
    if (!pastel) throw ApiError.noEncontrado(MENSAJES_CATALOGO.NO_ENCONTRADO);
    return pastel;
}

// sube la imagen al bucket publico y devuelve su URL (M4 D3)
export async function subirImagen(db: SupabaseClient, mime: string, contenido: Buffer): Promise<string> {
    const extension = EXTENSION_POR_MIME[mime];
    if (!extension) throw ApiError.solicitudInvalida(MENSAJES_CATALOGO.IMAGEN_FORMATO);
    if (!contenido.length) throw ApiError.solicitudInvalida(MENSAJES_CATALOGO.IMAGEN_VACIA);
    try {
        return await storageRepo.subirPublico(db, BUCKET_CATALOGO, nombreImagenCatalogo(extension), contenido, mime);
    } catch (error) {
        console.warn('subirImagen:', error instanceof Error ? error.message : error);
        throw new ApiError(502, MENSAJES_CATALOGO.IMAGEN);
    }
}

// borra una imagen del bucket sin bloquear el guardado: si falla queda huerfana (M4 D4)
async function borrarImagen(db: SupabaseClient, url: string | null): Promise<void> {
    const ruta = rutaDeUrlCatalogo(url);
    if (!ruta) return;
    try {
        await storageRepo.borrar(db, BUCKET_CATALOGO, ruta);
    } catch (error) {
        console.warn('borrarImagen: no se pudo borrar', ruta, error instanceof Error ? error.message : error);
    }
}

function filaDePastel(datos: DatosPastel): catalogoRepo.FilaPastel {
    return {
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        tamanio: datos.tamanio,
        niveles: datos.niveles,
        tipo_pan: datos.tipoPan,
        relleno: datos.relleno,
        activo: datos.activo,
        imagen_url: datos.imagenUrl,
    };
}

// Crea (id null) o edita un pastel. Si se guarda, se borra la imagen anterior que ya no se usa;
// si falla, se borra la imagen nueva que no quedo en ningun pastel. El nombre repetido lo
// detecta el indice unico de 012 y se responde 409 junto al campo nombre
export async function guardarPastel(db: SupabaseClient, id: string | null, datos: DatosPastel): Promise<string> {
    const imagenAnterior = id ? (await obtenerPastelAdmin(db, id)).imagen_url : null;
    const imagenCambio = datos.imagenUrl !== imagenAnterior;
    try {
        const fila = filaDePastel(datos);
        const guardado = id ? await catalogoRepo.actualizar(db, id, fila) : await catalogoRepo.insertar(db, fila);
        if (imagenCambio) await borrarImagen(db, imagenAnterior);
        return guardado;
    } catch (error) {
        if (imagenCambio) await borrarImagen(db, datos.imagenUrl);
        if (error instanceof ErrorBaseDatos && error.codigo === CODIGOS_PG.DUPLICADO) {
            throw ApiError.conflicto(MENSAJES_CATALOGO.NOMBRE_REPETIDO, { nombre: MENSAJES_CATALOGO.NOMBRE_REPETIDO });
        }
        throw error;
    }
}
