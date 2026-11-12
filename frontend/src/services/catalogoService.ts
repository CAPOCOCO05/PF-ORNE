import { supabase } from "./supabase";
import { traducirErrorDatos } from "./erroresDatos";
import { FILTROS_VACIOS, RANGOS_PRECIO } from "../constants/filtrosCatalogo";
import { FiltrosCatalogo, FormularioPastel, ImagenLocal, OrdenCatalogo, PastelAdmin, PastelCatalogo } from "../types/pedido.types";
import { MENSAJES_CATALOGO, nombreImagenCatalogo, rutaDeUrlCatalogo } from "../utils/catalogo";
import { extensionImagen, MENSAJES_PEDIDO, mimeImagen } from "../utils/pedido";

// catalogo base de pasteles (F01, D6)

export const PASTELES_POR_PAGINA = 10;

const COLUMNAS = 'id, nombre, descripcion, imagen_url, precio_base, tamanio, niveles, tipo_pan, relleno';

interface PaginaCatalogo {
    pasteles: PastelCatalogo[];
    hayMas: boolean;
    error: string | null;
}

// pagina empieza en 0; se pide un registro de mas para saber si hay otra pagina
// sin hacer un conteo aparte. RLS ya filtra activo = true para el cliente.
// Los filtros se aplican en el servidor (M5 D1) y la paginacion de 10 en 10 se mantiene
export async function listarCatalogo(
    pagina: number,
    filtros: FiltrosCatalogo = FILTROS_VACIOS,
    porPagina: number = PASTELES_POR_PAGINA,
): Promise<PaginaCatalogo> {
    const desde = pagina * porPagina;
    const {data, error} = await ordenarCatalogo(filtrarCatalogo(consultaCatalogo(), filtros), filtros.orden)
        .range(desde, desde + porPagina);
    if (error) {
        return {pasteles: [], hayMas: false, error: traducirErrorDatos(error)};
    }
    const filas = ((data ?? []) as PastelCatalogo[]).map((fila) => ({...fila, precio_base: Number(fila.precio_base)}));
    return {pasteles: filas.slice(0, porPagina), hayMas: filas.length > porPagina, error: null};
}

function consultaCatalogo() {
    return supabase.from('catalogo_pasteles').select(COLUMNAS).eq('activo', true);
}

// consulta de supabase-js en la que se pueden encadenar filtros y orden
type ConsultaCatalogo = ReturnType<typeof consultaCatalogo>;

// dentro de una seccion las opciones se suman con .in(); entre secciones se acotan (D3)
function filtrarCatalogo(consulta: ConsultaCatalogo, filtros: FiltrosCatalogo): ConsultaCatalogo {
    let filtrada = consulta;
    const rango = RANGOS_PRECIO.find((r) => r.id === filtros.precio);
    if (rango?.mayorQue !== undefined) filtrada = filtrada.gt('precio_base', rango.mayorQue);
    if (rango?.hasta !== undefined) filtrada = filtrada.lte('precio_base', rango.hasta);
    if (filtros.panes.length) filtrada = filtrada.in('tipo_pan', filtros.panes);
    if (filtros.rellenos.length) filtrada = filtrada.in('relleno', filtros.rellenos);
    if (filtros.tamanios.length) filtrada = filtrada.in('tamanio', filtros.tamanios);
    if (filtros.niveles.length) filtrada = filtrada.in('niveles', filtros.niveles);
    return filtrada;
}

// nombre e id como desempate para que la paginacion no repita ni salte pasteles (D5)
function ordenarCatalogo(consulta: ConsultaCatalogo, orden: OrdenCatalogo): ConsultaCatalogo {
    const porPrecio = orden === 'nombre' ? consulta : consulta.order('precio_base', {ascending: orden === 'precioAsc'});
    return porPrecio.order('nombre').order('id');
}

// para precargar el wizard al presionar "Pedir" en una tarjeta
export async function obtenerPastel(id: string): Promise<{pastel: PastelCatalogo | null; error: string | null}> {
    const {data, error} = await supabase
        .from('catalogo_pasteles')
        .select(COLUMNAS)
        .eq('id', id)
        .maybeSingle<PastelCatalogo>();
    if (error) {
        return {pastel: null, error: traducirErrorDatos(error)};
    }
    return {pastel: data, error: null};
}

// ---------------------------------------------------------------------------
// admin (F07 M4): todos los pasteles, alta, edicion e imagenes. RLS (012) solo
// deja crear, editar y subir imagenes al admin

const BUCKET_CATALOGO = 'catalogo';
const COLUMNAS_ADMIN = `${COLUMNAS}, activo`;
const CODIGO_DUPLICADO = '23505';   // unique_violation: nombre repetido (indice de 012)

interface PaginaCatalogoAdmin {
    pasteles: PastelAdmin[];
    hayMas: boolean;
    error: string | null;
}

// publicados y ocultos, de 10 en 10 por nombre (D5); id como desempate estable
export async function listarCatalogoAdmin(pagina: number, porPagina: number = PASTELES_POR_PAGINA): Promise<PaginaCatalogoAdmin> {
    const desde = pagina * porPagina;
    const {data, error} = await supabase
        .from('catalogo_pasteles')
        .select(COLUMNAS_ADMIN)
        .order('nombre')
        .order('id')
        .range(desde, desde + porPagina);
    if (error) return {pasteles: [], hayMas: false, error: traducirErrorDatos(error)};
    const filas = ((data ?? []) as PastelAdmin[]).map((fila) => ({...fila, precio_base: Number(fila.precio_base)}));
    return {pasteles: filas.slice(0, porPagina), hayMas: filas.length > porPagina, error: null};
}

export async function obtenerPastelAdmin(id: string): Promise<{pastel: PastelAdmin | null; error: string | null}> {
    const {data, error} = await supabase
        .from('catalogo_pasteles')
        .select(COLUMNAS_ADMIN)
        .eq('id', id)
        .maybeSingle<PastelAdmin>();
    if (error) return {pastel: null, error: traducirErrorDatos(error)};
    return {pastel: data ? {...data, precio_base: Number(data.precio_base)} : null, error: null};
}

// sube la imagen al bucket publico y devuelve su URL publica (D3)
export async function subirImagenCatalogo(imagen: ImagenLocal): Promise<{url: string | null; error: string | null}> {
    const mime = mimeImagen(imagen);
    if (!mime) return {url: null, error: MENSAJES_PEDIDO.IMAGEN_FORMATO};
    const ruta = nombreImagenCatalogo(extensionImagen(mime));
    try {
        const respuesta = await fetch(imagen.uri);
        const contenido = await respuesta.arrayBuffer();
        const bucket = supabase.storage.from(BUCKET_CATALOGO);
        const {error} = await bucket.upload(ruta, contenido, {contentType: mime});
        if (error) {
            console.warn('subirImagenCatalogo:', error.message);
            return {url: null, error: MENSAJES_CATALOGO.IMAGEN};
        }
        return {url: bucket.getPublicUrl(ruta).data.publicUrl, error: null};
    } catch (e) {
        console.warn('subirImagenCatalogo:', e);
        return {url: null, error: MENSAJES_CATALOGO.IMAGEN};
    }
}

// borra una imagen del bucket sin bloquear el guardado: si falla queda huerfana (D4)
async function borrarImagenCatalogo(url: string | null): Promise<void> {
    const ruta = rutaDeUrlCatalogo(url);
    if (!ruta) return;
    const {error} = await supabase.storage.from(BUCKET_CATALOGO).remove([ruta]);
    if (error) console.warn('borrarImagenCatalogo: no se pudo borrar', ruta, error.message);
}

export interface ResultadoGuardarPastel {
    id: string | null;
    error: string | null;           // error general (red, imagen): dialogo con "Reintentar"
    errorNombre: string | null;     // nombre repetido: junto al campo
}

// sube la imagen nueva (si hay) y luego guarda el pastel; si la subida falla no se
// guarda nada (M4, casos de error). precio_base lo pone el trigger de 012
export async function guardarPastel(id: string | null, formulario: FormularioPastel): Promise<ResultadoGuardarPastel> {
    let imagenUrl = formulario.imagenUrl;
    if (formulario.imagenLocal) {
        const subida = await subirImagenCatalogo(formulario.imagenLocal);
        if (subida.error) return {id, error: subida.error, errorNombre: null};
        imagenUrl = subida.url;
    }

    const fila = {
        nombre: formulario.nombre.trim().replace(/\s+/g, ' '),
        descripcion: formulario.descripcion.trim() || null,
        tamanio: formulario.tamanio,
        niveles: formulario.niveles,
        tipo_pan: formulario.tipoPan,
        relleno: formulario.relleno,
        activo: formulario.activo,
        imagen_url: imagenUrl,
    };
    const consulta = id
        ? supabase.from('catalogo_pasteles').update(fila).eq('id', id)
        : supabase.from('catalogo_pasteles').insert(fila);
    const {data, error} = await consulta.select('id').single<{id: string}>();

    if (error) {
        // la imagen recien subida no quedo en ningun pastel
        if (imagenUrl !== formulario.imagenUrl) await borrarImagenCatalogo(imagenUrl);
        if (error.code === CODIGO_DUPLICADO) return {id, error: null, errorNombre: MENSAJES_CATALOGO.NOMBRE_REPETIDO};
        return {id, error: traducirErrorDatos(error), errorNombre: null};
    }
    if (imagenUrl !== formulario.imagenUrl) await borrarImagenCatalogo(formulario.imagenUrl);
    return {id: data.id, error: null, errorNombre: null};
}
