import { SupabaseClient } from '@supabase/supabase-js';
import { CONTEO_VACIO, ESTADOS_ACTIVOS, MENSAJES_ADMIN, PEDIDOS_POR_PAGINA_ADMIN, TRANSICIONES_ADMIN } from '../constants/admin';
import { MENSAJES_PEDIDO } from '../constants/pedido';
import { ApiError } from '../errors/ApiError';
import * as adminRepo from '../repositories/admin.repository';
import { CambioEstado, ConteoEstados, FiltroAdmin, PedidoAdmin, PedidoAdminResumen, Repartidor } from '../types/admin.types';
import { EstadoPedido } from '../types/pedido.types';
import { rangoDePagina, recortarPagina } from '../utils/catalogo';

// capa de negocio del panel admin (F04, F07 M2 y M3)

// estados que trae la consulta (F04 D3, F07 M3 D3): en "Activos" los marcados, en el orden del
// ciclo, o todos si no hay ninguno; en las demas pestañas, ese estado
export function estadosDeFiltro({ pestania, estados }: FiltroAdmin): EstadoPedido[] {
    if (pestania !== 'activos') return [pestania];
    return estados.length === 0 ? [...ESTADOS_ACTIVOS] : ESTADOS_ACTIVOS.filter((e) => estados.includes(e));
}

// los activos por la entrega mas proxima; los terminados, del mas reciente al mas antiguo (D3)
export function ordenAscendente({ pestania }: FiltroAdmin): boolean {
    return pestania === 'activos';
}

export async function listarPedidos(db: SupabaseClient, filtro: FiltroAdmin, pagina: number): Promise<{ pedidos: PedidoAdminResumen[]; hayMas: boolean }> {
    const { desde, hasta } = rangoDePagina(pagina, PEDIDOS_POR_PAGINA_ADMIN);
    const filas = await adminRepo.listarPedidos(db, estadosDeFiltro(filtro), ordenAscendente(filtro), desde, hasta);
    const { pasteles: pedidos, hayMas } = recortarPagina(filas, PEDIDOS_POR_PAGINA_ADMIN);
    return { pedidos, hayMas };
}

// pedidos por estado para los chips de "Activos" (F07 M3 D2); los estados sin pedidos quedan en 0
export async function contarPorEstado(db: SupabaseClient): Promise<ConteoEstados> {
    const conteos = { ...CONTEO_VACIO };
    for (const { estado, total } of await adminRepo.contarPorEstado(db)) {
        if (estado in conteos) conteos[estado as keyof ConteoEstados] = total;
    }
    return conteos;
}

export async function obtenerPedido(db: SupabaseClient, id: string): Promise<PedidoAdmin> {
    const pedido = await adminRepo.obtenerPedido(db, id);
    if (!pedido) throw ApiError.noEncontrado(MENSAJES_PEDIDO.NO_ENCONTRADO);
    return pedido;
}

// que cambia en la fila: enviar a reparto asigna repartidor; reprogramar una entrega fallida lo quita (M2)
function cambiosDe({ estadoActual, destino, repartidorId }: CambioEstado): adminRepo.CambiosPedido {
    if (destino === 'en_camino') return { estado: destino, repartidor_id: repartidorId };
    if (estadoActual === 'no_entregado' && destino === 'listo') return { estado: destino, repartidor_id: null };
    return { estado: destino };
}

// valida la transicion antes de tocar la base (el trigger la vuelve a validar). Si otro admin ya
// movio el pedido responde 409 con codigo DESACTUALIZADO para que la app lo recargue (D6)
export async function cambiarEstado(db: SupabaseClient, id: string, cambio: CambioEstado): Promise<void> {
    if (!TRANSICIONES_ADMIN[cambio.estadoActual]?.includes(cambio.destino)) {
        throw ApiError.conflicto(MENSAJES_ADMIN.TRANSICION);
    }
    if (cambio.destino === 'en_camino' && !cambio.repartidorId) {
        throw ApiError.solicitudInvalida(MENSAJES_ADMIN.REPARTIDOR_REQUERIDO, { repartidorId: MENSAJES_ADMIN.REPARTIDOR_REQUERIDO });
    }
    const aplicado = await adminRepo.cambiarEstado(db, id, cambio.estadoActual, cambiosDe(cambio));
    if (!aplicado) throw new ApiError(409, MENSAJES_ADMIN.DESACTUALIZADO, undefined, 'DESACTUALIZADO');
}

export function listarRepartidores(db: SupabaseClient): Promise<Repartidor[]> {
    return adminRepo.listarRepartidores(db);
}
