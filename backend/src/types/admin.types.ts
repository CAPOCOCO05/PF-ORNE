import { EstadoPedido, HoraBloque, PedidoCompleto, TipoEntrega } from './pedido.types';

// panel admin (F04, F07 M2 y M3)

export type PestaniaAdmin = 'activos' | 'entregado' | 'cancelado';
export type EstadoActivo = 'pendiente' | 'confirmado' | 'en_preparacion' | 'listo' | 'en_camino' | 'no_entregado';

export interface FiltroAdmin {
    pestania: PestaniaAdmin;
    estados: EstadoActivo[];    // dentro de "Activos"; ninguno = todos
}

export interface PedidoAdminResumen {
    id: string;
    estado: EstadoPedido;
    folio: string | null;
    total: number;
    cliente: string;
    tipoEntrega: TipoEntrega | null;
    fechaEntrega: string | null;
    horaEntrega: HoraBloque | null;
}

export interface PagoPedido {
    metodo: string;
    monto: number;
    estado: 'pendiente' | 'confirmado';
}

export interface PedidoAdmin extends PedidoCompleto {
    cliente: string;
    repartidor: string | null;
    pago: PagoPedido | null;
}

export interface Repartidor {
    id: string;
    nombre: string;
}

export type ConteoEstados = Record<Exclude<EstadoPedido, 'borrador'>, number>;

// cambio de estado que pide el admin (F04 D6, D7; F07 M2)
export interface CambioEstado {
    estadoActual: EstadoPedido;     // el que se esta mostrando
    destino: EstadoPedido;
    repartidorId: string | null;    // solo al enviar a reparto
}
