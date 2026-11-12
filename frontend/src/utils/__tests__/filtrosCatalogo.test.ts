import { FILTROS_VACIOS } from "../../constants/filtrosCatalogo";
import { FiltrosCatalogo } from "../../types/pedido.types";
import { alternar, contarFiltros, filtrosAplicados, hayFiltros, limpiarFiltros, quitarFiltro, textoNiveles, textoOrden } from "../filtrosCatalogo";

const FILTROS: FiltrosCatalogo = {
    precio: '500a800',
    panes: ['chocolate', 'vainilla'],
    rellenos: ['chocolate'],
    tamanios: ['15'],
    niveles: [2],
    orden: 'precioAsc',
};

describe("alternar", () => {
    it("agrega un valor que no esta y quita uno que ya estaba", () => {
        expect(alternar(['a'], 'b')).toEqual(['a', 'b']);
        expect(alternar(['a', 'b'], 'a')).toEqual(['b']);
    });
});

describe("contarFiltros / hayFiltros", () => {
    it("cuenta cada opcion elegida; el orden no cuenta", () => {
        expect(contarFiltros(FILTROS)).toBe(6);
        expect(contarFiltros({...FILTROS_VACIOS, orden: 'precioDesc'})).toBe(0);
        expect(hayFiltros(FILTROS_VACIOS)).toBe(false);
        expect(hayFiltros(FILTROS)).toBe(true);
    });
});

describe("limpiarFiltros", () => {
    it("quita todos los filtros y conserva el orden", () => {
        expect(limpiarFiltros(FILTROS)).toEqual({...FILTROS_VACIOS, orden: 'precioAsc'});
    });
});

describe("filtrosAplicados", () => {
    it("un chip por opcion, distinguiendo pan y relleno del mismo sabor", () => {
        expect(filtrosAplicados(FILTROS).map((c) => c.texto)).toEqual([
            '$500–$800', 'Pan: Chocolate', 'Pan: Vainilla', 'Relleno: Chocolate', '15 personas', '2 niveles',
        ]);
    });

    it("las claves son unicas", () => {
        const claves = filtrosAplicados(FILTROS).map((c) => c.clave);
        expect(new Set(claves).size).toBe(claves.length);
    });

    it("sin filtros no hay chips", () => {
        expect(filtrosAplicados(FILTROS_VACIOS)).toEqual([]);
    });
});

describe("quitarFiltro", () => {
    it("quita solo el filtro del chip", () => {
        const chips = filtrosAplicados(FILTROS);
        const sinPan = quitarFiltro(FILTROS, chips[1]);
        expect(sinPan.panes).toEqual(['vainilla']);
        expect(sinPan.rellenos).toEqual(['chocolate']);

        expect(quitarFiltro(FILTROS, chips[0]).precio).toBeNull();
        expect(quitarFiltro(FILTROS, chips[3]).rellenos).toEqual([]);
        expect(quitarFiltro(FILTROS, chips[4]).tamanios).toEqual([]);
        expect(quitarFiltro(FILTROS, chips[5]).niveles).toEqual([]);
    });
});

describe("textos", () => {
    it("niveles en singular y plural; orden por id", () => {
        expect(textoNiveles(1)).toBe('1 nivel');
        expect(textoNiveles(3)).toBe('3 niveles');
        expect(textoOrden('precioDesc')).toBe('Precio: mayor a menor');
    });
});
