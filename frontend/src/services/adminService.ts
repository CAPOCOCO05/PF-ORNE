import { supabase } from "./supabase";
import { traducirErrorDatos } from "./erroresDatos";
import { COLUMNAS_PEDIDO_COMPLETO, FilaPedidoCompleto, pedidoCompletoDeFila } from "./pedidosService";
import { FiltroAdmin } from "../constants/estadosPedido";
import { estadosDeFiltro, ordenAscendente } from "../utils/estados";
import {
    EstadoPedido, HoraBloque, PagoPedido, PedidoAdmin, PedidoAdminResumen, Repartidor, TipoEntrega,
} from "../types/pedido.types";

// panel admin (F04): todos los pedidos menos borradores; RLS solo deja ver y cambiar al admin

export const PEDIDOS_POR_PAGINA = 10;

export const MENSAJES_ADMIN = {
    ACTUALIZAR: 'No se pudo actualizar el pedido, inténtalo de nuevo',
    ACTUALIZADO: 'El pedido fue actualizado',
    SIN_REPARTIDORES: 'No hay repartidores disponibles',
} as const;

// nombre del cliente y del repartidor desde perfiles; hay dos FK de pedidos a perfiles (007)
const CLIENTE = 'cliente:perfiles!pedidos_usuario_perfil_fkey(nombre)';
const REPARTIDOR = 'repartidor:perfiles!pedidos_repartidor_id_fkey(nombre)';

type Nombre = {nombre: string} | {nombre: string}[] | null;

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

type FilaPedidoAdmin = FilaPedidoCompleto & {
    cliente: Nombre;
    repartidor: Nombre;
    pagos: FilaPago | FilaPago[] | null;
};

// PostgREST devuelve la relacion como objeto o como arreglo
function primero<T>(valor: T | T[] | null | undefined): T | null {
    return Array.isArray(valor) ? valor[0] ?? null : valor ?? null;
}

function nombreDe(valor: Nombre): string {
    return primero(valor)?.nombre.trim() || 'Sin nombre';
}

interface PaginaAdmin {
    pedidos: PedidoAdminResumen[];
    hayMas: boolean;
    error: string | null;
}

// pagina empieza en 0; se pide un registro de mas para saber si hay otra pagina (D4)
export async function listarPedidosAdmin(filtro: FiltroAdmin, pagina: number, porPagina: number = PEDIDOS_POR_PAGINA): Promise<PaginaAdmin> {
    const desde = pagina * porPagina;
    const ascendente = ordenAscendente(filtro);
    const {data, error} = await supabase
        .from('pedidos')
        .select(`id, estado, folio, total, tipo_entrega, fecha_entrega, hora_entrega, ${CLIENTE}`)
        .in('estado', estadosDeFiltro(filtro))
        .order('fecha_entrega', {ascending: ascendente})
        .order('hora_entrega', {ascending: ascendente})
        .order('id')    // desempate estable para que las paginas no repitan pedidos
        .range(desde, desde + porPagina);
    if (error) return {pedidos: [], hayMas: false, error: traducirErrorDatos(error)};

    const filas = (data ?? []) as FilaResumenAdmin[];
    const pedidos = filas.slice(0, porPagina).map((fila): PedidoAdminResumen => ({
        id: fila.id,
        estado: fila.estado,
        folio: fila.folio,
        total: Number(fila.total),
        cliente: nombreDe(fila.cliente),
        tipoEntrega: fila.tipo_entrega,
        fechaEntrega: fila.fecha_entrega,
        horaEntrega: fila.hora_entrega ? fila.hora_entrega.slice(0, 5) as HoraBloque : null,
    }));
    return {pedidos, hayMas: filas.length > porPagina, error: null};
}

// detalle completo: pastel, entrega, cliente, pago y repartidor (D5)
export async function obtenerPedidoAdmin(id: string): Promise<{pedido: PedidoAdmin | null; error: string | null}> {
    const {data, error} = await supabase
        .from('pedidos')
        .select(`${COLUMNAS_PEDIDO_COMPLETO}, ${CLIENTE}, ${REPARTIDOR}, pagos(metodo_pago, monto, estado_pago)`)
        .eq('id', id)
        .maybeSingle<FilaPedidoAdmin>();
    if (error) return {pedido: null, error: traducirErrorDatos(error)};
    if (!data) return {pedido: null, error: null};

    const pago = primero(data.pagos);
    return {
        pedido: {
            ...pedidoCompletoDeFila(data),
            cliente: nombreDe(data.cliente),
            repartidor: primero(data.repartidor) ? nombreDe(data.repartidor) : null,
            pago: pago ? {metodo: pago.metodo_pago, monto: Number(pago.monto), estado: pago.estado_pago} : null,
        },
        error: null,
    };
}

export type ResultadoCambio = 'ok' | 'desactualizado' | 'error';

interface CambioEstado {
    id: string;
    estadoActual: EstadoPedido;     // el que se esta mostrando (D6)
    destino: EstadoPedido;
    repartidorId?: string;          // solo al enviar a reparto (D7)
    quitarRepartidor?: boolean;     // al reprogramar una entrega fallida (F07 M2)
}

// el update solo aplica si el pedido sigue en el estado mostrado; si otro admin
// ya lo movio no se actualiza ninguna fila (D6). El trigger valida la transicion
export async function cambiarEstado({id, estadoActual, destino, repartidorId, quitarRepartidor}: CambioEstado): Promise<{resultado: ResultadoCambio; error: string | null}> {
    const cambios = quitarRepartidor
        ? {estado: destino, repartidor_id: null}
        : repartidorId ? {estado: destino, repartidor_id: repartidorId} : {estado: destino};
    const {data, error} = await supabase
        .from('pedidos')
        .update(cambios)
        .eq('id', id)
        .eq('estado', estadoActual)
        .select('id');
    if (error) {
        console.warn('cambiarEstado:', error.code, error.message);
        return {resultado: 'error', error: MENSAJES_ADMIN.ACTUALIZAR};
    }
    if (!data || data.length === 0) return {resultado: 'desactualizado', error: MENSAJES_ADMIN.ACTUALIZADO};
    return {resultado: 'ok', error: null};
}

export async function listarRepartidores(): Promise<{repartidores: Repartidor[]; error: string | null}> {
    const {data, error} = await supabase
        .from('perfiles')
        .select('id, nombre')
        .eq('rol', 'repartidor')
        .order('nombre');
    if (error) return {repartidores: [], error: traducirErrorDatos(error)};
    const repartidores = ((data ?? []) as Repartidor[]).map((r) => ({id: r.id, nombre: r.nombre.trim() || 'Sin nombre'}));
    return {repartidores, error: null};
}
