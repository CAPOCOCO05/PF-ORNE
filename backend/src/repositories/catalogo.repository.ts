import { SupabaseClient } from '@supabase/supabase-js';
import { RANGOS_PRECIO } from '../constants/catalogo';
import { ErrorBaseDatos } from '../errors/ApiError';
import { FiltrosCatalogo, OrdenCatalogo, PastelAdmin, PastelCatalogo } from '../types/catalogo.types';

// capa de datos del catalogo: solo consultas a la tabla catalogo_pasteles.
// RLS (005, 012, 015) filtra activo = true para cliente y visitante, y solo deja escribir al admin

const TABLA = 'catalogo_pasteles';
const COLUMNAS = 'id, nombre, descripcion, imagen_url, precio_base, tamanio, niveles, tipo_pan, relleno';
const COLUMNAS_ADMIN = `${COLUMNAS}, activo`;

// fila tal como se guarda: snake_case y sin id
export interface FilaPastel {
    nombre: string;
    descripcion: string | null;
    tamanio: string;
    niveles: number;
    tipo_pan: string;
    relleno: string;
    activo: boolean;
    imagen_url: string | null;
}

// precio_base es numeric: PostgREST lo puede mandar como texto
function conPrecioNumerico<T extends { precio_base: number | string }>(fila: T): T {
    return { ...fila, precio_base: Number(fila.precio_base) };
}

function lanzarSiError(error: { message: string; code?: string } | null): void {
    if (error) throw new ErrorBaseDatos(error.message, error.code);
}

function consultaPublica(db: SupabaseClient) {
    return db.from(TABLA).select(COLUMNAS).eq('activo', true);
}

type ConsultaCatalogo = ReturnType<typeof consultaPublica>;

// dentro de una seccion las opciones se suman con .in(); entre secciones se acotan (M5 D3)
function aplicarFiltros(consulta: ConsultaCatalogo, filtros: FiltrosCatalogo): ConsultaCatalogo {
    let filtrada = consulta;
    const rango = filtros.precio ? RANGOS_PRECIO[filtros.precio] : undefined;
    if (rango?.mayorQue !== undefined) filtrada = filtrada.gt('precio_base', rango.mayorQue);
    if (rango?.hasta !== undefined) filtrada = filtrada.lte('precio_base', rango.hasta);
    if (filtros.panes.length) filtrada = filtrada.in('tipo_pan', filtros.panes);
    if (filtros.rellenos.length) filtrada = filtrada.in('relleno', filtros.rellenos);
    if (filtros.tamanios.length) filtrada = filtrada.in('tamanio', filtros.tamanios);
    if (filtros.niveles.length) filtrada = filtrada.in('niveles', filtros.niveles);
    return filtrada;
}

// nombre e id como desempate para que la paginacion no repita ni salte pasteles (M5 D5)
function aplicarOrden(consulta: ConsultaCatalogo, orden: OrdenCatalogo): ConsultaCatalogo {
    const porPrecio = orden === 'nombre' ? consulta : consulta.order('precio_base', { ascending: orden === 'precioAsc' });
    return porPrecio.order('nombre').order('id');
}

// filas desde..hasta (inclusivo), con filtros y orden
export async function listarPublicos(db: SupabaseClient, filtros: FiltrosCatalogo, desde: number, hasta: number): Promise<PastelCatalogo[]> {
    const { data, error } = await aplicarOrden(aplicarFiltros(consultaPublica(db), filtros), filtros.orden).range(desde, hasta);
    lanzarSiError(error);
    return ((data ?? []) as PastelCatalogo[]).map(conPrecioNumerico);
}

export async function obtenerPublico(db: SupabaseClient, id: string): Promise<PastelCatalogo | null> {
    const { data, error } = await db.from(TABLA).select(COLUMNAS).eq('id', id).maybeSingle<PastelCatalogo>();
    lanzarSiError(error);
    return data ? conPrecioNumerico(data) : null;
}

// publicados y ocultos, por nombre (M4 D5)
export async function listarTodos(db: SupabaseClient, desde: number, hasta: number): Promise<PastelAdmin[]> {
    const { data, error } = await db.from(TABLA).select(COLUMNAS_ADMIN).order('nombre').order('id').range(desde, hasta);
    lanzarSiError(error);
    return ((data ?? []) as PastelAdmin[]).map(conPrecioNumerico);
}

export async function obtenerAdmin(db: SupabaseClient, id: string): Promise<PastelAdmin | null> {
    const { data, error } = await db.from(TABLA).select(COLUMNAS_ADMIN).eq('id', id).maybeSingle<PastelAdmin>();
    lanzarSiError(error);
    return data ? conPrecioNumerico(data) : null;
}

export async function insertar(db: SupabaseClient, fila: FilaPastel): Promise<string> {
    const { data, error } = await db.from(TABLA).insert(fila).select('id').single<{ id: string }>();
    lanzarSiError(error);
    return data!.id;
}

export async function actualizar(db: SupabaseClient, id: string, fila: FilaPastel): Promise<string> {
    const { data, error } = await db.from(TABLA).update(fila).eq('id', id).select('id').single<{ id: string }>();
    lanzarSiError(error);
    return data!.id;
}
