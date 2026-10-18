import { listarCatalogo, obtenerPastel } from "../catalogoService";
import { MENSAJES_DATOS } from "../erroresDatos";
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

describe("obtenerPastel", () => {
    it("busca el pastel por id", async () => {
        const consulta = consultaSimulada({ data: { id: "p1" }, error: null });
        (supabase.from as jest.Mock).mockReturnValue(consulta);

        expect(await obtenerPastel("p1")).toEqual({ pastel: { id: "p1" }, error: null });
        expect(consulta.eq).toHaveBeenCalledWith("id", "p1");
    });
});
