import { Coordenadas } from '../constants/entrega';
import { Niveles, RellenoId, SaborPanId, Tamanio } from './catalogo.types';

// tipos del pedido (specs/02-data-model.md, F01–F03). Misma forma que usa la app

export type EstadoPedido =
    | 'borrador' | 'pendiente' | 'confirmado' | 'en_preparacion'
    | 'listo' | 'en_camino' | 'entregado' | 'no_entregado' | 'cancelado';

// pasos del wizard que se guardan en pedidos.paso_actual (F01: 1-3, F02: 4, F03: 5)
export type PasoPedido = 1 | 2 | 3 | 4 | 5;

export type TipoEntrega = 'domicilio' | 'recoleccion';
export type HoraBloque = '10:00' | '12:00' | '14:00' | '16:00';

export interface DatosEntrega {
    tipoEntrega: TipoEntrega | null;
    calle: string;
    numeroExterior: string;
    numeroInterior: string;
    colonia: string;
    referencia: string;
    telefono: string;
    ubicacion: Coordenadas | null;
    fechaEntrega: string | null;    // 'YYYY-MM-DD'
    horaEntrega: HoraBloque | null;
}

// lo que la app manda al guardar un borrador (ya validado)
export interface DatosBorrador {
    pasoActual: PasoPedido;
    tamanio: Tamanio | null;
    niveles: Niveles | null;
    tipoPan: SaborPanId | null;
    relleno: RellenoId | null;
    mensaje: string | null;
    entrega: DatosEntrega | null;   // solo el paso 4 escribe la entrega (F02 D8)
}

// borrador para retomarlo en el wizard (D2)
export interface Borrador {
    id: string;
    tamanio: Tamanio | null;
    niveles: Niveles | null;
    tipoPan: SaborPanId | null;
    relleno: RellenoId | null;
    mensaje: string;
    imagenRuta: string | null;
    entrega: DatosEntrega;
    pasoActual: PasoPedido;
}

// renglon de "Mis pedidos"
export interface ResumenPedido {
    id: string;
    estado: EstadoPedido;
    folio: string | null;
    total: number;
    pasoActual: PasoPedido;
    creadoEn: string;
    tamanio: Tamanio | null;
    niveles: Niveles | null;
    tipoPan: SaborPanId | null;
    relleno: RellenoId | null;
}

// pedido completo: resumen del paso 5, comprobante y detalle (F03)
export interface PedidoCompleto {
    id: string;
    estado: EstadoPedido;
    folio: string | null;
    total: number;
    creadoEn: string;
    tamanio: Tamanio | null;
    niveles: Niveles | null;
    tipoPan: SaborPanId | null;
    relleno: RellenoId | null;
    mensaje: string;
    imagenRuta: string | null;
    entrega: DatosEntrega;
    motivoNoEntrega: string | null;
}

export interface Confirmacion {
    folio: string;
    total: number;
}
