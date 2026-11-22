import {
    confirmarPedido, eliminarBorrador, guardarBorrador, listarMisPedidos, MENSAJES_CONFIRMACION, obtenerBorrador, obtenerPedido,
    urlReferencia,
} from "../pedidosService";
import { MENSAJES_DATOS } from "../erroresDatos";
import { supabase } from "../supabase";
import { llamadaFetch, simularApi, simularSinConexion } from "../../test-utils/apiSimulada";
import { ENTREGA_VACIA } from "../../utils/entrega";
import { MENSAJES_PEDIDO } from "../../utils/pedido";
import { DatosEntrega, PedidoEnCurso } from "../../types/pedido.types";

// pedidos del cliente por medio de la API (/pedidos)
jest.mock("../supabase", () => ({ supabase: { auth: { getSession: jest.fn() } } }));

const PEDIDO: PedidoEnCurso = {
    id: null, tamanio: "15", niveles: 2, tipoPan: "fresa", relleno: "chocolate",
    mensaje: "Feliz día", imagenLocal: null, imagenRuta: null, entrega: ENTREGA_VACIA, pasoActual: 1,
};

const DOMICILIO: DatosEntrega = {
    tipoEntrega: "domicilio", calle: "Calle Primera", numeroExterior: "123", numeroInterior: "", colonia: "Centro",
    referencia: "", telefono: "6461234567", ubicacion: { latitud: 31.78, longitud: -116.59 },
    fechaEntrega: "2026-10-26", horaEntrega: "12:00",
};

const IMAGEN = { uri: "file:///foto.jpg", mimeType: "image/jpeg" };
const RUTA = "u1/ped1/referencia.jpg";

function cuerpo(fetchMock: jest.Mock, n = 0) {
    return JSON.parse(llamadaFetch(fetchMock, n)[1].body as string);
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { access_token: "tok" } } });
});

describe("guardarBorrador", () => {
    it("pedido nuevo: POST /pedidos con los datos del wizard (sin entrega)", async () => {
        const fetchMock = simularApi({ status: 201, cuerpo: { id: "ped1" } });

        const resultado = await guardarBorrador(PEDIDO, { pasoActual: 2 });

        const [url, opciones] = llamadaFetch(fetchMock);
        expect(url).toBe("/pedidos");
        expect(opciones.method).toBe("POST");
        expect(cuerpo(fetchMock)).toEqual({
            pasoActual: 2, tamanio: "15", niveles: 2, tipoPan: "fresa", relleno: "chocolate", mensaje: "Feliz día", entrega: null,
        });
        expect(resultado).toEqual({ id: "ped1", imagenRuta: null, error: null });
    });

    it("pedido existente en el paso 4: PATCH con los datos de entrega", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { id: "ped1" } });

        await guardarBorrador({ ...PEDIDO, id: "ped1", entrega: DOMICILIO }, { pasoActual: 5, guardarEntrega: true });

        expect(llamadaFetch(fetchMock)[0]).toBe("/pedidos/ped1");
        expect(llamadaFetch(fetchMock)[1].method).toBe("PATCH");
        expect(cuerpo(fetchMock).entrega).toEqual(DOMICILIO);
    });

    it("sin conexion: conserva el id y da el mensaje de la spec", async () => {
        simularSinConexion();

        expect(await guardarBorrador({ ...PEDIDO, id: "ped1" }, { pasoActual: 2 }))
            .toEqual({ id: "ped1", imagenRuta: null, error: MENSAJES_DATOS.GUARDAR_CONEXION });
    });

    it("paso 3 con imagen nueva: guarda el borrador y despues sube la imagen", async () => {
        const fetchMock = simularApi(
            { status: 201, cuerpo: { id: "ped1" } },
            { status: 200 },                                  // leer la imagen local
            { status: 201, cuerpo: { ruta: RUTA } },
        );

        const resultado = await guardarBorrador({ ...PEDIDO, imagenLocal: IMAGEN }, { pasoActual: 4, sincronizarImagen: true });

        expect(llamadaFetch(fetchMock, 1)[0]).toBe(IMAGEN.uri);
        const [url, opciones] = llamadaFetch(fetchMock, 2);
        expect(url).toBe("/pedidos/ped1/imagen");
        expect(opciones.headers).toHaveProperty("Content-Type", "image/jpeg");
        expect(resultado).toEqual({ id: "ped1", imagenRuta: RUTA, error: null });
    });

    it("paso 3 sin imagen: pide quitar la que hubiera", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { id: "ped1" } }, { status: 204 });

        const resultado = await guardarBorrador({ ...PEDIDO, id: "ped1" }, { pasoActual: 4, sincronizarImagen: true });

        expect(llamadaFetch(fetchMock, 1)[0]).toBe("/pedidos/ped1/imagen");
        expect(llamadaFetch(fetchMock, 1)[1].method).toBe("DELETE");
        expect(resultado).toEqual({ id: "ped1", imagenRuta: null, error: null });
    });

    it("paso 3 con la imagen ya guardada: no la vuelve a subir", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { id: "ped1" } });

        const resultado = await guardarBorrador({ ...PEDIDO, id: "ped1", imagenRuta: RUTA }, { pasoActual: 4, sincronizarImagen: true });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(resultado.imagenRuta).toBe(RUTA);
    });

    it("si falla la imagen conserva el id para reintentar", async () => {
        simularApi({ status: 201, cuerpo: { id: "ped1" } }, { status: 200 }, { status: 502, cuerpo: { error: MENSAJES_DATOS.IMAGEN } });

        expect(await guardarBorrador({ ...PEDIDO, imagenLocal: IMAGEN }, { pasoActual: 4, sincronizarImagen: true }))
            .toEqual({ id: "ped1", imagenRuta: null, error: MENSAJES_DATOS.IMAGEN });
    });

    it("archivo que no es imagen: no lo manda", async () => {
        const fetchMock = simularApi({ status: 201, cuerpo: { id: "ped1" } });

        const resultado = await guardarBorrador({ ...PEDIDO, imagenLocal: { uri: "file:///a.pdf", mimeType: "application/pdf" } }, { pasoActual: 4, sincronizarImagen: true });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(resultado.error).toBe(MENSAJES_PEDIDO.IMAGEN_FORMATO);
    });
});

describe("obtenerBorrador", () => {
    it("convierte la respuesta al estado del wizard", async () => {
        const borrador = { ...PEDIDO, id: "ped1", imagenRuta: RUTA, entrega: DOMICILIO, pasoActual: 4 };
        const { imagenLocal: _imagenLocal, ...respuesta } = borrador;
        simularApi({ status: 200, cuerpo: { pedido: respuesta } });

        expect(await obtenerBorrador("ped1")).toEqual({ pedido: { ...borrador, imagenLocal: null }, error: null });
    });

    it("404: null (ya no es borrador)", async () => {
        simularApi({ status: 404, cuerpo: { error: "Este pedido ya no está disponible" } });

        expect(await obtenerBorrador("ped1")).toEqual({ pedido: null, error: null });
    });
});

describe("obtenerPedido", () => {
    it("devuelve el pedido", async () => {
        const pedido = { id: "ped1", estado: "pendiente", folio: "ORN-1", total: 790 };
        const fetchMock = simularApi({ status: 200, cuerpo: { pedido } });

        expect(await obtenerPedido("ped1")).toEqual({ pedido, error: null });
        expect(llamadaFetch(fetchMock)[0]).toBe("/pedidos/ped1");
    });

    it("sin conexion", async () => {
        simularSinConexion();

        expect(await obtenerPedido("ped1")).toEqual({ pedido: null, error: MENSAJES_DATOS.CONEXION });
    });
});

describe("confirmarPedido", () => {
    it("devuelve el folio y el total del servidor", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { folio: "ORN-0001", total: 790 } });

        expect(await confirmarPedido("ped1")).toEqual({ folio: "ORN-0001", total: 790, error: null });
        expect(llamadaFetch(fetchMock)[0]).toBe("/pedidos/ped1/confirmar");
        expect(llamadaFetch(fetchMock)[1].method).toBe("POST");
    });

    it("usa el codigo de la API para saber que hacer", async () => {
        simularApi({ status: 409, cuerpo: { error: "La fecha...", codigo: "FECHA_NO_DISPONIBLE" } });

        expect((await confirmarPedido("ped1")).error)
            .toEqual({ codigo: "FECHA_NO_DISPONIBLE", mensaje: MENSAJES_CONFIRMACION.FECHA_NO_DISPONIBLE });
    });

    it("sin conexion: mensaje de la spec para reintentar", async () => {
        simularSinConexion();

        expect((await confirmarPedido("ped1")).error).toEqual({ codigo: "CONEXION", mensaje: MENSAJES_CONFIRMACION.CONEXION });
    });

    it("error sin codigo conocido: generico", async () => {
        simularApi({ status: 500, cuerpo: { error: "x" } });

        expect((await confirmarPedido("ped1")).error).toEqual({ codigo: "GENERICO", mensaje: MENSAJES_CONFIRMACION.GENERICO });
    });
});

describe("listarMisPedidos, eliminarBorrador y urlReferencia", () => {
    it("lista los pedidos del usuario de la sesion", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { pedidos: [{ id: "ped1" }] } });

        expect(await listarMisPedidos()).toEqual({ pedidos: [{ id: "ped1" }], error: null });
        expect(llamadaFetch(fetchMock)[0]).toBe("/pedidos");
    });

    it("elimina con DELETE", async () => {
        const fetchMock = simularApi({ status: 204 });

        expect(await eliminarBorrador("ped1")).toEqual({ error: null });
        expect(llamadaFetch(fetchMock)[1].method).toBe("DELETE");
    });

    it("pide la URL firmada de la imagen", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { url: "https://firmada" } });

        expect(await urlReferencia(RUTA)).toEqual({ url: "https://firmada", error: null });
        expect(llamadaFetch(fetchMock)[0]).toBe(`/pedidos/referencias/url?ruta=${encodeURIComponent(RUTA)}`);
    });
});
