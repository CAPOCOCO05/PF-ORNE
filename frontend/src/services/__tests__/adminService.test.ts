import { cambiarEstado, listarPedidosAdmin, listarRepartidores, MENSAJES_ADMIN, obtenerPedidoAdmin } from "../adminService";
import { MENSAJES_DATOS } from "../erroresDatos";
import { supabase } from "../supabase";
import { consultaSimulada } from "../../test-utils/consultaSupabase";
import { ENTREGA_VACIA } from "../../utils/entrega";

jest.mock("../supabase", () => ({ supabase: { from: jest.fn() } }));

const ERROR_RED = { message: "TypeError: Network request failed", code: "" };

const FILA_RESUMEN = {
    id: "ped1", estado: "pendiente", folio: "ORN-7K2QXM", total: "790.00", tipo_entrega: "domicilio",
    fecha_entrega: "2026-10-26", hora_entrega: "12:00:00", cliente: { nombre: " Ana " },
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

describe("listarPedidosAdmin", () => {
    it("activos: filtra los estados en curso y ordena por la entrega mas proxima", async () => {
        const consulta = mockConsulta({ data: [FILA_RESUMEN], error: null });

        const resultado = await listarPedidosAdmin("activos", 0);

        expect(supabase.from).toHaveBeenCalledWith("pedidos");
        expect(consulta.in).toHaveBeenCalledWith("estado", ["pendiente", "confirmado", "en_preparacion", "listo", "en_camino", "no_entregado"]);
        expect(consulta.order).toHaveBeenCalledWith("fecha_entrega", { ascending: true });
        expect(consulta.order).toHaveBeenCalledWith("hora_entrega", { ascending: true });
        expect(consulta.range).toHaveBeenCalledWith(0, 10);
        expect(resultado).toEqual({
            pedidos: [{
                id: "ped1", estado: "pendiente", folio: "ORN-7K2QXM", total: 790, cliente: "Ana",
                tipoEntrega: "domicilio", fechaEntrega: "2026-10-26", horaEntrega: "12:00",
            }],
            hayMas: false,
            error: null,
        });
    });

    it("entregados: del mas reciente al mas antiguo, segunda pagina", async () => {
        const consulta = mockConsulta({ data: [], error: null });

        await listarPedidosAdmin("entregado", 1);

        expect(consulta.in).toHaveBeenCalledWith("estado", ["entregado"]);
        expect(consulta.order).toHaveBeenCalledWith("fecha_entrega", { ascending: false });
        expect(consulta.range).toHaveBeenCalledWith(10, 20);
    });

    it("si llega un registro de mas, hay otra pagina y no se muestra", async () => {
        const filas = Array.from({ length: 3 }, (_, i) => ({ ...FILA_RESUMEN, id: `ped${i}`, cliente: [{ nombre: "" }] }));
        mockConsulta({ data: filas, error: null });

        const resultado = await listarPedidosAdmin("pendiente", 0, 2);

        expect(resultado.hayMas).toBe(true);
        expect(resultado.pedidos.map((p) => p.id)).toEqual(["ped0", "ped1"]);
        expect(resultado.pedidos[0].cliente).toBe("Sin nombre");
    });

    it("error de conexion", async () => {
        mockConsulta({ data: null, error: ERROR_RED });

        expect(await listarPedidosAdmin("activos", 0)).toEqual({ pedidos: [], hayMas: false, error: MENSAJES_DATOS.CONEXION });
    });
});

describe("obtenerPedidoAdmin", () => {
    it("devuelve el pedido con cliente, repartidor y pago", async () => {
        mockConsulta({
            data: {
                id: "ped1", estado: "en_camino", folio: "ORN-7K2QXM", total: "790.00", paso_actual: 5, created_at: "2026-10-17",
                tipo_entrega: "recoleccion", telefono_contacto: "6461234567", fecha_entrega: "2026-10-26", hora_entrega: "10:00:00",
                calle: null, numero_exterior: null, numero_interior: null, colonia: null, direccion: null,
                direccion_referencia: null, direccion_lat: null, direccion_lng: null,
                pedido_detalle: { tamanio: "15", niveles: 2, tipo_pan: "fresa", relleno: "chocolate", decoracion_texto: null, imagen_referencia_url: null },
                cliente: { nombre: "Ana" },
                repartidor: { nombre: "Luis" },
                pagos: [{ metodo_pago: "tarjeta", monto: "790.00", estado_pago: "simulado" }],
            },
            error: null,
        });

        const { pedido, error } = await obtenerPedidoAdmin("ped1");

        expect(error).toBeNull();
        expect(pedido).toEqual({
            id: "ped1", estado: "en_camino", folio: "ORN-7K2QXM", total: 790, creadoEn: "2026-10-17",
            tamanio: "15", niveles: 2, tipoPan: "fresa", relleno: "chocolate", mensaje: "", imagenRuta: null,
            entrega: { ...ENTREGA_VACIA, tipoEntrega: "recoleccion", telefono: "6461234567", fechaEntrega: "2026-10-26", horaEntrega: "10:00" },
            motivoNoEntrega: null,
            cliente: "Ana",
            repartidor: "Luis",
            pago: { metodo: "tarjeta", monto: 790, estado: "simulado" },
        });
    });

    it("sin repartidor ni pago", async () => {
        mockConsulta({
            data: { id: "ped1", estado: "pendiente", folio: "X", total: 0, paso_actual: 5, created_at: "", pedido_detalle: null,
                cliente: null, repartidor: null, pagos: [] },
            error: null,
        });

        const { pedido } = await obtenerPedidoAdmin("ped1");

        expect(pedido?.repartidor).toBeNull();
        expect(pedido?.pago).toBeNull();
        expect(pedido?.cliente).toBe("Sin nombre");
    });

    it("no encontrado", async () => {
        mockConsulta({ data: null, error: null });

        expect(await obtenerPedidoAdmin("ped1")).toEqual({ pedido: null, error: null });
    });
});

describe("cambiarEstado", () => {
    it("actualiza solo si el pedido sigue en el estado mostrado", async () => {
        const consulta = mockConsulta({ data: [{ id: "ped1" }], error: null });

        const resultado = await cambiarEstado({ id: "ped1", estadoActual: "pendiente", destino: "confirmado" });

        expect(consulta.update).toHaveBeenCalledWith({ estado: "confirmado" });
        expect(consulta.eq).toHaveBeenCalledWith("id", "ped1");
        expect(consulta.eq).toHaveBeenCalledWith("estado", "pendiente");
        expect(resultado).toEqual({ resultado: "ok", error: null });
    });

    it("enviar a reparto asigna el repartidor en el mismo update", async () => {
        const consulta = mockConsulta({ data: [{ id: "ped1" }], error: null });

        await cambiarEstado({ id: "ped1", estadoActual: "listo", destino: "en_camino", repartidorId: "rep1" });

        expect(consulta.update).toHaveBeenCalledWith({ estado: "en_camino", repartidor_id: "rep1" });
    });

    it("reprogramar quita el repartidor en el mismo update (F07 M2)", async () => {
        const consulta = mockConsulta({ data: [{ id: "ped1" }], error: null });

        await cambiarEstado({ id: "ped1", estadoActual: "no_entregado", destino: "listo", quitarRepartidor: true });

        expect(consulta.update).toHaveBeenCalledWith({ estado: "listo", repartidor_id: null });
        expect(consulta.eq).toHaveBeenCalledWith("estado", "no_entregado");
    });

    it("si otro admin ya lo movio, no se actualiza ninguna fila", async () => {
        mockConsulta({ data: [], error: null });

        expect(await cambiarEstado({ id: "ped1", estadoActual: "pendiente", destino: "confirmado" }))
            .toEqual({ resultado: "desactualizado", error: MENSAJES_ADMIN.ACTUALIZADO });
    });

    it("error (transicion rechazada o red)", async () => {
        mockConsulta({ data: null, error: { message: "Cambio de estado no permitido", code: "P0001" } });

        expect(await cambiarEstado({ id: "ped1", estadoActual: "pendiente", destino: "listo" }))
            .toEqual({ resultado: "error", error: MENSAJES_ADMIN.ACTUALIZAR });
    });
});

describe("listarRepartidores", () => {
    it("solo perfiles con rol repartidor, por nombre", async () => {
        const consulta = mockConsulta({ data: [{ id: "rep1", nombre: "Luis" }, { id: "rep2", nombre: " " }], error: null });

        const resultado = await listarRepartidores();

        expect(supabase.from).toHaveBeenCalledWith("perfiles");
        expect(consulta.eq).toHaveBeenCalledWith("rol", "repartidor");
        expect(resultado).toEqual({ repartidores: [{ id: "rep1", nombre: "Luis" }, { id: "rep2", nombre: "Sin nombre" }], error: null });
    });

    it("error de conexion", async () => {
        mockConsulta({ data: null, error: ERROR_RED });

        expect(await listarRepartidores()).toEqual({ repartidores: [], error: MENSAJES_DATOS.CONEXION });
    });
});
