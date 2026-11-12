import { FiltrosCatalogo, OrdenCatalogo, RangoPrecioId } from "../types/pedido.types";

// filtros del catalogo del cliente (F07 M5)

export interface RangoPrecio {
    id: RangoPrecioId;
    texto: string;
    mayorQue?: number;      // exclusivo
    hasta?: number;         // inclusivo
}

// D2: provisionales, se ajustan cuando se confirmen los montos de F01 D7.
// "Hasta $500" incluye los $500; el siguiente rango empieza despues
export const RANGOS_PRECIO: RangoPrecio[] = [
    { id: 'hasta500', texto: 'Hasta $500', hasta: 500 },
    { id: '500a800', texto: '$500–$800', mayorQue: 500, hasta: 800 },
    { id: '800a1200', texto: '$800–$1,200', mayorQue: 800, hasta: 1200 },
    { id: 'mas1200', texto: 'Más de $1,200', mayorQue: 1200 },
];

export const ORDENES_CATALOGO: { id: OrdenCatalogo; texto: string }[] = [
    { id: 'nombre', texto: 'Precio' },
    { id: 'precioAsc', texto: 'Menor a Mayor' },
    { id: 'precioDesc', texto: 'Mayor a Menor' },
];

export const FILTROS_VACIOS: FiltrosCatalogo = {
    precio: null,
    panes: [],
    rellenos: [],
    tamanios: [],
    niveles: [],
    orden: 'nombre',
};
