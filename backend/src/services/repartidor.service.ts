import { SupabaseClient } from '@supabase/supabase-js';
import { MENSAJES_REPARTIDOR } from '../constants/repartidor';
import { ApiError } from '../errors/ApiError';
import * as repartidorRepo from '../repositories/repartidor.repository';
import { EntregaRepartidor, EntregaResumen } from '../types/repartidor.types';

// capa de negocio del repartidor (F06, F07 M2)

export function listarEntregas(db: SupabaseClient): Promise<EntregaResumen[]> {
    return repartidorRepo.listarEnCamino(db);
}

export async function obtenerEntrega(db: SupabaseClient, id: string): Promise<EntregaRepartidor> {
    const entrega = await repartidorRepo.obtenerEntrega(db, id);
    if (!entrega) throw ApiError.noEncontrado(MENSAJES_REPARTIDOR.NO_ENCONTRADA);
    return entrega;
}

// si el pedido ya no estaba en camino (p. ej. el admin lo cambio) responde 409 DESACTUALIZADO
async function cerrar(db: SupabaseClient, id: string, cambios: repartidorRepo.CierreEntrega): Promise<void> {
    const aplicado = await repartidorRepo.cerrarEntrega(db, id, cambios);
    if (!aplicado) throw new ApiError(409, MENSAJES_REPARTIDOR.YA_NO_DISPONIBLE, undefined, 'DESACTUALIZADO');
}

export function marcarEntregado(db: SupabaseClient, id: string): Promise<void> {
    return cerrar(db, id, { estado: 'entregado' });
}

// "No se pudo entregar" con su motivo ya validado (F07 M2)
export function marcarNoEntregado(db: SupabaseClient, id: string, motivo: string): Promise<void> {
    return cerrar(db, id, { estado: 'no_entregado', motivo_no_entrega: motivo });
}
