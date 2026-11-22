import { MAX_MOTIVO_NO_ENTREGA, MENSAJES_REPARTIDOR } from '../constants/repartidor';
import { ApiError } from '../errors/ApiError';
import { esObjeto } from './comunes.validator';

// cuerpo de POST /repartidor/entregas/:id/no-entregado: { motivo }
export function validarMotivo(cuerpo: unknown): string {
    const motivo = esObjeto(cuerpo) && typeof cuerpo.motivo === 'string' ? cuerpo.motivo.trim() : '';
    if (!motivo) throw ApiError.solicitudInvalida(MENSAJES_REPARTIDOR.SIN_MOTIVO, { motivo: MENSAJES_REPARTIDOR.SIN_MOTIVO });
    if (motivo.length > MAX_MOTIVO_NO_ENTREGA) {
        throw ApiError.solicitudInvalida(MENSAJES_REPARTIDOR.MOTIVO_LARGO, { motivo: MENSAJES_REPARTIDOR.MOTIVO_LARGO });
    }
    return motivo;
}
