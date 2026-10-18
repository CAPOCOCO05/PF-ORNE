import { MENSAJES_DATOS, esErrorDeConexion, traducirErrorDatos } from "../erroresDatos";

beforeEach(() => jest.spyOn(console, "warn").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("traducirErrorDatos", () => {
    it.each([
        "TypeError: Network request failed",
        "TypeError: Failed to fetch",
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
