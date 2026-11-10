import { ACCIONES, AccionEstado, EstadoActivo, ESTADOS_ACTIVOS, FiltroAdmin, MAX_MOTIVO_NO_ENTREGA, MOTIVO_OTRO } from "../constants/estadosPedido";
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
        case 'no_entregado':
            return [ACCIONES.reprogramar, ACCIONES.cancelar];
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

// estados que trae la consulta (F04 D3, F07 M3 D3): en "Activos" los marcados, en
// el orden del ciclo, o todos si no hay ninguno; en las demas pestañas, ese estado
export function estadosDeFiltro({pestania, estados}: FiltroAdmin): EstadoPedido[] {
    if (pestania !== 'activos') return [pestania];
    return estados.length === 0 ? [...ESTADOS_ACTIVOS] : ESTADOS_ACTIVOS.filter((e) => estados.includes(e));
}

// los terminados se ven del mas reciente al mas antiguo; el resto, por la entrega mas proxima (D3)
export function ordenAscendente({pestania}: FiltroAdmin): boolean {
    return pestania === 'activos';
}

// marca o desmarca un chip de "Activos" (M3)
export function alternarEstado(estados: EstadoActivo[], estado: EstadoActivo): EstadoActivo[] {
    return estados.includes(estado) ? estados.filter((e) => e !== estado) : [...estados, estado];
}

export const MENSAJES_MOTIVO = {
    SIN_MOTIVO: 'Elige un motivo',
    OTRO_VACIO: 'Escribe el motivo',
    MUY_LARGO: `Máximo ${MAX_MOTIVO_NO_ENTREGA} caracteres`,
} as const;

// motivo que se guarda al marcar "No se pudo entregar" (F07 M2): la opcion elegida,
// o el texto escrito si eligio "Otro"
export function motivoNoEntrega(opcion: string | null, otro: string): {motivo: string | null; error: string | null} {
    if (!opcion) return {motivo: null, error: MENSAJES_MOTIVO.SIN_MOTIVO};
    if (opcion !== MOTIVO_OTRO) return {motivo: opcion, error: null};
    const texto = otro.trim();
    if (!texto) return {motivo: null, error: MENSAJES_MOTIVO.OTRO_VACIO};
    if (texto.length > MAX_MOTIVO_NO_ENTREGA) return {motivo: null, error: MENSAJES_MOTIVO.MUY_LARGO};
    return {motivo: texto, error: null};
}
