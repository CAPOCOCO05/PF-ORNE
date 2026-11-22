import { cambiarEstado, contarPorEstado, listarPedidosAdmin, listarRepartidores, MENSAJES_ADMIN, obtenerPedidoAdmin } from "../adminService";
import { MENSAJE_SIN_CONEXION, MENSAJES_DATOS } from "../erroresDatos";
import { supabase } from "../supabase";
import { llamadaFetch, simularApi, simularSinConexion } from "../../test-utils/apiSimulada";

// panel admin (F04) por medio de la API (/admin)
jest.mock("../supabase", () => ({ supabase: { auth: { getSession: jest.fn() } } }));

const RESUMEN = { id: "p1", estado: "pendiente", folio: "ORN-1", total: 790, cliente: "Ana", tipoEntrega: "domicilio", fechaEntrega: "2026-10-26", horaEntrega: "12:00" };

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { access_token: "tok-admin" } } });
});

describe("listarPedidosAdmin", () => {
    it("manda pestaña, chips y pagina", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { pedidos: [RESUMEN], hayMas: true } });

        const resultado = await listarPedidosAdmin({ pestania: "activos", estados: ["pendiente", "listo"] }, 1);

        const [url, opciones] = llamadaFetch(fetchMock);
        expect(url).toBe("/admin/pedidos?pestania=activos&estados=pendiente%2Clisto&pagina=1");
        expect(opciones.headers).toHaveProperty("Authorization", "Bearer tok-admin");
        expect(resultado).toEqual({ pedidos: [RESUMEN], hayMas: true, error: null });
    });

    it("sin chips no manda estados", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { pedidos: [], hayMas: false } });

        await listarPedidosAdmin({ pestania: "entregado", estados: [] }, 0);

        expect(llamadaFetch(fetchMock)[0]).toBe("/admin/pedidos?pestania=entregado&pagina=0");
    });

    it("sin internet", async () => {
        simularSinConexion();

        expect(await listarPedidosAdmin({ pestania: "activos", estados: [] }, 0)).toEqual({ pedidos: [], hayMas: false, error: MENSAJES_DATOS.CONEXION });
    });
});

describe("contarPorEstado", () => {
    it("devuelve los conteos", async () => {
        const conteos = { pendiente: 3, confirmado: 0, en_preparacion: 0, listo: 1, en_camino: 0, entregado: 0, no_entregado: 0, cancelado: 0 };
        simularApi({ status: 200, cuerpo: { conteos } });

        expect(await contarPorEstado()).toEqual({ conteos, error: null });
    });

    it("sin internet: sin conteos y con mensaje", async () => {
        simularSinConexion();

        expect(await contarPorEstado()).toEqual({ conteos: null, error: MENSAJES_DATOS.CONEXION });
    });
});

describe("obtenerPedidoAdmin", () => {
    it("devuelve el pedido", async () => {
        const pedido = { ...RESUMEN, repartidor: null, pago: { metodo: "tarjeta", monto: 790, estado: "pendiente" } };
        const fetchMock = simularApi({ status: 200, cuerpo: { pedido } });

        expect(await obtenerPedidoAdmin("p1")).toEqual({ pedido, error: null });
        expect(llamadaFetch(fetchMock)[0]).toBe("/admin/pedidos/p1");
    });

    it("no encontrado (404): null sin error", async () => {
        simularApi({ status: 404, cuerpo: { error: "No encontramos este pedido" } });

        expect(await obtenerPedidoAdmin("p1")).toEqual({ pedido: null, error: null });
    });
});

describe("cambiarEstado", () => {
    it("manda el estado mostrado, el destino y el repartidor", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { resultado: "ok" } });

        const resultado = await cambiarEstado({ id: "p1", estadoActual: "listo", destino: "en_camino", repartidorId: "r1" });

        const [url, opciones] = llamadaFetch(fetchMock);
        expect(url).toBe("/admin/pedidos/p1/estado");
        expect(opciones.method).toBe("PATCH");
        expect(JSON.parse(opciones.body as string)).toEqual({ estadoActual: "listo", destino: "en_camino", repartidorId: "r1" });
        expect(resultado).toEqual({ resultado: "ok", error: null });
    });

    it("si otro admin ya lo movio: desactualizado", async () => {
        simularApi({ status: 409, cuerpo: { error: "El pedido fue actualizado", codigo: "DESACTUALIZADO" } });

        expect(await cambiarEstado({ id: "p1", estadoActual: "pendiente", destino: "confirmado" }))
            .toEqual({ resultado: "desactualizado", error: MENSAJES_ADMIN.ACTUALIZADO });
    });

    it("transicion rechazada u otro error", async () => {
        simularApi({ status: 409, cuerpo: { error: "Ese cambio de estado no está permitido" } });

        expect(await cambiarEstado({ id: "p1", estadoActual: "pendiente", destino: "entregado" }))
            .toEqual({ resultado: "error", error: MENSAJES_ADMIN.ACTUALIZAR });
    });

    it("sin internet avisa que no hay conexion (F10 A7)", async () => {
        simularSinConexion();

        expect(await cambiarEstado({ id: "p1", estadoActual: "pendiente", destino: "confirmado" }))
            .toEqual({ resultado: "error", error: MENSAJE_SIN_CONEXION });
    });
});

describe("listarRepartidores", () => {
    it("devuelve los repartidores", async () => {
        simularApi({ status: 200, cuerpo: { repartidores: [{ id: "r1", nombre: "Luis" }] } });

        expect(await listarRepartidores()).toEqual({ repartidores: [{ id: "r1", nombre: "Luis" }], error: null });
    });

    it("sin internet", async () => {
        simularSinConexion();

        expect(await listarRepartidores()).toEqual({ repartidores: [], error: MENSAJES_DATOS.CONEXION });
    });
});
