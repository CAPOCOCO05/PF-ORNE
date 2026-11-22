import { armarQuery, peticionApi } from "../api";
import { MENSAJES_DATOS } from "../erroresDatos";
import { supabase } from "../supabase";
import { llamadaFetch, simularApi } from "../../test-utils/apiSimulada";

jest.mock("../supabase", () => ({ supabase: { auth: { getSession: jest.fn() } } }));

beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
});

describe("armarQuery", () => {
    it("une listas con coma y omite valores vacios", () => {
        expect(armarQuery({ pagina: 0, panes: ["a", "b"], precio: null, vacio: "", lista: [] })).toBe("?pagina=0&panes=a%2Cb");
    });

    it("sin parametros no agrega nada", () => {
        expect(armarQuery({})).toBe("");
        expect(armarQuery()).toBe("");
    });
});

describe("peticionApi", () => {
    it("manda el cuerpo como JSON", async () => {
        const fetchMock = simularApi({ status: 201, cuerpo: { id: "1" } });

        const respuesta = await peticionApi<{ id: string }>("/x", { metodo: "POST", cuerpo: { a: 1 } });

        const [, opciones] = llamadaFetch(fetchMock);
        expect(opciones.headers).toHaveProperty("Content-Type", "application/json");
        expect(opciones.body).toBe('{"a":1}');
        expect(respuesta).toEqual({ data: { id: "1" }, error: null, status: 201 });
    });

    it("error sin cuerpo JSON: mensaje generico", async () => {
        simularApi({ status: 502 });

        expect(await peticionApi("/x")).toEqual({ data: null, error: MENSAJES_DATOS.GENERICO, status: 502, detalles: undefined });
    });

    it("devuelve los detalles por campo", async () => {
        simularApi({ status: 400, cuerpo: { error: "Revisa", detalles: { nombre: "Obligatorio" } } });

        expect(await peticionApi("/x")).toEqual({ data: null, error: "Revisa", status: 400, detalles: { nombre: "Obligatorio" } });
    });
});
