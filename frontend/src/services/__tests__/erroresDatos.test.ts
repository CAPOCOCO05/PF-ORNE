import { MENSAJE_SIN_CONEXION, MENSAJES_DATOS, esErrorDeConexion, mensajeDeExcepcion, traducirErrorDatos } from "../erroresDatos";

describe("mensajeDeExcepcion (F10 A7)", () => {
    it("sin internet avisa la falta de conexion", () => {
        const excepcion = new Error("fetch failed: Unable to resolve host \"abc.supabase.co\"");
        expect(mensajeDeExcepcion(excepcion, MENSAJES_DATOS.IMAGEN)).toBe(MENSAJE_SIN_CONEXION);
    });

    it("otra falla usa el mensaje de la operacion", () => {
        expect(mensajeDeExcepcion(new Error("archivo no encontrado"), MENSAJES_DATOS.IMAGEN)).toBe(MENSAJES_DATOS.IMAGEN);
        expect(mensajeDeExcepcion("raro", MENSAJES_DATOS.IMAGEN)).toBe(MENSAJES_DATOS.IMAGEN);
    });

    it("el mensaje dice que no hay internet", () => {
        expect(MENSAJES_DATOS.CONEXION).toMatch(/Sin conexión a internet/);
        expect(MENSAJES_DATOS.GUARDAR_CONEXION).toMatch(/Sin conexión a internet/);
    });
});

beforeEach(() => jest.spyOn(console, "warn").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("traducirErrorDatos", () => {
    it.each([
        "TypeError: Network request failed",
        "TypeError: Failed to fetch",
        // expo/fetch (fetch global de Expo SDK 58) en modo avion (F10 A7)
        "Error: fetch failed: Unable to resolve host \"abc.supabase.co\": No address associated with hostname",
        "Error: fetch failed: Failed to connect to abc.supabase.co/10.0.0.1:443",
        "Error: fetch failed: The Internet connection appears to be offline.",
        "AuthRetryableFetchError: fetch failed: timeout",
    ])("'%s' es error de conexion", (message) => {
        expect(esErrorDeConexion({ message, code: "" })).toBe(true);
        expect(traducirErrorDatos({ message, code: "" })).toBe(MENSAJES_DATOS.CONEXION);
    });

    it("usa el mensaje de conexion de la operacion si se indica", () => {
        expect(traducirErrorDatos({ message: "Network request failed" }, MENSAJES_DATOS.GUARDAR_CONEXION))
            .toBe(MENSAJES_DATOS.GUARDAR_CONEXION);
    });

    it("un error del servidor (con codigo) da el mensaje generico", () => {
        expect(esErrorDeConexion({ message: "new row violates row-level security policy", code: "42501" })).toBe(false);
        expect(traducirErrorDatos({ message: "violates", code: "42501" })).toBe(MENSAJES_DATOS.GENERICO);
    });
});
