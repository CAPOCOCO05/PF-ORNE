import { Niveles, RellenoId, Tamanio } from "../types/pedido.types";

// montos confirmados en MXN (F01, D7); deben coincidir con calcular_precio (014_precios_relleno.sql)
export const PRECIO_BASE: Record<Tamanio, number> = {
    '10': 350,
    '15': 500,
    '20': 650,
    '30': 900,
};

export const COSTO_NIVEL_EXTRA = 250;

export const COSTO_RELLENO: Record<RellenoId, number> = {
    cajeta: 50,
    mermeladafresa: 70,
    cremapastelera: 30,
    chocolate: 40,
    mantequillademani: 50,
};

// a partir de este numero de niveles el precio es estimado (D5)
export const NIVELES_PRECIO_ESTIMADO = 3;

interface DatosPrecio {
    tamanio: Tamanio | null;
    niveles: Niveles | null;
    relleno: RellenoId | null;
}

// PrecioBase(tamaño) + CostoNivelExtra × (niveles − 1) + CostoRelleno; el pan no afecta.
// null mientras no haya tamaño; sin niveles se toma 1 y sin relleno se suma 0 ("desde")
export function calcularPrecio({tamanio, niveles, relleno}: DatosPrecio): number | null {
    if (!tamanio) return null;
    const extra = COSTO_NIVEL_EXTRA * ((niveles ?? 1) - 1);
    return PRECIO_BASE[tamanio] + extra + (relleno ? COSTO_RELLENO[relleno] : 0);
}

// $1,250.00 MXN (se arma a mano para no depender de Intl en el motor JS)
export function formatearPrecio(monto: number): string {
    const [enteros, decimales] = monto.toFixed(2).split('.');
    const conComas = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `$${conComas}.${decimales} MXN`;
}

export function esPrecioEstimado(niveles: Niveles | null): boolean {
    return (niveles ?? 1) >= NIVELES_PRECIO_ESTIMADO;
}
