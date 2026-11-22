import { peticionApi } from "./api";
import { MENSAJES_DATOS, mensajeDeExcepcion } from "./erroresDatos";
import { FILTROS_VACIOS } from "../constants/filtrosCatalogo";
import { FiltrosCatalogo, FormularioPastel, ImagenLocal, PastelAdmin, PastelCatalogo } from "../types/pedido.types";
import { MENSAJES_CATALOGO } from "../utils/catalogo";
import { MENSAJES_PEDIDO, mimeImagen } from "../utils/pedido";

// catalogo base de pasteles (F01, D6). Los datos, filtros, paginacion de 10 en 10 e
// imagenes los maneja la API (backend/src/.../catalogo); aqui solo se hacen las peticiones

interface PaginaCatalogo {
    pasteles: PastelCatalogo[];
    hayMas: boolean;
    error: string | null;
}

// pagina empieza en 0. Los filtros se aplican en el servidor (M5 D1)
export async function listarCatalogo(pagina: number, filtros: FiltrosCatalogo = FILTROS_VACIOS): Promise<PaginaCatalogo> {
    const {data, error} = await peticionApi<{pasteles: PastelCatalogo[]; hayMas: boolean}>('/catalogo', {
        query: {
            pagina, precio: filtros.precio, panes: filtros.panes, rellenos: filtros.rellenos,
            tamanios: filtros.tamanios, niveles: filtros.niveles, orden: filtros.orden,
        },
    });
    if (error || !data) return {pasteles: [], hayMas: false, error: error ?? MENSAJES_DATOS.GENERICO};
    return {pasteles: data.pasteles, hayMas: data.hayMas, error: null};
}

// para precargar el wizard al presionar "Pedir" en una tarjeta; null si ya no existe
export async function obtenerPastel(id: string): Promise<{pastel: PastelCatalogo | null; error: string | null}> {
    const {data, error, status} = await peticionApi<{pastel: PastelCatalogo}>(`/catalogo/${encodeURIComponent(id)}`);
    if (status === 404) return {pastel: null, error: null};
    if (error || !data) return {pastel: null, error};
    return {pastel: data.pastel, error: null};
}

// ---------------------------------------------------------------------------
// admin (F07 M4): todos los pasteles, alta, edicion e imagenes. La API solo deja
// entrar al admin y RLS (012) lo vuelve a comprobar en la base

interface PaginaCatalogoAdmin {
    pasteles: PastelAdmin[];
    hayMas: boolean;
    error: string | null;
}

// publicados y ocultos, de 10 en 10 por nombre (D5)
export async function listarCatalogoAdmin(pagina: number): Promise<PaginaCatalogoAdmin> {
    const {data, error} = await peticionApi<{pasteles: PastelAdmin[]; hayMas: boolean}>('/admin/catalogo', {query: {pagina}});
    if (error || !data) return {pasteles: [], hayMas: false, error};
    return {pasteles: data.pasteles, hayMas: data.hayMas, error: null};
}

export async function obtenerPastelAdmin(id: string): Promise<{pastel: PastelAdmin | null; error: string | null}> {
    const {data, error, status} = await peticionApi<{pastel: PastelAdmin}>(`/admin/catalogo/${encodeURIComponent(id)}`);
    if (status === 404) return {pastel: null, error: null};
    if (error || !data) return {pastel: null, error};
    return {pastel: data.pastel, error: null};
}

// lee la imagen elegida en el celular y la manda a la API, que la sube al bucket publico (D3)
export async function subirImagenCatalogo(imagen: ImagenLocal): Promise<{url: string | null; error: string | null}> {
    const mime = mimeImagen(imagen);
    if (!mime) return {url: null, error: MENSAJES_PEDIDO.IMAGEN_FORMATO};
    let contenido: ArrayBuffer;
    try {
        contenido = await (await fetch(imagen.uri)).arrayBuffer();
    } catch (e) {
        console.warn('subirImagenCatalogo: no se pudo leer la imagen', e);
        return {url: null, error: mensajeDeExcepcion(e, MENSAJES_CATALOGO.IMAGEN)};
    }
    const {data, error} = await peticionApi<{url: string}>('/admin/catalogo/imagenes', {metodo: 'POST', archivo: {contenido, mime}});
    if (error || !data) return {url: null, error: error ?? MENSAJES_CATALOGO.IMAGEN};
    return {url: data.url, error: null};
}

export interface ResultadoGuardarPastel {
    id: string | null;
    error: string | null;           // error general (red, imagen): dialogo con "Reintentar"
    errorNombre: string | null;     // nombre repetido: junto al campo
}

// sube la imagen nueva (si hay) y luego guarda el pastel; si la subida falla no se
// guarda nada (M4, casos de error). La API normaliza el nombre, borra las imagenes que
// quedan sin usar y la base calcula precio_base (012)
export async function guardarPastel(id: string | null, formulario: FormularioPastel): Promise<ResultadoGuardarPastel> {
    let imagenUrl = formulario.imagenUrl;
    if (formulario.imagenLocal) {
        const subida = await subirImagenCatalogo(formulario.imagenLocal);
        if (subida.error) return {id, error: subida.error, errorNombre: null};
        imagenUrl = subida.url;
    }

    const {imagenLocal: _imagenLocal, ...datos} = formulario;
    const {data, error, status, detalles} = await peticionApi<{id: string}>(
        id ? `/admin/catalogo/${encodeURIComponent(id)}` : '/admin/catalogo',
        {metodo: id ? 'PUT' : 'POST', cuerpo: {...datos, imagenUrl}},
    );
    if (status === 409 && detalles?.nombre) return {id, error: null, errorNombre: detalles.nombre};
    if (error || !data) return {id, error, errorNombre: null};
    return {id: data.id, error: null, errorNombre: null};
}
