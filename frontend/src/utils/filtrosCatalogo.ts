import { FILTROS_VACIOS, ORDENES_CATALOGO, RANGOS_PRECIO } from "../constants/filtrosCatalogo";
import { nombrePan, nombreRelleno } from "../constants/catalogoSabores";
import { FiltrosCatalogo, Niveles, OrdenCatalogo, RellenoId, SaborPanId, Tamanio } from "../types/pedido.types";

// reglas de los filtros del catalogo (F07 M5) sin dependencias de pantalla

export type SeccionFiltro = 'precio' | 'panes' | 'rellenos' | 'tamanios' | 'niveles';

// un filtro aplicado, tal como se muestra en los chips con "×"
export interface ChipFiltro {
    clave: string;
    seccion: SeccionFiltro;
    valor: string | number;
    texto: string;
}

// agrega el valor si no esta, o lo quita si ya estaba (secciones de varias opciones)
export function alternar<T>(lista: T[], valor: T): T[] {
    return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

export function textoTamanio(tamanio: Tamanio): string {
    return `${tamanio} personas`;
}

export function textoNiveles(niveles: Niveles): string {
    return niveles === 1 ? '1 nivel' : `${niveles} niveles`;
}

export function textoOrden(orden: OrdenCatalogo): string {
    return ORDENES_CATALOGO.find((o) => o.id === orden)?.texto ?? '';
}

// numero de opciones elegidas (el orden no cuenta como filtro)
export function contarFiltros(filtros: FiltrosCatalogo): number {
    return (filtros.precio ? 1 : 0) + filtros.panes.length + filtros.rellenos.length
        + filtros.tamanios.length + filtros.niveles.length;
}

export function hayFiltros(filtros: FiltrosCatalogo): boolean {
    return contarFiltros(filtros) > 0;
}

// quita todos los filtros pero conserva el orden elegido
export function limpiarFiltros(filtros: FiltrosCatalogo): FiltrosCatalogo {
    return {...FILTROS_VACIOS, orden: filtros.orden};
}

function chip(seccion: SeccionFiltro, valor: string | number, texto: string): ChipFiltro {
    return {clave: `${seccion}-${valor}`, seccion, valor, texto};
}

export function filtrosAplicados(filtros: FiltrosCatalogo): ChipFiltro[] {
    const rango = RANGOS_PRECIO.find((r) => r.id === filtros.precio);
    return [
        ...(rango ? [chip('precio', rango.id, rango.texto)] : []),
        ...filtros.panes.map((p) => chip('panes', p, `Pan: ${nombrePan(p)}`)),
        ...filtros.rellenos.map((r) => chip('rellenos', r, `Relleno: ${nombreRelleno(r)}`)),
        ...filtros.tamanios.map((t) => chip('tamanios', t, textoTamanio(t))),
        ...filtros.niveles.map((n) => chip('niveles', n, textoNiveles(n))),
    ];
}

export function quitarFiltro(filtros: FiltrosCatalogo, {seccion, valor}: ChipFiltro): FiltrosCatalogo {
    switch (seccion) {
        case 'precio': return {...filtros, precio: null};
        case 'panes': return {...filtros, panes: filtros.panes.filter((v) => v !== (valor as SaborPanId))};
        case 'rellenos': return {...filtros, rellenos: filtros.rellenos.filter((v) => v !== (valor as RellenoId))};
        case 'tamanios': return {...filtros, tamanios: filtros.tamanios.filter((v) => v !== (valor as Tamanio))};
        case 'niveles': return {...filtros, niveles: filtros.niveles.filter((v) => v !== (valor as Niveles))};
    }
}
