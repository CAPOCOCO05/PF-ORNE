import { guardarPastel, listarCatalogoAdmin, obtenerPastelAdmin, subirImagenCatalogo } from "../catalogoService";
import { MENSAJES_DATOS } from "../erroresDatos";
import { supabase } from "../supabase";
import { llamadaFetch, simularApi, simularSinConexion } from "../../test-utils/apiSimulada";
import { FORMULARIO_PASTEL_VACIO, MENSAJES_CATALOGO } from "../../utils/catalogo";
import { MENSAJES_PEDIDO } from "../../utils/pedido";
import { FormularioPastel } from "../../types/pedido.types";

// F07 M4: funciones del admin en catalogoService (peticiones a /admin/catalogo)
jest.mock("../supabase", () => ({ supabase: { auth: { getSession: jest.fn() } } }));

const URL_PUBLICA = "https://abc.supabase.co/storage/v1/object/public/catalogo/";
const IMAGEN = { uri: "file:///foto.jpg", mimeType: "image/jpeg" };

const FORMULARIO: FormularioPastel = {
    ...FORMULARIO_PASTEL_VACIO,
    nombre: "Fiesta de chocolate", tamanio: "20", niveles: 3, tipoPan: "chocolate", relleno: "chocolate",
};

function cuerpoEnviado(fetchMock: jest.Mock, n = 0) {
    return JSON.parse(llamadaFetch(fetchMock, n)[1].body as string);
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { access_token: "tok-admin" } } });
});

describe("listarCatalogoAdmin", () => {
    it("pide la pagina con el token del admin", async () => {
        const pasteles = [{ id: "p1", nombre: "A", precio_base: 380, activo: false }];
        const fetchMock = simularApi({ status: 200, cuerpo: { pasteles, hayMas: false } });

        const resultado = await listarCatalogoAdmin(1);

        const [url, opciones] = llamadaFetch(fetchMock);
        expect(url).toBe("/admin/catalogo?pagina=1");
        expect(opciones.headers).toHaveProperty("Authorization", "Bearer tok-admin");
        expect(resultado).toEqual({ pasteles, hayMas: false, error: null });
    });

    it("sin internet", async () => {
        simularSinConexion();

        expect(await listarCatalogoAdmin(0)).toEqual({ pasteles: [], hayMas: false, error: MENSAJES_DATOS.CONEXION });
    });
});

describe("obtenerPastelAdmin", () => {
    it("devuelve el pastel", async () => {
        simularApi({ status: 200, cuerpo: { pastel: { id: "p1", precio_base: 930, activo: true } } });

        expect(await obtenerPastelAdmin("p1")).toEqual({ pastel: { id: "p1", precio_base: 930, activo: true }, error: null });
    });

    it("no existe (404): pastel null sin error", async () => {
        simularApi({ status: 404, cuerpo: { error: MENSAJES_CATALOGO.NO_ENCONTRADO } });

        expect(await obtenerPastelAdmin("x")).toEqual({ pastel: null, error: null });
    });
});

describe("subirImagenCatalogo", () => {
    it("lee la imagen y la manda a la API con su tipo; devuelve la URL publica", async () => {
        const fetchMock = simularApi({ status: 200 }, { status: 201, cuerpo: { url: URL_PUBLICA + "pastel-1.jpg" } });

        const resultado = await subirImagenCatalogo(IMAGEN);

        expect(llamadaFetch(fetchMock, 0)[0]).toBe(IMAGEN.uri);
        const [url, opciones] = llamadaFetch(fetchMock, 1);
        expect(url).toBe("/admin/catalogo/imagenes");
        expect(opciones.method).toBe("POST");
        expect(opciones.headers).toHaveProperty("Content-Type", "image/jpeg");
        expect(opciones.body).toBeInstanceOf(ArrayBuffer);
        expect(resultado).toEqual({ url: URL_PUBLICA + "pastel-1.jpg", error: null });
    });

    it("rechaza archivos que no son imagen sin llamar a la API", async () => {
        const fetchMock = simularApi({ status: 201, cuerpo: {} });

        expect(await subirImagenCatalogo({ uri: "file:///a.pdf", mimeType: "application/pdf" })).toEqual({ url: null, error: MENSAJES_PEDIDO.IMAGEN_FORMATO });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("falla la subida: mensaje de la API", async () => {
        simularApi({ status: 200 }, { status: 502, cuerpo: { error: MENSAJES_CATALOGO.IMAGEN } });

        expect(await subirImagenCatalogo(IMAGEN)).toEqual({ url: null, error: MENSAJES_CATALOGO.IMAGEN });
    });
});

describe("guardarPastel", () => {
    it("alta sin imagen: POST con los datos del formulario", async () => {
        const fetchMock = simularApi({ status: 201, cuerpo: { id: "nuevo1" } });

        const resultado = await guardarPastel(null, FORMULARIO);

        expect(llamadaFetch(fetchMock)[0]).toBe("/admin/catalogo");
        expect(llamadaFetch(fetchMock)[1].method).toBe("POST");
        expect(cuerpoEnviado(fetchMock)).toEqual({
            nombre: "Fiesta de chocolate", descripcion: "", tamanio: "20", niveles: 3, tipoPan: "chocolate",
            relleno: "chocolate", activo: true, imagenUrl: null,
        });
        expect(resultado).toEqual({ id: "nuevo1", error: null, errorNombre: null });
    });

    it("edicion con imagen nueva: sube la imagen y hace PUT con su URL", async () => {
        const fetchMock = simularApi(
            { status: 200 },
            { status: 201, cuerpo: { url: URL_PUBLICA + "nueva.jpg" } },
            { status: 200, cuerpo: { id: "p1" } },
        );

        const resultado = await guardarPastel("p1", { ...FORMULARIO, imagenUrl: URL_PUBLICA + "vieja.jpg", imagenLocal: IMAGEN });

        expect(llamadaFetch(fetchMock, 2)[0]).toBe("/admin/catalogo/p1");
        expect(llamadaFetch(fetchMock, 2)[1].method).toBe("PUT");
        expect(cuerpoEnviado(fetchMock, 2)).toEqual(expect.objectContaining({ imagenUrl: URL_PUBLICA + "nueva.jpg" }));
        expect(resultado).toEqual({ id: "p1", error: null, errorNombre: null });
    });

    it("falla la subida: no se guarda nada", async () => {
        const fetchMock = simularApi({ status: 200 }, { status: 502, cuerpo: { error: MENSAJES_CATALOGO.IMAGEN } });

        const resultado = await guardarPastel(null, { ...FORMULARIO, imagenLocal: IMAGEN });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(resultado).toEqual({ id: null, error: MENSAJES_CATALOGO.IMAGEN, errorNombre: null });
    });

    it("nombre repetido (409): error junto al campo", async () => {
        simularApi({ status: 409, cuerpo: { error: MENSAJES_CATALOGO.NOMBRE_REPETIDO, detalles: { nombre: MENSAJES_CATALOGO.NOMBRE_REPETIDO } } });

        expect(await guardarPastel(null, FORMULARIO)).toEqual({ id: null, error: null, errorNombre: MENSAJES_CATALOGO.NOMBRE_REPETIDO });
    });

    it("sin internet al guardar: mensaje de conexion", async () => {
        simularSinConexion();

        expect(await guardarPastel("p1", FORMULARIO)).toEqual({ id: "p1", error: MENSAJES_DATOS.CONEXION, errorNombre: null });
    });
});
