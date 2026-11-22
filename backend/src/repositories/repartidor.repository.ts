import { SupabaseClient } from '@supabase/supabase-js';
import { MENSAJES_REPARTIDOR } from '../constants/repartidor';
import { ErrorBaseDatos } from '../errors/ApiError';
import { Niveles, Tamanio } from '../types/catalogo.types';
import { EstadoPedido } from '../types/pedido.types';
import { EntregaRepartidor, EntregaResumen } from '../types/repartidor.types';
import { armarDireccion } from '../utils/pedido';
import { COLUMNAS_ENTREGA, entregaDeFila, FilaEntrega } from './pedidos.repository';

// capa de datos del repartidor. RLS solo deja ver los pedidos asignados a el (007) y el nombre
// del cliente de sus entregas en curso (010); el trigger (011) solo le deja pasar de en_camino a
// entregado o no_entregado. No se consultan precios ni pagos

const CLIENTE = 'cliente:perfiles!pedidos_usuario_perfil_fkey(nombre)';

type Nombre = { nombre: string } | { nombre: string }[] | null;
type DetalleEntrega = { tamanio: Tamanio | null; niveles: Niveles | null };

type FilaEntregaRepartidor = Partial<FilaEntrega> & {
    id: string;
    estado: EstadoPedido;
    folio: string | null;
    cliente: Nombre;
    pedido_detalle?: DetalleEntrega | DetalleEntrega[] | null;
};

// PostgREST devuelve la relacion como objeto o como arreglo
function primero<T>(valor: T | T[] | null | undefined): T | null {
    return Array.isArray(valor) ? valor[0] ?? null : valor ?? null;
}

function nombreDe(valor: Nombre): string {
    return primero(valor)?.nombre.trim() || MENSAJES_REPARTIDOR.SIN_NOMBRE;
}

function lanzarSiError(error: { message: string; code?: string } | null): void {
    if (error) throw new ErrorBaseDatos(error.message, error.code);
}

function resumenDeFila(fila: FilaEntregaRepartidor): EntregaResumen {
    const entrega = entregaDeFila(fila);
    return {
        id: fila.id,
        folio: fila.folio,
        cliente: nombreDe(fila.cliente),
        fechaEntrega: entrega.fechaEntrega,
        horaEntrega: entrega.horaEntrega,
        direccion: armarDireccion(entrega.calle, entrega.numeroExterior, entrega.numeroInterior, entrega.colonia),
    };
}

// pedidos en camino asignados al repartidor, de la entrega mas proxima a la mas lejana
export async function listarEnCamino(db: SupabaseClient): Promise<EntregaResumen[]> {
    const { data, error } = await db.from('pedidos')
        .select(`id, estado, folio, calle, numero_exterior, numero_interior, colonia, fecha_entrega, hora_entrega, ${CLIENTE}`)
        .eq('estado', 'en_camino')
        .order('fecha_entrega', { ascending: true })
        .order('hora_entrega', { ascending: true })
        .order('id');
    lanzarSiError(error);
    return ((data ?? []) as FilaEntregaRepartidor[]).map(resumenDeFila);
}

// detalle para ubicar la entrega: direccion, coordenadas, horario y que pastel lleva
export async function obtenerEntrega(db: SupabaseClient, id: string): Promise<EntregaRepartidor | null> {
    const { data, error } = await db.from('pedidos')
        .select(`id, estado, folio, ${COLUMNAS_ENTREGA}, ${CLIENTE}, pedido_detalle(tamanio, niveles)`)
        .eq('id', id)
        .maybeSingle<FilaEntregaRepartidor>();
    lanzarSiError(error);
    if (!data) return null;
    const detalle = primero(data.pedido_detalle);
    return {
        id: data.id,
        estado: data.estado,
        folio: data.folio,
        cliente: nombreDe(data.cliente),
        tamanio: detalle?.tamanio ?? null,
        niveles: detalle?.niveles ?? null,
        entrega: entregaDeFila(data),
    };
}

export type CierreEntrega = { estado: 'entregado' } | { estado: 'no_entregado'; motivo_no_entrega: string };

// solo aplica si el pedido sigue en camino; false si ya no lo estaba
export async function cerrarEntrega(db: SupabaseClient, id: string, cambios: CierreEntrega): Promise<boolean> {
    const { data, error } = await db.from('pedidos').update(cambios).eq('id', id).eq('estado', 'en_camino').select('id');
    lanzarSiError(error);
    return (data ?? []).length > 0;
}
