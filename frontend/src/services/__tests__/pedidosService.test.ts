import {
    BUCKET_REFERENCIAS, eliminarBorrador, guardarBorrador, listarMisPedidos, obtenerBorrador,
} from "../pedidosService";
import { MENSAJES_DATOS } from "../erroresDatos";
import { supabase } from "../supabase";
import { ConsultaSimulada, consultaSimulada } from "../../test-utils/consultaSupabase";
import { PedidoEnCurso } from "../../types/pedido.types";

jest.mock("../supabase", () => ({ supabase: { from: jest.fn(), storage: { from: jest.fn() } } }));

const ERROR_RED = { message: "TypeError: Network request failed", code: "" };

const PEDIDO: PedidoEnCurso = {
    id: null, tamanio: "15", niveles: 2, tipoPan: "fresa", relleno: "chocolate",
    mensaje: "  Feliz día  ", imagenLocal: null, imagenRuta: null, pasoActual: 1,
};

// una consulta por tabla
function mockTablas(tablas: Record<string, ConsultaSimulada>) {
    (supabase.from as jest.Mock).mockImplementation((tabla: string) => tablas[tabla]);
}

function mockStorage(archivos: string[] = []) {
    const bucket = {
        upload: jest.fn().mockResolvedValue({ error: null }),
        list: jest.fn().mockResolvedValue({ data: archivos.map((name) => ({ name })), error: null }),
        remove: jest.fn().mockResolvedValue({ error: null }),
    };
    (supabase.storage.from as jest.Mock).mockReturnValue(bucket);
    return bucket;
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
});

describe("guardarBorrador", () => {
    it("pedido nuevo: crea el borrador y hace upsert del detalle con el precio", async () => {
        const pedidos = consultaSimulada({ data: { id: "ped1" }, error: null });
        const detalle = consultaSimulada({ error: null });
        mockTablas({ pedidos, pedido_detalle: detalle });

        const resultado = await guardarBorrador(PEDIDO, "u1", { pasoActual: 2 });

        // 500 + 250 (nivel extra) + 40 (chocolate)
        expect(pedidos.insert).toHaveBeenCalledWith({ usuario_id: "u1", estado: "borrador", total: 790, paso_actual: 2 });
        expect(detalle.upsert).toHaveBeenCalledWith({
            pedido_id: "ped1", tamanio: "15", niveles: 2, tipo_pan: "fresa", relleno: "chocolate",
            decoracion_texto: "Feliz día", imagen_referencia_url: null, precio_estimado: 790,
        }, { onConflict: "pedido_id" });
        expect(resultado).toEqual({ id: "ped1", imagenRuta: null, error: null });
    });

    it("pedido existente: actualiza total y paso sin crear otro", async () => {
        const pedidos = consultaSimulada({ error: null });
        mockTablas({ pedidos, pedido_detalle: consultaSimulada({ error: null }) });

        await guardarBorrador({ ...PEDIDO, id: "ped1" }, "u1", { pasoActual: 3 });

        expect(pedidos.insert).not.toHaveBeenCalled();
        expect(pedidos.update).toHaveBeenCalledWith({ total: 790, paso_actual: 3 });
        expect(pedidos.eq).toHaveBeenCalledWith("id", "ped1");
    });

    it("sin conexion al crear: no hay id y da el mensaje de la spec", async () => {
        mockTablas({ pedidos: consultaSimulada({ data: null, error: ERROR_RED }) });

        expect(await guardarBorrador(PEDIDO, "u1", { pasoActual: 2 }))
            .toEqual({ id: null, imagenRuta: null, error: MENSAJES_DATOS.GUARDAR_CONEXION });
    });

    it("si falla el detalle conserva el id para reintentar", async () => {
        mockTablas({
            pedidos: consultaSimulada({ data: { id: "ped1" }, error: null }),
            pedido_detalle: consultaSimulada({ error: ERROR_RED }),
        });

        expect(await guardarBorrador(PEDIDO, "u1", { pasoActual: 2 }))
            .toEqual({ id: "ped1", imagenRuta: null, error: MENSAJES_DATOS.GUARDAR_CONEXION });
    });

    it("paso 3 con imagen nueva: la sube y borra la anterior", async () => {
        const detalle = consultaSimulada({ error: null });
        mockTablas({ pedidos: consultaSimulada({ error: null }), pedido_detalle: detalle });
        const bucket = mockStorage(["referencia.jpg", "referencia.png"]);
        const contenido = new ArrayBuffer(4);
        globalThis.fetch = jest.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(contenido) });

        const pedido = { ...PEDIDO, id: "ped1", imagenLocal: { uri: "file:///foto.png", mimeType: "image/png" } };
        const resultado = await guardarBorrador(pedido, "u1", { pasoActual: 3, sincronizarImagen: true });

        expect(supabase.storage.from).toHaveBeenCalledWith(BUCKET_REFERENCIAS);
        expect(bucket.upload).toHaveBeenCalledWith("u1/ped1/referencia.png", contenido, { contentType: "image/png", upsert: true });
        expect(bucket.remove).toHaveBeenCalledWith(["u1/ped1/referencia.jpg"]);
        expect(resultado.imagenRuta).toBe("u1/ped1/referencia.png");
        expect(detalle.upsert.mock.calls[0][0].imagen_referencia_url).toBe("u1/ped1/referencia.png");
    });

    it("paso 3 sin imagen: borra la que hubiera en Storage", async () => {
        mockTablas({ pedidos: consultaSimulada({ error: null }), pedido_detalle: consultaSimulada({ error: null }) });
        const bucket = mockStorage(["referencia.jpg"]);

        await guardarBorrador({ ...PEDIDO, id: "ped1" }, "u1", { pasoActual: 3, sincronizarImagen: true });

        expect(bucket.upload).not.toHaveBeenCalled();
        expect(bucket.remove).toHaveBeenCalledWith(["u1/ped1/referencia.jpg"]);
    });
});

describe("obtenerBorrador", () => {
    it("convierte la fila al estado del wizard", async () => {
        mockTablas({
            pedidos: consultaSimulada({
                data: {
                    id: "ped1", estado: "borrador", folio: null, total: 790, paso_actual: 2, created_at: "2026-10-17",
                    pedido_detalle: { tamanio: "15", niveles: 2, tipo_pan: "fresa", relleno: null, decoracion_texto: null, imagen_referencia_url: null },
                },
                error: null,
            }),
        });

        expect(await obtenerBorrador("ped1")).toEqual({
            pedido: {
                id: "ped1", tamanio: "15", niveles: 2, tipoPan: "fresa", relleno: null,
                mensaje: "", imagenLocal: null, imagenRuta: null, pasoActual: 2,
            },
            error: null,
        });
    });

    it("si no existe o ya no es borrador devuelve null", async () => {
        mockTablas({ pedidos: consultaSimulada({ data: null, error: null }) });

        expect(await obtenerBorrador("ped1")).toEqual({ pedido: null, error: null });
    });
});

describe("listarMisPedidos", () => {
    it("lista los pedidos del usuario, mas recientes primero", async () => {
        const pedidos = consultaSimulada({
            data: [{
                id: "ped1", estado: "pendiente", folio: "AB12", total: "790.00", paso_actual: 3, created_at: "2026-10-17",
                pedido_detalle: [{ tamanio: "15", niveles: 2, tipo_pan: "fresa", relleno: "chocolate" }],
            }],
            error: null,
        });
        mockTablas({ pedidos });

        const { pedidos: lista, error } = await listarMisPedidos("u1");

        expect(pedidos.eq).toHaveBeenCalledWith("usuario_id", "u1");
        expect(pedidos.order).toHaveBeenCalledWith("created_at", { ascending: false });
        expect(error).toBeNull();
        expect(lista).toEqual([{
            id: "ped1", estado: "pendiente", folio: "AB12", total: 790, pasoActual: 3, creadoEn: "2026-10-17",
            tamanio: "15", niveles: 2, tipoPan: "fresa", relleno: "chocolate",
        }]);
    });
});

describe("eliminarBorrador", () => {
    it("borra la imagen y despues el borrador", async () => {
        const pedidos = consultaSimulada({ error: null });
        mockTablas({ pedidos });
        const bucket = mockStorage(["referencia.png"]);

        expect(await eliminarBorrador("ped1", "u1")).toEqual({ error: null });
        expect(bucket.remove).toHaveBeenCalledWith(["u1/ped1/referencia.png"]);
        expect(pedidos.delete).toHaveBeenCalled();
        expect(pedidos.eq).toHaveBeenCalledWith("estado", "borrador");
    });

    it("si no se pudo borrar la imagen no borra el pedido", async () => {
        const pedidos = consultaSimulada({ error: null });
        mockTablas({ pedidos });
        const bucket = mockStorage();
        bucket.list.mockResolvedValue({ data: null, error: ERROR_RED });

        expect(await eliminarBorrador("ped1", "u1")).toEqual({ error: MENSAJES_DATOS.CONEXION });
        expect(pedidos.delete).not.toHaveBeenCalled();
    });
});
