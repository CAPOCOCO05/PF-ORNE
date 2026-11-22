import { SupabaseClient } from '@supabase/supabase-js';
import { ErrorBaseDatos } from '../errors/ApiError';
import { Niveles, RellenoId, SaborPanId, Tamanio } from '../types/catalogo.types';
import {
    Borrador, Confirmacion, DatosEntrega, EstadoPedido, HoraBloque, PasoPedido, PedidoCompleto, ResumenPedido, TipoEntrega,
} from '../types/pedido.types';
import { armarDireccion } from '../utils/pedido';

// capa de datos de pedidos: tablas pedidos y pedido_detalle y la funcion confirmar_pedido (008).
// RLS (002, 006, 007) solo deja al cliente ver y editar sus pedidos, y editar o borrar solo borradores

// ---------------------------------------------------------------------------
// conversion entre filas (snake_case) y los objetos de la API

export interface FilaEntrega {
    tipo_entrega: TipoEntrega | null;
    calle: string | null;
    numero_exterior: string | null;
    numero_interior: string | null;
    colonia: string | null;
    direccion: string | null;
    direccion_referencia: string | null;
    direccion_lat: number | string | null;
    direccion_lng: number | string | null;
    telefono_contacto: string | null;
    fecha_entrega: string | null;
    hora_entrega: string | null;   // tipo time: llega como '10:00:00'
}

interface FilaDetalle {
    tamanio: Tamanio | null;
    niveles: Niveles | null;
    tipo_pan: SaborPanId | null;
    relleno: RellenoId | null;
    decoracion_texto?: string | null;
    imagen_referencia_url?: string | null;
}

export interface FilaPedido extends Partial<FilaEntrega> {
    id: string;
    estado: EstadoPedido;
    folio: string | null;
    total: number | string;
    paso_actual: PasoPedido;
    created_at: string;
    motivo_no_entrega?: string | null;
    pedido_detalle: FilaDetalle | FilaDetalle[] | null;
}

export const COLUMNAS_ENTREGA = 'tipo_entrega, calle, numero_exterior, numero_interior, colonia, direccion, direccion_referencia, '
    + 'direccion_lat, direccion_lng, telefono_contacto, fecha_entrega, hora_entrega';

const DETALLE_COMPLETO = 'pedido_detalle(tamanio, niveles, tipo_pan, relleno, decoracion_texto, imagen_referencia_url)';

// columnas de un pedido completo; tambien las usa el panel admin (F04)
export const COLUMNAS_PEDIDO_COMPLETO = `id, estado, folio, total, paso_actual, created_at, motivo_no_entrega, ${COLUMNAS_ENTREGA}, ${DETALLE_COMPLETO}`;

function textoONulo(texto: string): string | null {
    const limpio = texto.trim();
    return limpio === '' ? null : limpio;
}

// en recoleccion se limpian la direccion y las coordenadas (F02 D8)
export function filaDeEntrega(entrega: DatosEntrega): FilaEntrega {
    const domicilio = entrega.tipoEntrega === 'domicilio';
    return {
        tipo_entrega: entrega.tipoEntrega,
        calle: domicilio ? textoONulo(entrega.calle) : null,
        numero_exterior: domicilio ? textoONulo(entrega.numeroExterior) : null,
        numero_interior: domicilio ? textoONulo(entrega.numeroInterior) : null,
        colonia: domicilio ? textoONulo(entrega.colonia) : null,
        direccion: domicilio ? armarDireccion(entrega.calle, entrega.numeroExterior, entrega.numeroInterior, entrega.colonia) : null,
        direccion_referencia: domicilio ? textoONulo(entrega.referencia) : null,
        direccion_lat: domicilio ? entrega.ubicacion?.latitud ?? null : null,
        direccion_lng: domicilio ? entrega.ubicacion?.longitud ?? null : null,
        telefono_contacto: textoONulo(entrega.telefono),
        fecha_entrega: entrega.fechaEntrega,
        hora_entrega: entrega.horaEntrega,
    };
}

// las columnas que falten (borrador de F01) quedan vacias
export function entregaDeFila(fila: Partial<FilaEntrega>): DatosEntrega {
    const tieneUbicacion = fila.direccion_lat != null && fila.direccion_lng != null;
    return {
        tipoEntrega: fila.tipo_entrega ?? null,
        calle: fila.calle ?? '',
        numeroExterior: fila.numero_exterior ?? '',
        numeroInterior: fila.numero_interior ?? '',
        colonia: fila.colonia ?? '',
        referencia: fila.direccion_referencia ?? '',
        telefono: fila.telefono_contacto ?? '',
        ubicacion: tieneUbicacion ? { latitud: Number(fila.direccion_lat), longitud: Number(fila.direccion_lng) } : null,
        fechaEntrega: fila.fecha_entrega ?? null,
        horaEntrega: fila.hora_entrega ? fila.hora_entrega.slice(0, 5) as HoraBloque : null,
    };
}

// PostgREST devuelve el detalle como objeto (relacion 1 a 1) o como arreglo
function detalleDe(fila: FilaPedido): FilaDetalle | null {
    const detalle = fila.pedido_detalle;
    return Array.isArray(detalle) ? detalle[0] ?? null : detalle;
}

export function pedidoCompletoDeFila(fila: FilaPedido): PedidoCompleto {
    const detalle = detalleDe(fila);
    return {
        id: fila.id,
        estado: fila.estado,
        folio: fila.folio,
        total: Number(fila.total),
        creadoEn: fila.created_at,
        tamanio: detalle?.tamanio ?? null,
        niveles: detalle?.niveles ?? null,
        tipoPan: detalle?.tipo_pan ?? null,
        relleno: detalle?.relleno ?? null,
        mensaje: detalle?.decoracion_texto ?? '',
        imagenRuta: detalle?.imagen_referencia_url ?? null,
        entrega: entregaDeFila(fila),
        motivoNoEntrega: fila.motivo_no_entrega ?? null,
    };
}

function borradorDeFila(fila: FilaPedido): Borrador {
    const { id, tamanio, niveles, tipoPan, relleno, mensaje, imagenRuta, entrega } = pedidoCompletoDeFila(fila);
    return { id, tamanio, niveles, tipoPan, relleno, mensaje, imagenRuta, entrega, pasoActual: fila.paso_actual };
}

function resumenDeFila(fila: FilaPedido): ResumenPedido {
    const detalle = detalleDe(fila);
    return {
        id: fila.id,
        estado: fila.estado,
        folio: fila.folio,
        total: Number(fila.total),
        pasoActual: fila.paso_actual,
        creadoEn: fila.created_at,
        tamanio: detalle?.tamanio ?? null,
        niveles: detalle?.niveles ?? null,
        tipoPan: detalle?.tipo_pan ?? null,
        relleno: detalle?.relleno ?? null,
    };
}

function lanzarSiError(error: { message: string; code?: string } | null): void {
    if (error) throw new ErrorBaseDatos(error.message, error.code);
}

// ---------------------------------------------------------------------------
// consultas

// todos los pedidos del cliente, incluidos borradores, del mas reciente al mas antiguo
export async function listarDelUsuario(db: SupabaseClient, usuarioId: string): Promise<ResumenPedido[]> {
    const { data, error } = await db.from('pedidos')
        .select('id, estado, folio, total, paso_actual, created_at, pedido_detalle(tamanio, niveles, tipo_pan, relleno)')
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false });
    lanzarSiError(error);
    return ((data ?? []) as FilaPedido[]).map(resumenDeFila);
}

// pedido en cualquier estado; null si no existe o RLS no deja verlo
export async function obtenerCompleto(db: SupabaseClient, id: string): Promise<PedidoCompleto | null> {
    const { data, error } = await db.from('pedidos').select(COLUMNAS_PEDIDO_COMPLETO).eq('id', id).maybeSingle<FilaPedido>();
    lanzarSiError(error);
    return data ? pedidoCompletoDeFila(data) : null;
}

export async function obtenerBorrador(db: SupabaseClient, id: string): Promise<Borrador | null> {
    const { data, error } = await db.from('pedidos').select(COLUMNAS_PEDIDO_COMPLETO)
        .eq('id', id).eq('estado', 'borrador').maybeSingle<FilaPedido>();
    lanzarSiError(error);
    return data ? borradorDeFila(data) : null;
}

export type EncabezadoBorrador = { total: number; paso_actual: PasoPedido } & Partial<FilaEntrega>;

export async function insertarBorrador(db: SupabaseClient, usuarioId: string, encabezado: EncabezadoBorrador): Promise<string> {
    const { data, error } = await db.from('pedidos')
        .insert({ usuario_id: usuarioId, estado: 'borrador', ...encabezado })
        .select('id').single<{ id: string }>();
    lanzarSiError(error);
    return data!.id;
}

// false si no se actualizo ninguna fila (no existe, no es borrador o no es del usuario)
export async function actualizarBorrador(db: SupabaseClient, id: string, encabezado: EncabezadoBorrador): Promise<boolean> {
    const { data, error } = await db.from('pedidos').update(encabezado).eq('id', id).eq('estado', 'borrador').select('id');
    lanzarSiError(error);
    return (data ?? []).length > 0;
}

export interface FilaDetalleBorrador {
    tamanio: Tamanio | null;
    niveles: Niveles | null;
    tipo_pan: SaborPanId | null;
    relleno: RellenoId | null;
    decoracion_texto: string | null;
    precio_estimado: number;
}

// crea o actualiza el detalle; la imagen no se toca aqui (ver actualizarImagen)
export async function guardarDetalle(db: SupabaseClient, pedidoId: string, detalle: FilaDetalleBorrador): Promise<void> {
    const { error } = await db.from('pedido_detalle').upsert({ pedido_id: pedidoId, ...detalle }, { onConflict: 'pedido_id' });
    lanzarSiError(error);
}

export async function actualizarImagen(db: SupabaseClient, pedidoId: string, ruta: string | null): Promise<void> {
    const { error } = await db.from('pedido_detalle').update({ imagen_referencia_url: ruta }).eq('pedido_id', pedidoId);
    lanzarSiError(error);
}

// el detalle se borra en cascada (D2); false si no habia borrador que borrar
export async function eliminarBorrador(db: SupabaseClient, id: string): Promise<boolean> {
    const { data, error } = await db.from('pedidos').delete().eq('id', id).eq('estado', 'borrador').select('id');
    lanzarSiError(error);
    return (data ?? []).length > 0;
}

// pasa el borrador a 'pendiente': recalcula el precio, genera el folio y el pago (008, 016)
export async function confirmar(db: SupabaseClient, id: string): Promise<Confirmacion | null> {
    const { data, error } = await db.rpc('confirmar_pedido', { p_pedido_id: id });
    lanzarSiError(error);
    // la funcion devuelve una tabla de un renglon
    const fila = (Array.isArray(data) ? data[0] : data) as { folio: string; total: number | string } | undefined;
    return fila ? { folio: fila.folio, total: Number(fila.total) } : null;
}
