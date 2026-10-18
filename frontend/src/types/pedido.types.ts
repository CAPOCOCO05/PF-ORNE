// tipos del pedido (ver specs/02-data-model.md y F01)

export type Tamanio = '10' | '15' | '20' | '30';
export type Niveles = 1 | 2 | 3 | 4;
export type SaborPanId = 'vainilla' | 'chocolate' | 'redvelvet' | 'tresleches' | 'fresa' | 'zanahoria';
export type RellenoId = 'cajeta' | 'chocolate' | 'cremapastelera' | 'mantequillademani' | 'mermeladafresa';

export type EstadoPedido =
    | 'borrador' | 'pendiente' | 'confirmado' | 'en_preparacion'
    | 'listo' | 'en_camino' | 'entregado' | 'cancelado';

// pasos del wizard que guarda F01 (pedidos.paso_actual)
export type PasoPedido = 1 | 2 | 3;

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
