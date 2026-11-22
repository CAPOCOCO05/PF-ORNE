import { SupabaseClient } from '@supabase/supabase-js';
import { MENSAJES_ADMIN } from '../constants/admin';
import { ErrorBaseDatos } from '../errors/ApiError';
import { PagoPedido, PedidoAdmin, PedidoAdminResumen, Repartidor } from '../types/admin.types';
import { EstadoPedido, HoraBloque, TipoEntrega } from '../types/pedido.types';
import { COLUMNAS_PEDIDO_COMPLETO, FilaPedido, pedidoCompletoDeFila } from './pedidos.repository';

// capa de datos del panel admin (F04). RLS (007) solo deja al admin ver todos los pedidos y
// cambiarlos; el trigger validar_cambio_pedido (011) valida cada transicion

// nombre del cliente y del repartidor desde perfiles; hay dos FK de pedidos a perfiles (007)
const CLIENTE = 'cliente:perfiles!pedidos_usuario_perfil_fkey(nombre)';
const REPARTIDOR = 'repartidor:perfiles!pedidos_repartidor_id_fkey(nombre)';

type Nombre = { nombre: string } | { nombre: string }[] | null;

interface FilaResumenAdmin {
    id: string;
    estado: EstadoPedido;
    folio: string | null;
    total: number | string;
    tipo_entrega: TipoEntrega | null;
    fecha_entrega: string | null;
    hora_entrega: string | null;
    cliente: Nombre;
}

interface FilaPago {
    metodo_pago: string;
    monto: number | string;
    estado_pago: PagoPedido['estado'];
}

type FilaPedidoAdmin = FilaPedido & { cliente: Nombre; repartidor: Nombre; pagos: FilaPago | FilaPago[] | null };

// PostgREST devuelve la relacion como objeto o como arreglo
function primero<T>(valor: T | T[] | null | undefined): T | null {
    return Array.isArray(valor) ? valor[0] ?? null : valor ?? null;
}

function nombreDe(valor: Nombre): string {
    return primero(valor)?.nombre.trim() || MENSAJES_ADMIN.SIN_NOMBRE;
}

function lanzarSiError(error: { message: string; code?: string } | null): void {
    if (error) throw new ErrorBaseDatos(error.message, error.code);
}

function resumenDeFila(fila: FilaResumenAdmin): PedidoAdminResumen {
    return {
        id: fila.id,
        estado: fila.estado,
        folio: fila.folio,
        total: Number(fila.total),
        cliente: nombreDe(fila.cliente),
        tipoEntrega: fila.tipo_entrega,
        fechaEntrega: fila.fecha_entrega,
        horaEntrega: fila.hora_entrega ? fila.hora_entrega.slice(0, 5) as HoraBloque : null,
    };
}

// filas desde..hasta (inclusivo) de los estados pedidos, por fecha y hora de entrega (D3, D4)
export async function listarPedidos(
    db: SupabaseClient, estados: EstadoPedido[], ascendente: boolean, desde: number, hasta: number,
): Promise<PedidoAdminResumen[]> {
    const { data, error } = await db.from('pedidos')
        .select(`id, estado, folio, total, tipo_entrega, fecha_entrega, hora_entrega, ${CLIENTE}`)
        .in('estado', estados)
        .order('fecha_entrega', { ascending: ascendente })
        .order('hora_entrega', { ascending: ascendente })
        .order('id')    // desempate estable para que las paginas no repitan pedidos
        .range(desde, hasta);
    lanzarSiError(error);
    return ((data ?? []) as FilaResumenAdmin[]).map(resumenDeFila);
}

// la funcion de 011 solo devuelve los estados que tienen pedidos
export async function contarPorEstado(db: SupabaseClient): Promise<{ estado: string; total: number }[]> {
    const { data, error } = await db.rpc('contar_pedidos_por_estado');
    lanzarSiError(error);
    return ((data ?? []) as { estado: string; total: number | string }[]).map((fila) => ({ estado: fila.estado, total: Number(fila.total) }));
}

// detalle completo: pastel, entrega, cliente, pago y repartidor (D5)
export async function obtenerPedido(db: SupabaseClient, id: string): Promise<PedidoAdmin | null> {
    const { data, error } = await db.from('pedidos')
        .select(`${COLUMNAS_PEDIDO_COMPLETO}, ${CLIENTE}, ${REPARTIDOR}, pagos(metodo_pago, monto, estado_pago)`)
        .eq('id', id)
        .maybeSingle<FilaPedidoAdmin>();
    lanzarSiError(error);
    if (!data) return null;
    const pago = primero(data.pagos);
    return {
        ...pedidoCompletoDeFila(data),
        cliente: nombreDe(data.cliente),
        repartidor: primero(data.repartidor) ? nombreDe(data.repartidor) : null,
        pago: pago ? { metodo: pago.metodo_pago, monto: Number(pago.monto), estado: pago.estado_pago } : null,
    };
}

export interface CambiosPedido {
    estado: EstadoPedido;
    repartidor_id?: string | null;
}

// solo aplica si el pedido sigue en el estado mostrado; false si otro admin ya lo movio (D6)
export async function cambiarEstado(db: SupabaseClient, id: string, estadoActual: EstadoPedido, cambios: CambiosPedido): Promise<boolean> {
    const { data, error } = await db.from('pedidos').update(cambios).eq('id', id).eq('estado', estadoActual).select('id');
    lanzarSiError(error);
    return (data ?? []).length > 0;
}

export async function listarRepartidores(db: SupabaseClient): Promise<Repartidor[]> {
    const { data, error } = await db.from('perfiles').select('id, nombre').eq('rol', 'repartidor').order('nombre');
    lanzarSiError(error);
    return ((data ?? []) as Repartidor[]).map((r) => ({ id: r.id, nombre: r.nombre.trim() || MENSAJES_ADMIN.SIN_NOMBRE }));
}
