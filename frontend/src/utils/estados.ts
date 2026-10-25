import { ACCIONES, AccionEstado, ESTADOS_ACTIVOS, FiltroAdmin } from "../constants/estadosPedido";
import { EstadoPedido, TipoEntrega } from "../types/pedido.types";

// acciones que el admin puede hacer segun el estado y el tipo de entrega (F04 D2);
// el trigger validar_cambio_pedido rechaza cualquier otra
export function accionesDisponibles(estado: EstadoPedido, tipoEntrega: TipoEntrega | null): AccionEstado[] {
    switch (estado) {
        case 'pendiente':
            return [ACCIONES.confirmar, ACCIONES.cancelar];
        case 'confirmado':
            return [ACCIONES.preparar, ACCIONES.cancelar];
        case 'en_preparacion':
            return [ACCIONES.listo];
        case 'listo':
            if (tipoEntrega === 'domicilio') return [ACCIONES.reparto];
            if (tipoEntrega === 'recoleccion') return [ACCIONES.entregar];
            return [];
        default:
            return [];
    }
}

// "¿Marcar el pedido ORN-7K2QXM como listo?"
export function preguntaAccion(accion: AccionEstado, folio: string | null): string {
    return accion.pregunta.replace('{folio}', folio ?? '');
}

// estados que trae cada chip (D3)
export function estadosDeFiltro(filtro: FiltroAdmin): EstadoPedido[] {
    return filtro === 'activos' ? ESTADOS_ACTIVOS : [filtro];
}

// los terminados se ven del mas reciente al mas antiguo; el resto, por la entrega mas proxima (D3)
export function ordenAscendente(filtro: FiltroAdmin): boolean {
    return filtro !== 'entregado' && filtro !== 'cancelado';
}
