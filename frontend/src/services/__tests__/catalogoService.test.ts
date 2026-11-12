import { listarCatalogo, obtenerPastel } from "../catalogoService";
import { MENSAJES_DATOS } from "../erroresDatos";
import { FILTROS_VACIOS } from "../../constants/filtrosCatalogo";
import { supabase } from "../supabase";
import { consultaSimulada } from "../../test-utils/consultaSupabase";

jest.mock("../supabase", () => ({ supabase: { from: jest.fn() } }));

function pasteles(cantidad: number) {
    return Array.from({ length: cantidad }, (_, i) => ({ id: `p${i}`, nombre: `Pastel ${i}` }));
}

describe("listarCatalogo", () => {
    it("pide una pagina de 10 (mas uno para saber si hay mas), solo activos y por nombre", async () => {
        const consulta = consultaSimulada({ data: pasteles(11), error: null });
        (supabase.from as jest.Mock).mockReturnValue(consulta);

        const resultado = await listarCatalogo(1);

        expect(supabase.from).toHaveBeenCalledWith("catalogo_pasteles");
        expect(consulta.eq).toHaveBeenCalledWith("activo", true);
        expect(consulta.order).toHaveBeenCalledWith("nombre");
        expect(consulta.range).toHaveBeenCalledWith(10, 20);
        expect(resultado.pasteles).toHaveLength(10);
        expect(resultado.hayMas).toBe(true);
        expect(resultado.error).toBeNull();
    });

    it("ultima pagina: hayMas es false", async () => {
        (supabase.from as jest.Mock).mockReturnValue(consultaSimulada({ data: pasteles(2), error: null }));

        const resultado = await listarCatalogo(1);

        expect(resultado.pasteles).toHaveLength(2);
        expect(resultado.hayMas).toBe(false);
    });

    it("error de conexion: lista vacia y mensaje", async () => {
        (supabase.from as jest.Mock).mockReturnValue(
            consultaSimulada({ data: null, error: { message: "TypeError: Network request failed", code: "" } })
        );

        expect(await listarCatalogo(0)).toEqual({ pasteles: [], hayMas: false, error: MENSAJES_DATOS.CONEXION });
    });
});

describe("listarCatalogo con filtros (F07 M5)", () => {
    function consultaVacia() {
        const consulta = consultaSimulada({ data: [], error: null });
        (supabase.from as jest.Mock).mockReturnValue(consulta);
        return consulta;
    }

    it("sin filtros no agrega condiciones y ordena por nombre con id de desempate", async () => {
        const consulta = consultaVacia();

        await listarCatalogo(0);

        expect(consulta.in).not.toHaveBeenCalled();
        expect(consulta.gt).not.toHaveBeenCalled();
        expect(consulta.lte).not.toHaveBeenCalled();
        expect(consulta.order.mock.calls).toEqual([["nombre"], ["id"]]);
    });

    it("rango de precio: 'Hasta $500' incluye los $500", async () => {
        const consulta = consultaVacia();

        await listarCatalogo(0, { ...FILTROS_VACIOS, precio: "hasta500" });

        expect(consulta.lte).toHaveBeenCalledWith("precio_base", 500);
        expect(consulta.gt).not.toHaveBeenCalled();
    });

    it("rango de precio intermedio: mayor que el minimo y hasta el maximo", async () => {
        const consulta = consultaVacia();

        await listarCatalogo(0, { ...FILTROS_VACIOS, precio: "500a800" });

        expect(consulta.gt).toHaveBeenCalledWith("precio_base", 500);
        expect(consulta.lte).toHaveBeenCalledWith("precio_base", 800);
    });

    it("'Más de $1,200' no tiene tope", async () => {
        const consulta = consultaVacia();

        await listarCatalogo(0, { ...FILTROS_VACIOS, precio: "mas1200" });

        expect(consulta.gt).toHaveBeenCalledWith("precio_base", 1200);
        expect(consulta.lte).not.toHaveBeenCalled();
    });

    it("pan, relleno, tamaño y niveles se combinan; varias opciones de una seccion van en un solo .in()", async () => {
        const consulta = consultaVacia();

        await listarCatalogo(0, {
            ...FILTROS_VACIOS,
            panes: ["chocolate", "vainilla"],
            rellenos: ["cajeta"],
            tamanios: ["15", "20"],
            niveles: [2],
        });

        expect(consulta.in).toHaveBeenCalledWith("tipo_pan", ["chocolate", "vainilla"]);
        expect(consulta.in).toHaveBeenCalledWith("relleno", ["cajeta"]);
        expect(consulta.in).toHaveBeenCalledWith("tamanio", ["15", "20"]);
        expect(consulta.in).toHaveBeenCalledWith("niveles", [2]);
        expect(consulta.eq).toHaveBeenCalledWith("activo", true);
    });

    it("precio menor a mayor con nombre e id como desempate", async () => {
        const consulta = consultaVacia();

        await listarCatalogo(0, { ...FILTROS_VACIOS, orden: "precioAsc" });

        expect(consulta.order.mock.calls).toEqual([["precio_base", { ascending: true }], ["nombre"], ["id"]]);
    });

    it("precio mayor a menor", async () => {
        const consulta = consultaVacia();

        await listarCatalogo(0, { ...FILTROS_VACIOS, orden: "precioDesc" });

        expect(consulta.order).toHaveBeenCalledWith("precio_base", { ascending: false });
    });

    it("con filtros la paginacion se mantiene de 10 en 10", async () => {
        const consulta = consultaVacia();

        await listarCatalogo(2, { ...FILTROS_VACIOS, panes: ["fresa"] });

        expect(consulta.range).toHaveBeenCalledWith(20, 30);
    });

    it("convierte precio_base a numero", async () => {
        (supabase.from as jest.Mock).mockReturnValue(
            consultaSimulada({ data: [{ id: "p1", nombre: "A", precio_base: "530.00" }], error: null })
        );

        const resultado = await listarCatalogo(0);

        expect(resultado.pasteles[0].precio_base).toBe(530);
    });
});

describe("obtenerPastel", () => {
    it("busca el pastel por id", async () => {
        const consulta = consultaSimulada({ data: { id: "p1" }, error: null });
        (supabase.from as jest.Mock).mockReturnValue(consulta);

        expect(await obtenerPastel("p1")).toEqual({ pastel: { id: "p1" }, error: null });
        expect(consulta.eq).toHaveBeenCalledWith("id", "p1");
    });
});
