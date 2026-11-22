// tipos del catalogo de pasteles (F01, F07 M4 y M5). Mismos valores que la base (005, 012)

export type Tamanio = '10' | '15' | '20' | '30';
export type Niveles = 1 | 2 | 3 | 4;
export type SaborPanId = 'vainilla' | 'chocolate' | 'redvelvet' | 'tresleches' | 'fresa' | 'zanahoria';
export type RellenoId = 'cajeta' | 'chocolate' | 'cremapastelera' | 'mantequillademani' | 'mermeladafresa';

export type RangoPrecioId = 'hasta500' | '500a800' | '800a1200' | 'mas1200';
export type OrdenCatalogo = 'nombre' | 'precioAsc' | 'precioDesc';

// fila de catalogo_pasteles que ve el cliente
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

// el admin tambien ve los ocultos
export interface PastelAdmin extends PastelCatalogo {
    activo: boolean;
}

export interface FiltrosCatalogo {
    precio: RangoPrecioId | null;   // una sola opcion
    panes: SaborPanId[];            // varias: se suman (O) dentro de la seccion
    rellenos: RellenoId[];
    tamanios: Tamanio[];
    niveles: Niveles[];
    orden: OrdenCatalogo;
}

export interface PaginaCatalogo<T> {
    pasteles: T[];
    hayMas: boolean;
}

// datos ya validados para crear o editar un pastel; precio_base lo calcula la base (012)
export interface DatosPastel {
    nombre: string;
    descripcion: string | null;
    tamanio: Tamanio;
    niveles: Niveles;
    tipoPan: SaborPanId;
    relleno: RellenoId;
    activo: boolean;
    imagenUrl: string | null;
}
