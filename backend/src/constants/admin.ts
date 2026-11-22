import { ConteoEstados, EstadoActivo, PestaniaAdmin } from '../types/admin.types';
import { EstadoPedido } from '../types/pedido.types';

// reglas del panel admin (F04, F07 M2 y M3)

export const PEDIDOS_POR_PAGINA_ADMIN = 10;

// no_entregado es activo: espera que el admin reprograme o cancele (F07 M2)
export const ESTADOS_ACTIVOS: EstadoActivo[] = ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'no_entregado'];
export const PESTANIAS_ADMIN: PestaniaAdmin[] = ['activos', 'entregado', 'cancelado'];

export const ESTADOS_PEDIDO: EstadoPedido[] = [
    'borrador', 'pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'no_entregado', 'cancelado',
];

// cambios que puede hacer el admin (F04 D2). Deben coincidir con el trigger validar_cambio_pedido
// (007, 011): "listo → en_camino" exige repartidor y solo aplica a domicilio, "listo → entregado"
// solo a recoleccion; eso ultimo lo revisa el trigger
export const TRANSICIONES_ADMIN: Partial<Record<EstadoPedido, EstadoPedido[]>> = {
    pendiente: ['confirmado', 'cancelado'],
    confirmado: ['en_preparacion', 'cancelado'],
    en_preparacion: ['listo'],
    listo: ['en_camino', 'entregado'],
    no_entregado: ['listo', 'cancelado'],   // reprogramar: vuelve a "listo" sin repartidor
};

export const CONTEO_VACIO: ConteoEstados = {
    pendiente: 0, confirmado: 0, en_preparacion: 0, listo: 0, en_camino: 0, entregado: 0, no_entregado: 0, cancelado: 0,
};

export const MENSAJES_ADMIN = {
    FILTRO: 'El filtro de pedidos no es válido',
    ACTUALIZAR: 'No se pudo actualizar el pedido, inténtalo de nuevo',
    DESACTUALIZADO: 'El pedido fue actualizado',
    TRANSICION: 'Ese cambio de estado no está permitido',
    REPARTIDOR_REQUERIDO: 'Elige un repartidor',
    SIN_NOMBRE: 'Sin nombre',
} as const;
