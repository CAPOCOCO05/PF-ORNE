import { guardarPastel, listarCatalogoAdmin, obtenerPastelAdmin, subirImagenCatalogo } from "../catalogoService";
import { MENSAJES_DATOS } from "../erroresDatos";
import { supabase } from "../supabase";
import { consultaSimulada } from "../../test-utils/consultaSupabase";
import { FORMULARIO_PASTEL_VACIO, MENSAJES_CATALOGO } from "../../utils/catalogo";
import { MENSAJES_PEDIDO } from "../../utils/pedido";
import { FormularioPastel } from "../../types/pedido.types";

// F07 M4: funciones del admin en catalogoService
jest.mock("../supabase", () => ({ supabase: { from: jest.fn(), storage: { from: jest.fn() } } }));

const ERROR_RED = { message: "TypeError: Network request failed", code: "" };
const URL_PUBLICA = "https://abc.supabase.co/storage/v1/object/public/catalogo/";
const IMAGEN = { uri: "file:///foto.jpg", mimeType: "image/jpeg" };

const FORMULARIO: FormularioPastel = {
    ...FORMULARIO_PASTEL_VACIO,
    nombre: "  Fiesta   de chocolate ", descripcion: "  ", tamanio: "20", niveles: 3, tipoPan: "chocolate", relleno: "chocolate",
};

let bucket: { upload: jest.Mock; getPublicUrl: jest.Mock; remove: jest.Mock };

function mockConsulta(respuesta: { data?: unknown; error: unknown }) {
    const consulta = consultaSimulada(respuesta);
    (supabase.from as jest.Mock).mockReturnValue(consulta);
    return consulta;
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    bucket = {
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn((ruta: string) => ({ data: { publicUrl: URL_PUBLICA + ruta } })),
        remove: jest.fn().mockResolvedValue({ error: null }),
    };
    (supabase.storage.from as jest.Mock).mockReturnValue(bucket);
    globalThis.fetch = jest.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)) });
});

describe("listarCatalogoAdmin", () => {
    it("trae publicados y ocultos, por nombre, de 10 en 10", async () => {
        const consulta = mockConsulta({ data: [{ id: "p1", nombre: "A", precio_base: "380.00", activo: false }], error: null });

        const resultado = await listarCatalogoAdmin(1);

        expect(consulta.eq).not.toHaveBeenCalled();
        expect(consulta.select).toHaveBeenCalledWith(expect.stringContaining("activo"));
        expect(consulta.order).toHaveBeenCalledWith("nombre");
        expect(consulta.range).toHaveBeenCalledWith(10, 20);
        expect(resultado).toEqual({ pasteles: [{ id: "p1", nombre: "A", precio_base: 380, activo: false }], hayMas: false, error: null });
    });

    it("error de conexion", async () => {
        mockConsulta({ data: null, error: ERROR_RED });

        expect(await listarCatalogoAdmin(0)).toEqual({ pasteles: [], hayMas: false, error: MENSAJES_DATOS.CONEXION });
    });
});

describe("obtenerPastelAdmin", () => {
    it("devuelve el pastel con su precio como numero", async () => {
        mockConsulta({ data: { id: "p1", precio_base: "930.00", activo: true }, error: null });

        expect(await obtenerPastelAdmin("p1")).toEqual({ pastel: { id: "p1", precio_base: 930, activo: true }, error: null });
    });

    it("no existe: pastel null sin error", async () => {
        mockConsulta({ data: null, error: null });

        expect(await obtenerPastelAdmin("x")).toEqual({ pastel: null, error: null });
    });
});

describe("subirImagenCatalogo", () => {
    it("sube al bucket catalogo con nombre unico y devuelve la URL publica", async () => {
        const resultado = await subirImagenCatalogo(IMAGEN);

        expect(supabase.storage.from).toHaveBeenCalledWith("catalogo");
        const [ruta, , opciones] = bucket.upload.mock.calls[0];
        expect(ruta).toMatch(/^pastel-\d+-[a-z0-9]+\.jpg$/);
        expect(opciones).toEqual({ contentType: "image/jpeg" });
        expect(resultado).toEqual({ url: URL_PUBLICA + ruta, error: null });
    });

    it("rechaza archivos que no son imagen", async () => {
        expect(await subirImagenCatalogo({ uri: "file:///a.pdf", mimeType: "application/pdf" })).toEqual({ url: null, error: MENSAJES_PEDIDO.IMAGEN_FORMATO });
        expect(bucket.upload).not.toHaveBeenCalled();
    });

    it("falla la subida: mensaje de la spec", async () => {
        bucket.upload.mockResolvedValue({ error: { message: "403" } });

        expect(await subirImagenCatalogo(IMAGEN)).toEqual({ url: null, error: MENSAJES_CATALOGO.IMAGEN });
    });
});

describe("guardarPastel", () => {
    it("alta sin imagen: inserta los datos limpios, sin precio_base", async () => {
        const consulta = mockConsulta({ data: { id: "nuevo1" }, error: null });

        const resultado = await guardarPastel(null, FORMULARIO);

        expect(consulta.insert).toHaveBeenCalledWith({
            nombre: "Fiesta de chocolate", descripcion: null, tamanio: "20", niveles: 3, tipo_pan: "chocolate",
            relleno: "chocolate", activo: true, imagen_url: null,
        });
        expect(resultado).toEqual({ id: "nuevo1", error: null, errorNombre: null });
        expect(bucket.upload).not.toHaveBeenCalled();
    });

    it("edicion con imagen nueva: sube, actualiza y borra la imagen anterior", async () => {
        const consulta = mockConsulta({ data: { id: "p1" }, error: null });

        await guardarPastel("p1", { ...FORMULARIO, imagenUrl: URL_PUBLICA + "vieja.jpg", imagenLocal: IMAGEN });

        const [ruta] = bucket.upload.mock.calls[0];
        expect(consulta.update).toHaveBeenCalledWith(expect.objectContaining({ imagen_url: URL_PUBLICA + ruta }));
        expect(consulta.eq).toHaveBeenCalledWith("id", "p1");
        expect(bucket.remove).toHaveBeenCalledWith(["vieja.jpg"]);
    });

    it("si no se puede borrar la imagen anterior, igual se guarda (D4)", async () => {
        mockConsulta({ data: { id: "p1" }, error: null });
        bucket.remove.mockResolvedValue({ error: { message: "403" } });

        const resultado = await guardarPastel("p1", { ...FORMULARIO, imagenUrl: URL_PUBLICA + "vieja.jpg", imagenLocal: IMAGEN });

        expect(resultado).toEqual({ id: "p1", error: null, errorNombre: null });
    });

    it("falla la subida: no se guarda nada", async () => {
        bucket.upload.mockResolvedValue({ error: { message: "500" } });

        const resultado = await guardarPastel(null, { ...FORMULARIO, imagenLocal: IMAGEN });

        expect(supabase.from).not.toHaveBeenCalled();
        expect(resultado).toEqual({ id: null, error: MENSAJES_CATALOGO.IMAGEN, errorNombre: null });
    });

    it("nombre repetido: error junto al campo y se borra la imagen recien subida", async () => {
        mockConsulta({ data: null, error: { message: "duplicate key", code: "23505" } });

        const resultado = await guardarPastel(null, { ...FORMULARIO, imagenLocal: IMAGEN });

        expect(resultado).toEqual({ id: null, error: null, errorNombre: MENSAJES_CATALOGO.NOMBRE_REPETIDO });
        expect(bucket.remove).toHaveBeenCalledWith([bucket.upload.mock.calls[0][0]]);
    });

    it("error de red al guardar: mensaje de conexion y no se toca la imagen publicada", async () => {
        mockConsulta({ data: null, error: ERROR_RED });

        const resultado = await guardarPastel("p1", { ...FORMULARIO, imagenUrl: URL_PUBLICA + "vieja.jpg" });

        expect(resultado).toEqual({ id: "p1", error: MENSAJES_DATOS.CONEXION, errorNombre: null });
        expect(bucket.remove).not.toHaveBeenCalled();
    });
});
