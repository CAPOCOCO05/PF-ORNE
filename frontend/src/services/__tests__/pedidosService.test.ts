import {
    BUCKET_REFERENCIAS, confirmarPedido, eliminarBorrador, filaEntrega, guardarBorrador, listarMisPedidos,
    MENSAJES_CONFIRMACION, obtenerBorrador, obtenerPedido,
} from "../pedidosService";
import { MENSAJES_DATOS } from "../erroresDatos";
import { supabase } from "../supabase";
import { ConsultaSimulada, consultaSimulada } from "../../test-utils/consultaSupabase";
import { ENTREGA_VACIA } from "../../utils/entrega";
import { DatosEntrega, PedidoEnCurso } from "../../types/pedido.types";

jest.mock("../supabase", () => ({ supabase: { from: jest.fn(), rpc: jest.fn(), storage: { from: jest.fn() } } }));

const ERROR_RED = { message: "TypeError: Network request failed", code: "" };

const PEDIDO: PedidoEnCurso = {
    id: null, tamanio: "15", niveles: 2, tipoPan: "fresa", relleno: "chocolate",
    mensaje: "  Feliz día  ", imagenLocal: null, imagenRuta: null, entrega: ENTREGA_VACIA, pasoActual: 1,
};

const DOMICILIO: DatosEntrega = {
    tipoEntrega: "domicilio", calle: " Calle Primera ", numeroExterior: "123", numeroInterior: "", colonia: "Centro",
    referencia: "  ", telefono: "646 123-4567", ubicacion: { latitud: 31.78, longitud: -116.59 },
    fechaEntrega: "2026-10-26", horaEntrega: "12:00",
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

    it("paso 4: guarda tambien los datos de entrega", async () => {
        const pedidos = consultaSimulada({ error: null });
        mockTablas({ pedidos, pedido_detalle: consultaSimulada({ error: null }) });

        await guardarBorrador({ ...PEDIDO, id: "ped1", entrega: DOMICILIO }, "u1", { pasoActual: 5, guardarEntrega: true });

        expect(pedidos.update).toHaveBeenCalledWith({ total: 790, paso_actual: 5, ...filaEntrega(DOMICILIO) });
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

describe("filaEntrega", () => {
    it("domicilio: limpia los textos, arma la direccion y guarda solo los digitos del telefono", () => {
        expect(filaEntrega(DOMICILIO)).toEqual({
            tipo_entrega: "domicilio", calle: "Calle Primera", numero_exterior: "123", numero_interior: null,
            colonia: "Centro", direccion: "Calle Primera 123, Centro", direccion_referencia: null,
            direccion_lat: 31.78, direccion_lng: -116.59, telefono_contacto: "6461234567",
            fecha_entrega: "2026-10-26", hora_entrega: "12:00",
        });
    });

    it("recoleccion: quita la direccion y las coordenadas aunque se hubieran capturado", () => {
        expect(filaEntrega({ ...DOMICILIO, tipoEntrega: "recoleccion" })).toEqual({
            tipo_entrega: "recoleccion", calle: null, numero_exterior: null, numero_interior: null,
            colonia: null, direccion: null, direccion_referencia: null, direccion_lat: null, direccion_lng: null,
            telefono_contacto: "6461234567", fecha_entrega: "2026-10-26", hora_entrega: "12:00",
        });
    });
});

describe("obtenerBorrador", () => {
    it("recupera los datos de entrega (hora sin segundos, coordenadas numericas)", async () => {
        mockTablas({
            pedidos: consultaSimulada({
                data: {
                    id: "ped1", estado: "borrador", folio: null, total: 790, paso_actual: 5, created_at: "2026-10-17",
                    tipo_entrega: "domicilio", calle: "Calle Primera", numero_exterior: "123", numero_interior: null,
                    colonia: "Centro", direccion: "Calle Primera 123, Centro", direccion_referencia: null,
                    direccion_lat: "31.7800000", direccion_lng: "-116.5900000", telefono_contacto: "6461234567",
                    fecha_entrega: "2026-10-26", hora_entrega: "12:00:00",
                    pedido_detalle: { tamanio: "15", niveles: 2, tipo_pan: "fresa", relleno: "chocolate" },
                },
                error: null,
            }),
        });

        const { pedido } = await obtenerBorrador("ped1");

        expect(pedido?.entrega).toEqual({ ...DOMICILIO, calle: "Calle Primera", referencia: "", telefono: "6461234567" });
    });

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
                mensaje: "", imagenLocal: null, imagenRuta: null, entrega: ENTREGA_VACIA, pasoActual: 2,
            },
            error: null,
        });
    });

    it("si no existe o ya no es borrador devuelve null", async () => {
        mockTablas({ pedidos: consultaSimulada({ data: null, error: null }) });

        expect(await obtenerBorrador("ped1")).toEqual({ pedido: null, error: null });
    });
});

describe("obtenerPedido", () => {
    it("devuelve el pedido confirmado con detalle y entrega, sin filtrar por estado", async () => {
        const pedidos = consultaSimulada({
            data: {
                id: "ped1", estado: "pendiente", folio: "ORN-7K2QXM", total: "790.00", paso_actual: 5, created_at: "2026-10-17",
                tipo_entrega: "recoleccion", telefono_contacto: "6461234567", fecha_entrega: "2026-10-26", hora_entrega: "10:00:00",
                calle: null, numero_exterior: null, numero_interior: null, colonia: null, direccion: null,
                direccion_referencia: null, direccion_lat: null, direccion_lng: null,
                pedido_detalle: [{ tamanio: "15", niveles: 2, tipo_pan: "fresa", relleno: "chocolate", decoracion_texto: "Feliz día", imagen_referencia_url: "u1/ped1/referencia.jpg" }],
            },
            error: null,
        });
        mockTablas({ pedidos });

        const { pedido, error } = await obtenerPedido("ped1");

        expect(error).toBeNull();
        expect(pedidos.eq).toHaveBeenCalledTimes(1);
        expect(pedido).toEqual({
            id: "ped1", estado: "pendiente", folio: "ORN-7K2QXM", total: 790, creadoEn: "2026-10-17",
            tamanio: "15", niveles: 2, tipoPan: "fresa", relleno: "chocolate", mensaje: "Feliz día",
            imagenRuta: "u1/ped1/referencia.jpg",
            entrega: { ...ENTREGA_VACIA, tipoEntrega: "recoleccion", telefono: "6461234567", fechaEntrega: "2026-10-26", horaEntrega: "10:00" },
        });
    });

    it("error de conexion", async () => {
        mockTablas({ pedidos: consultaSimulada({ data: null, error: ERROR_RED }) });

        expect(await obtenerPedido("ped1")).toEqual({ pedido: null, error: MENSAJES_DATOS.CONEXION });
    });
});

describe("confirmarPedido", () => {
    it("llama a confirmar_pedido y devuelve el folio y el total del servidor", async () => {
        (supabase.rpc as jest.Mock).mockResolvedValue({ data: [{ folio: "ORN-7K2QXM", total: "790.00" }], error: null });

        expect(await confirmarPedido("ped1")).toEqual({ folio: "ORN-7K2QXM", total: 790, error: null });
        expect(supabase.rpc).toHaveBeenCalledWith("confirmar_pedido", { p_pedido_id: "ped1" });
    });

    it.each([
        ["FECHA_NO_DISPONIBLE"], ["PEDIDO_INCOMPLETO"], ["FUERA_DE_ZONA"], ["PEDIDO_YA_CONFIRMADO"], ["PEDIDO_NO_ENCONTRADO"],
    ] as const)("traduce el codigo %s de la funcion", async (codigo) => {
        (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: codigo, code: "P0001" } });

        expect(await confirmarPedido("ped1")).toEqual({
            folio: null, total: null, error: { codigo, mensaje: MENSAJES_CONFIRMACION[codigo] },
        });
    });

    it("sin conexion: mensaje de la spec para reintentar", async () => {
        (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: ERROR_RED });

        expect((await confirmarPedido("ped1")).error).toEqual({
            codigo: "CONEXION", mensaje: "Error de conexión. Tu pedido no se ha enviado. Inténtalo de nuevo.",
        });
    });

    it("error desconocido: generico", async () => {
        (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: "otra cosa", code: "42501" } });

        expect((await confirmarPedido("ped1")).error?.codigo).toBe("GENERICO");
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
