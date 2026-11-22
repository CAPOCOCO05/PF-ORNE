import { peticionApi } from "./api";
import { MENSAJE_SIN_CONEXION, MENSAJES_DATOS } from "./erroresDatos";
import { EntregaRepartidor, EntregaResumen } from "../types/pedido.types";

// entregas del repartidor (F06) por medio de la API (/repartidor): solo ve los pedidos
// asignados a el y nunca precios ni pagos

export const MENSAJES_REPARTIDOR = {
    ACTUALIZAR: 'No se pudo actualizar la entrega, inténtalo de nuevo',
    YA_NO_DISPONIBLE: 'Esta entrega ya no está en camino',
    SIN_MOTIVO: 'Indica por qué no se pudo entregar',
} as const;

// pedidos en camino asignados al repartidor, de la entrega mas proxima a la mas lejana
export async function listarEntregas(): Promise<{entregas: EntregaResumen[]; error: string | null}> {
    const {data, error} = await peticionApi<{entregas: EntregaResumen[]}>('/repartidor/entregas');
    if (error || !data) return {entregas: [], error: error ?? MENSAJES_DATOS.GENERICO};
    return {entregas: data.entregas, error: null};
}

// detalle para ubicar la entrega: direccion, coordenadas, horario y que pastel lleva; null si no existe
export async function obtenerEntrega(id: string): Promise<{entrega: EntregaRepartidor | null; error: string | null}> {
    const {data, error, status} = await peticionApi<{entrega: EntregaRepartidor}>(`/repartidor/entregas/${id}`);
    if (status === 404) return {entrega: null, error: null};
    if (error || !data) return {entrega: null, error};
    return {entrega: data.entrega, error: null};
}

export type ResultadoEntrega = 'ok' | 'desactualizado' | 'error';

// la API solo cierra la entrega si sigue en camino; si no, responde DESACTUALIZADO
async function cerrarEntrega(ruta: string, cuerpo?: unknown): Promise<{resultado: ResultadoEntrega; error: string | null}> {
    const {error, status, codigo} = await peticionApi(ruta, {metodo: 'POST', cuerpo});
    if (!error) return {resultado: 'ok', error: null};
    if (codigo === 'DESACTUALIZADO') return {resultado: 'desactualizado', error: MENSAJES_REPARTIDOR.YA_NO_DISPONIBLE};
    console.warn('cerrarEntrega:', status, error);
    return {resultado: 'error', error: status === 0 ? MENSAJE_SIN_CONEXION : MENSAJES_REPARTIDOR.ACTUALIZAR};
}

export function marcarEntregado(id: string): Promise<{resultado: ResultadoEntrega; error: string | null}> {
    return cerrarEntrega(`/repartidor/entregas/${id}/entregado`);
}

// "No se pudo entregar" con su motivo (F07 M2); la API tambien exige el motivo
export async function marcarNoEntregado(id: string, motivo: string): Promise<{resultado: ResultadoEntrega; error: string | null}> {
    const texto = motivo.trim();
    if (!texto) return {resultado: 'error', error: MENSAJES_REPARTIDOR.SIN_MOTIVO};
    return cerrarEntrega(`/repartidor/entregas/${id}/no-entregado`, {motivo: texto});
}
