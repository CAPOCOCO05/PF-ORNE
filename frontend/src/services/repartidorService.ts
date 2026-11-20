import { supabase } from "./supabase";
import { esErrorDeConexion, MENSAJE_SIN_CONEXION, traducirErrorDatos } from "./erroresDatos";
import { COLUMNAS_ENTREGA, entregaDeFila, FilaEntrega } from "./pedidosService";
import { EntregaRepartidor, EntregaResumen, EstadoPedido, Niveles, Tamanio } from "../types/pedido.types";
import { armarDireccion } from "../utils/entrega";

// entregas del repartidor (F06); RLS solo deja ver los pedidos asignados a el (007)
// y el nombre del cliente de sus entregas en curso (010). No se consultan precios ni pagos

export const MENSAJES_REPARTIDOR = {
    ACTUALIZAR: 'No se pudo actualizar la entrega, inténtalo de nuevo',
    YA_NO_DISPONIBLE: 'Esta entrega ya no está en camino',
    SIN_MOTIVO: 'Indica por qué no se pudo entregar',
} as const;

const CLIENTE = 'cliente:perfiles!pedidos_usuario_perfil_fkey(nombre)';

type Nombre = {nombre: string} | {nombre: string}[] | null;

type FilaEntregaRepartidor = Partial<FilaEntrega> & {
    id: string;
    estado: EstadoPedido;
    folio: string | null;
    cliente: Nombre;
    pedido_detalle?: {tamanio: Tamanio | null; niveles: Niveles | null} | {tamanio: Tamanio | null; niveles: Niveles | null}[] | null;
};

// PostgREST devuelve la relacion como objeto o como arreglo
function primero<T>(valor: T | T[] | null | undefined): T | null {
    return Array.isArray(valor) ? valor[0] ?? null : valor ?? null;
}

function nombreDe(valor: Nombre): string {
    return primero(valor)?.nombre.trim() || 'Sin nombre';
}

function resumenDeFila(fila: FilaEntregaRepartidor): EntregaResumen {
    const entrega = entregaDeFila(fila);
    return {
        id: fila.id,
        folio: fila.folio,
        cliente: nombreDe(fila.cliente),
        fechaEntrega: entrega.fechaEntrega,
        horaEntrega: entrega.horaEntrega,
        direccion: armarDireccion(entrega),
    };
}

// pedidos en camino asignados al repartidor, de la entrega mas proxima a la mas lejana
export async function listarEntregas(): Promise<{entregas: EntregaResumen[]; error: string | null}> {
    const {data, error} = await supabase
        .from('pedidos')
        .select(`id, estado, folio, calle, numero_exterior, numero_interior, colonia, fecha_entrega, hora_entrega, ${CLIENTE}`)
        .eq('estado', 'en_camino')
        .order('fecha_entrega', {ascending: true})
        .order('hora_entrega', {ascending: true})
        .order('id');
    if (error) return {entregas: [], error: traducirErrorDatos(error)};
    return {entregas: ((data ?? []) as FilaEntregaRepartidor[]).map(resumenDeFila), error: null};
}

// detalle para ubicar la entrega: direccion, coordenadas, horario y que pastel lleva
export async function obtenerEntrega(id: string): Promise<{entrega: EntregaRepartidor | null; error: string | null}> {
    const {data, error} = await supabase
        .from('pedidos')
        .select(`id, estado, folio, ${COLUMNAS_ENTREGA}, ${CLIENTE}, pedido_detalle(tamanio, niveles)`)
        .eq('id', id)
        .maybeSingle<FilaEntregaRepartidor>();
    if (error) return {entrega: null, error: traducirErrorDatos(error)};
    if (!data) return {entrega: null, error: null};

    const detalle = primero(data.pedido_detalle);
    return {
        entrega: {
            id: data.id,
            estado: data.estado,
            folio: data.folio,
            cliente: nombreDe(data.cliente),
            tamanio: detalle?.tamanio ?? null,
            niveles: detalle?.niveles ?? null,
            entrega: entregaDeFila(data),
        },
        error: null,
    };
}

export type ResultadoEntrega = 'ok' | 'desactualizado' | 'error';

// solo aplica si el pedido sigue en camino; RLS y el trigger rechazan cualquier otro cambio (007)
export async function marcarEntregado(id: string): Promise<{resultado: ResultadoEntrega; error: string | null}> {
    const {data, error} = await supabase
        .from('pedidos')
        .update({estado: 'entregado'})
        .eq('id', id)
        .eq('estado', 'en_camino')
        .select('id');
    if (error) {
        console.warn('marcarEntregado:', error.code, error.message);
        return {resultado: 'error', error: esErrorDeConexion(error) ? MENSAJE_SIN_CONEXION : MENSAJES_REPARTIDOR.ACTUALIZAR};
    }
    if (!data || data.length === 0) return {resultado: 'desactualizado', error: MENSAJES_REPARTIDOR.YA_NO_DISPONIBLE};
    return {resultado: 'ok', error: null};
}

// "No se pudo entregar" con su motivo (F07 M2); igual que marcarEntregado, solo si sigue en camino.
// RLS exige el motivo y el trigger valida la transicion (011)
export async function marcarNoEntregado(id: string, motivo: string): Promise<{resultado: ResultadoEntrega; error: string | null}> {
    const texto = motivo.trim();
    if (!texto) return {resultado: 'error', error: MENSAJES_REPARTIDOR.SIN_MOTIVO};
    const {data, error} = await supabase
        .from('pedidos')
        .update({estado: 'no_entregado', motivo_no_entrega: texto})
        .eq('id', id)
        .eq('estado', 'en_camino')
        .select('id');
    if (error) {
        console.warn('marcarNoEntregado:', error.code, error.message);
        return {resultado: 'error', error: esErrorDeConexion(error) ? MENSAJE_SIN_CONEXION : MENSAJES_REPARTIDOR.ACTUALIZAR};
    }
    if (!data || data.length === 0) return {resultado: 'desactualizado', error: MENSAJES_REPARTIDOR.YA_NO_DISPONIBLE};
    return {resultado: 'ok', error: null};
}
