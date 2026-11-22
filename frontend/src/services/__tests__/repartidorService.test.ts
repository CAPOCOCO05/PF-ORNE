import { listarEntregas, marcarEntregado, marcarNoEntregado, MENSAJES_REPARTIDOR, obtenerEntrega } from "../repartidorService";
import { MENSAJE_SIN_CONEXION, MENSAJES_DATOS } from "../erroresDatos";
import { supabase } from "../supabase";
import { llamadaFetch, simularApi, simularSinConexion } from "../../test-utils/apiSimulada";

// entregas del repartidor (F06) por medio de la API (/repartidor)
jest.mock("../supabase", () => ({ supabase: { auth: { getSession: jest.fn() } } }));

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { access_token: "tok-rep" } } });
});

describe("listarEntregas", () => {
    it("pide las entregas con el token del repartidor", async () => {
        const entregas = [{ id: "p1", folio: "ORN-1", cliente: "Ana", fechaEntrega: "2026-10-26", horaEntrega: "12:00", direccion: "Reforma 12, Centro" }];
        const fetchMock = simularApi({ status: 200, cuerpo: { entregas } });

        expect(await listarEntregas()).toEqual({ entregas, error: null });
        const [url, opciones] = llamadaFetch(fetchMock);
        expect(url).toBe("/repartidor/entregas");
        expect(opciones.headers).toHaveProperty("Authorization", "Bearer tok-rep");
    });

    it("sin internet", async () => {
        simularSinConexion();

        expect(await listarEntregas()).toEqual({ entregas: [], error: MENSAJES_DATOS.CONEXION });
    });
});

describe("obtenerEntrega", () => {
    it("devuelve la entrega", async () => {
        const entrega = { id: "p1", estado: "en_camino", folio: "ORN-1", cliente: "Ana", tamanio: "15", niveles: 2 };
        const fetchMock = simularApi({ status: 200, cuerpo: { entrega } });

        expect(await obtenerEntrega("p1")).toEqual({ entrega, error: null });
        expect(llamadaFetch(fetchMock)[0]).toBe("/repartidor/entregas/p1");
    });

    it("no asignada (404): null sin error", async () => {
        simularApi({ status: 404, cuerpo: { error: "No encontramos esta entrega" } });

        expect(await obtenerEntrega("p1")).toEqual({ entrega: null, error: null });
    });
});

describe("marcarEntregado", () => {
    it("POST a /entregado", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { resultado: "ok" } });

        expect(await marcarEntregado("p1")).toEqual({ resultado: "ok", error: null });
        expect(llamadaFetch(fetchMock)[0]).toBe("/repartidor/entregas/p1/entregado");
        expect(llamadaFetch(fetchMock)[1].method).toBe("POST");
    });

    it("ya no estaba en camino: desactualizado", async () => {
        simularApi({ status: 409, cuerpo: { error: "Esta entrega ya no está en camino", codigo: "DESACTUALIZADO" } });

        expect(await marcarEntregado("p1")).toEqual({ resultado: "desactualizado", error: MENSAJES_REPARTIDOR.YA_NO_DISPONIBLE });
    });

    it("error del servidor", async () => {
        simularApi({ status: 500, cuerpo: { error: "x" } });

        expect(await marcarEntregado("p1")).toEqual({ resultado: "error", error: MENSAJES_REPARTIDOR.ACTUALIZAR });
    });

    it("sin internet avisa que no hay conexion", async () => {
        simularSinConexion();

        expect(await marcarEntregado("p1")).toEqual({ resultado: "error", error: MENSAJE_SIN_CONEXION });
    });
});

describe("marcarNoEntregado (F07 M2)", () => {
    it("manda el motivo sin espacios de sobra", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { resultado: "ok" } });

        expect(await marcarNoEntregado("p1", "  No había nadie ")).toEqual({ resultado: "ok", error: null });
        expect(llamadaFetch(fetchMock)[0]).toBe("/repartidor/entregas/p1/no-entregado");
        expect(JSON.parse(llamadaFetch(fetchMock)[1].body as string)).toEqual({ motivo: "No había nadie" });
    });

    it("sin motivo no llama a la API", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: {} });

        expect(await marcarNoEntregado("p1", "   ")).toEqual({ resultado: "error", error: MENSAJES_REPARTIDOR.SIN_MOTIVO });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("ya no estaba en camino: desactualizado", async () => {
        simularApi({ status: 409, cuerpo: { error: "Esta entrega ya no está en camino", codigo: "DESACTUALIZADO" } });

        expect(await marcarNoEntregado("p1", "No había nadie")).toEqual({ resultado: "desactualizado", error: MENSAJES_REPARTIDOR.YA_NO_DISPONIBLE });
    });
});
