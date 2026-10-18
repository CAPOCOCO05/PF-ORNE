import { supabase } from "./supabase";
import { traducirErrorDatos } from "./erroresDatos";
import { PastelCatalogo } from "../types/pedido.types";

// catalogo base de pasteles (F01, D6)

export const PASTELES_POR_PAGINA = 10;

const COLUMNAS = 'id, nombre, descripcion, imagen_url, precio_base, tamanio, niveles, tipo_pan, relleno';

interface PaginaCatalogo {
    pasteles: PastelCatalogo[];
    hayMas: boolean;
    error: string | null;
}

// pagina empieza en 0; se pide un registro de mas para saber si hay otra pagina
// sin hacer un conteo aparte. RLS ya filtra activo = true para el cliente
export async function listarCatalogo(pagina: number, porPagina: number = PASTELES_POR_PAGINA): Promise<PaginaCatalogo> {
    const desde = pagina * porPagina;
    const {data, error} = await supabase
        .from('catalogo_pasteles')
        .select(COLUMNAS)
        .eq('activo', true)
        .order('nombre')
        .range(desde, desde + porPagina);
    if (error) {
        return {pasteles: [], hayMas: false, error: traducirErrorDatos(error)};
    }
    const filas = (data ?? []) as PastelCatalogo[];
    return {pasteles: filas.slice(0, porPagina), hayMas: filas.length > porPagina, error: null};
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
