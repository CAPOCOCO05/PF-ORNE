import { listarEntregas, marcarEntregado, marcarNoEntregado, MENSAJES_REPARTIDOR, obtenerEntrega } from "../repartidorService";
import { MENSAJES_DATOS } from "../erroresDatos";
import { supabase } from "../supabase";
import { consultaSimulada } from "../../test-utils/consultaSupabase";

jest.mock("../supabase", () => ({ supabase: { from: jest.fn() } }));

const ERROR_RED = { message: "TypeError: Network request failed", code: "" };

const FILA_RESUMEN = {
    id: "ped1", estado: "en_camino", folio: "ORN-7K2QXM", calle: "Calle Primera", numero_exterior: "123",
    numero_interior: null, colonia: "Centro", fecha_entrega: "2026-10-26", hora_entrega: "12:00:00",
    cliente: { nombre: " Ana " },
};

function mockConsulta(respuesta: { data?: unknown; error: unknown }) {
    const consulta = consultaSimulada(respuesta);
    (supabase.from as jest.Mock).mockReturnValue(consulta);
    return consulta;
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
});

describe("listarEntregas", () => {
    it("trae las entregas en camino ordenadas por la mas proxima, sin precios", async () => {
        const consulta = mockConsulta({ data: [FILA_RESUMEN], error: null });

        const resultado = await listarEntregas();

        expect(supabase.from).toHaveBeenCalledWith("pedidos");
        expect(consulta.select).toHaveBeenCalledWith(expect.not.stringContaining("total"));
        expect(consulta.eq).toHaveBeenCalledWith("estado", "en_camino");
        expect(consulta.order).toHaveBeenCalledWith("fecha_entrega", { ascending: true });
        expect(consulta.order).toHaveBeenCalledWith("hora_entrega", { ascending: true });
        expect(resultado).toEqual({
            entregas: [{
                id: "ped1", folio: "ORN-7K2QXM", cliente: "Ana", fechaEntrega: "2026-10-26", horaEntrega: "12:00",
                direccion: "Calle Primera 123, Centro",
            }],
            error: null,
        });
    });

    it("cliente sin nombre visible", async () => {
        mockConsulta({ data: [{ ...FILA_RESUMEN, cliente: null }], error: null });

        expect((await listarEntregas()).entregas[0].cliente).toBe("Sin nombre");
    });

    it("error de conexion", async () => {
        mockConsulta({ data: null, error: ERROR_RED });

        expect(await listarEntregas()).toEqual({ entregas: [], error: MENSAJES_DATOS.CONEXION });
    });
});

describe("obtenerEntrega", () => {
    it("devuelve direccion, coordenadas, horario, cliente y pastel", async () => {
        const consulta = mockConsulta({
            data: {
                ...FILA_RESUMEN, tipo_entrega: "domicilio", direccion: "Calle Primera 123, Centro",
                direccion_referencia: "Casa azul", direccion_lat: "31.78", direccion_lng: "-116.59",
                telefono_contacto: "6461234567", cliente: [{ nombre: "Ana" }],
                pedido_detalle: [{ tamanio: "15", niveles: 2 }],
            },
            error: null,
        });

        const resultado = await obtenerEntrega("ped1");

        expect(consulta.select).toHaveBeenCalledWith(expect.not.stringContaining("total"));
        expect(consulta.select).toHaveBeenCalledWith(expect.not.stringContaining("pagos"));
        expect(consulta.eq).toHaveBeenCalledWith("id", "ped1");
        expect(resultado.error).toBeNull();
        expect(resultado.entrega).toMatchObject({
            id: "ped1", estado: "en_camino", folio: "ORN-7K2QXM", cliente: "Ana", tamanio: "15", niveles: 2,
            entrega: {
                referencia: "Casa azul", telefono: "6461234567", ubicacion: { latitud: 31.78, longitud: -116.59 },
                fechaEntrega: "2026-10-26", horaEntrega: "12:00",
            },
        });
    });

    it("pedido que no tiene asignado (RLS no lo devuelve)", async () => {
        mockConsulta({ data: null, error: null });

        expect(await obtenerEntrega("ajeno")).toEqual({ entrega: null, error: null });
    });

    it("error de conexion", async () => {
        mockConsulta({ data: null, error: ERROR_RED });

        expect(await obtenerEntrega("ped1")).toEqual({ entrega: null, error: MENSAJES_DATOS.CONEXION });
    });
});

describe("marcarEntregado", () => {
    it("solo cambia a entregado si sigue en camino", async () => {
        const consulta = mockConsulta({ data: [{ id: "ped1" }], error: null });

        expect(await marcarEntregado("ped1")).toEqual({ resultado: "ok", error: null });
        expect(consulta.update).toHaveBeenCalledWith({ estado: "entregado" });
        expect(consulta.eq).toHaveBeenCalledWith("id", "ped1");
        expect(consulta.eq).toHaveBeenCalledWith("estado", "en_camino");
    });

    it("si ya no estaba en camino no actualiza ninguna fila", async () => {
        mockConsulta({ data: [], error: null });

        expect(await marcarEntregado("ped1")).toEqual({ resultado: "desactualizado", error: MENSAJES_REPARTIDOR.YA_NO_DISPONIBLE });
    });

    it("error de la base de datos", async () => {
        mockConsulta({ data: null, error: { code: "P0001", message: "Cambio de estado no permitido" } });

        expect(await marcarEntregado("ped1")).toEqual({ resultado: "error", error: MENSAJES_REPARTIDOR.ACTUALIZAR });
    });
});

describe("marcarNoEntregado (F07 M2)", () => {
    it("guarda el motivo sin espacios de sobra, solo si sigue en camino", async () => {
        const consulta = mockConsulta({ data: [{ id: "ped1" }], error: null });

        expect(await marcarNoEntregado("ped1", "  Nadie recibió el pedido ")).toEqual({ resultado: "ok", error: null });
        expect(consulta.update).toHaveBeenCalledWith({ estado: "no_entregado", motivo_no_entrega: "Nadie recibió el pedido" });
        expect(consulta.eq).toHaveBeenCalledWith("id", "ped1");
        expect(consulta.eq).toHaveBeenCalledWith("estado", "en_camino");
    });

    it("sin motivo no consulta la base", async () => {
        expect(await marcarNoEntregado("ped1", "   ")).toEqual({ resultado: "error", error: MENSAJES_REPARTIDOR.SIN_MOTIVO });
        expect(supabase.from).not.toHaveBeenCalled();
    });

    it("si ya no estaba en camino no actualiza ninguna fila", async () => {
        mockConsulta({ data: [], error: null });

        expect(await marcarNoEntregado("ped1", "Otro motivo")).toEqual({ resultado: "desactualizado", error: MENSAJES_REPARTIDOR.YA_NO_DISPONIBLE });
    });

    it("error de la base de datos", async () => {
        mockConsulta({ data: null, error: { code: "P0001", message: "Cambio de estado no permitido" } });

        expect(await marcarNoEntregado("ped1", "Otro motivo")).toEqual({ resultado: "error", error: MENSAJES_REPARTIDOR.ACTUALIZAR });
    });
});
