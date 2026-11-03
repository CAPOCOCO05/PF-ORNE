// tipos del pedido (ver specs/02-data-model.md y F01)

export type Tamanio = '10' | '15' | '20' | '30';
export type Niveles = 1 | 2 | 3 | 4;
export type SaborPanId = 'vainilla' | 'chocolate' | 'redvelvet' | 'tresleches' | 'fresa' | 'zanahoria';
export type RellenoId = 'cajeta' | 'chocolate' | 'cremapastelera' | 'mantequillademani' | 'mermeladafresa';

export type EstadoPedido =
    | 'borrador' | 'pendiente' | 'confirmado' | 'en_preparacion'
    | 'listo' | 'en_camino' | 'entregado' | 'cancelado';

// pasos del wizard que se guardan en pedidos.paso_actual (F01: 1-3, F02: 4, F03: 5)
export type PasoPedido = 1 | 2 | 3 | 4 | 5;

// entrega (F02)
export type TipoEntrega = 'domicilio' | 'recoleccion';
export type HoraBloque = '10:00' | '12:00' | '14:00' | '16:00';

export interface Coordenadas {
    latitud: number;
    longitud: number;
}

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

// fila de catalogo_pasteles
export interface PastelCatalogo {
    id: string;
    nombre: string;
    descripcion: string | null;
    imagen_url: string | null;
    precio_base: number;
    tamanio: Tamanio;
    niveles: Niveles;
    tipo_pan: SaborPanId;
    relleno: RellenoId;
}

// imagen elegida en la galeria, aun sin subir (D9)
export interface ImagenLocal {
    uri: string;
    mimeType?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
}

// estado del pedido en construccion (PedidoContext)
export interface PedidoEnCurso {
    id: string | null;               // null hasta guardar el borrador en el paso 1 (D2)
    tamanio: Tamanio | null;
    niveles: Niveles | null;
    tipoPan: SaborPanId | null;
    relleno: RellenoId | null;
    mensaje: string;
    imagenLocal: ImagenLocal | null; // imagen nueva por subir
    imagenRuta: string | null;       // ruta ya guardada en Storage
    entrega: DatosEntrega;           // paso 4 (F02)
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

// pedido completo para el resumen del paso 5, el comprobante y el detalle (F03)
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
}

// panel admin (F04)
export interface PedidoAdminResumen {
    id: string;
    estado: EstadoPedido;
    folio: string | null;
    total: number;
    cliente: string;
    tipoEntrega: TipoEntrega | null;
    fechaEntrega: string | null;    // 'YYYY-MM-DD'
    horaEntrega: HoraBloque | null;
}

export interface PagoPedido {
    metodo: string;
    monto: number;
    estado: 'simulado' | 'pagado' | 'fallido';
}

export interface PedidoAdmin extends PedidoCompleto {
    cliente: string;
    repartidor: string | null;     // nombre del repartidor asignado
    pago: PagoPedido | null;
}

export interface Repartidor {
    id: string;
    nombre: string;
}

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
