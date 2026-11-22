import { Niveles, Tamanio } from './catalogo.types';
import { DatosEntrega, EstadoPedido, HoraBloque } from './pedido.types';

// entregas del repartidor (F06): sin precios ni datos de pago

export interface EntregaResumen {
    id: string;
    folio: string | null;
    cliente: string;
    fechaEntrega: string | null;    // 'YYYY-MM-DD'
    horaEntrega: HoraBloque | null;
    direccion: string;              // calle, numero y colonia
}

export interface EntregaRepartidor {
    id: string;
    estado: EstadoPedido;
    folio: string | null;
    cliente: string;
    tamanio: Tamanio | null;
    niveles: Niveles | null;
    entrega: DatosEntrega;
}
