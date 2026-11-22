import { ESTADOS_ACTIVOS, ESTADOS_PEDIDO, MENSAJES_ADMIN, PESTANIAS_ADMIN } from '../constants/admin';
import { ApiError } from '../errors/ApiError';
import { CambioEstado, EstadoActivo, FiltroAdmin, PestaniaAdmin } from '../types/admin.types';
import { EstadoPedido } from '../types/pedido.types';
import { esObjeto, listaDeQuery, validarUuid } from './comunes.validator';

// valida lo que llega al panel admin (limite del sistema)

// GET /admin/pedidos?pestania=activos&estados=pendiente,listo
export function validarFiltroAdmin(query: Record<string, unknown>): FiltroAdmin {
    const pestania = (query.pestania ?? 'activos') as PestaniaAdmin;
    const estados = listaDeQuery(query.estados) as EstadoActivo[];
    const valido = PESTANIAS_ADMIN.includes(pestania) && estados.every((e) => ESTADOS_ACTIVOS.includes(e));
    if (!valido) throw ApiError.solicitudInvalida(MENSAJES_ADMIN.FILTRO);
    return { pestania, estados: pestania === 'activos' ? estados : [] };
}

function esEstado(valor: unknown): valor is EstadoPedido {
    return ESTADOS_PEDIDO.includes(valor as EstadoPedido);
}

// cuerpo de PATCH /admin/pedidos/:id/estado: { estadoActual, destino, repartidorId? }
export function validarCambioEstado(cuerpo: unknown): CambioEstado {
    if (!esObjeto(cuerpo) || !esEstado(cuerpo.estadoActual) || !esEstado(cuerpo.destino)) throw ApiError.solicitudInvalida();
    const repartidorId = cuerpo.repartidorId === undefined || cuerpo.repartidorId === null
        ? null
        : validarUuid(cuerpo.repartidorId, MENSAJES_ADMIN.REPARTIDOR_REQUERIDO);
    return { estadoActual: cuerpo.estadoActual, destino: cuerpo.destino, repartidorId };
}
