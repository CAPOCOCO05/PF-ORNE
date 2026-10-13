import { MENSAJES_AUTH, traducirErrorAuth } from "../authErrors";

describe("traducirErrorAuth", () => {
    it.each([
        ["invalid_credentials", MENSAJES_AUTH.CREDENCIALES],
        ["user_already_exists", MENSAJES_AUTH.CORREO_REGISTRADO],
        ["email_exists", MENSAJES_AUTH.CORREO_REGISTRADO],
        ["weak_password", MENSAJES_AUTH.CONTRASENA_DEBIL],
        ["over_request_rate_limit", MENSAJES_AUTH.DEMASIADOS_INTENTOS],
    ])("codigo %s → mensaje de la spec", (code, esperado) => {
        expect(traducirErrorAuth({code, status: 400, message: "x"})).toBe(esperado);
    });

    it("fallo de red → error de conexion", () => {
        expect(traducirErrorAuth({name: "AuthRetryableFetchError", message: "Network request failed"}))
            .toBe(MENSAJES_AUTH.CONEXION);
    });

    it("codigo desconocido → mensaje generico y se registra el detalle", () => {
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

        expect(traducirErrorAuth({code: "algo_nuevo", message: "detalle"})).toBe(MENSAJES_AUTH.GENERICO);
        expect(warn).toHaveBeenCalled();

        warn.mockRestore();
    });
});
