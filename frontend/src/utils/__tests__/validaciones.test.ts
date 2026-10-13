import { MENSAJES_VALIDACION as M, tieneErrores, validarCorreo, validarLogin, validarRegistro } from "../validaciones";

describe("validarCorreo", () => {
    it.each([
        ["", M.CORREO_VACIO],
        ["   ", M.CORREO_VACIO],
        ["ana", M.CORREO_INVALIDO],
        ["ana@mail", M.CORREO_INVALIDO],
        ["ana @mail.com", M.CORREO_INVALIDO],
    ])("'%s' → %s", (correo, esperado) => {
        expect(validarCorreo(correo)).toBe(esperado);
    });

    it("acepta un correo valido aunque tenga espacios alrededor", () => {
        expect(validarCorreo("  ana@mail.com ")).toBeUndefined();
    });
});

describe("validarLogin", () => {
    it("formulario vacio: error en ambos campos", () => {
        expect(validarLogin({correo: "", contrasena: ""})).toEqual({
            correo: M.CORREO_VACIO,
            contrasena: M.CONTRASENA_VACIA,
        });
    });

    it("datos validos: sin errores (no exige minimo de contraseña al iniciar sesion)", () => {
        const errores = validarLogin({correo: "ana@mail.com", contrasena: "123"});
        expect(tieneErrores(errores)).toBe(false);
    });
});

describe("validarRegistro", () => {
    const valido = {nombre: "Ana", correo: "ana@mail.com", contrasena: "secreto", confirmar: "secreto"};

    it("datos validos: sin errores", () => {
        expect(tieneErrores(validarRegistro(valido))).toBe(false);
    });

    it("nombre solo con espacios es invalido", () => {
        expect(validarRegistro({...valido, nombre: "   "}).nombre).toBe(M.NOMBRE_VACIO);
    });

    it("contraseña menor a 6 caracteres", () => {
        const errores = validarRegistro({...valido, contrasena: "12345", confirmar: "12345"});
        expect(errores.contrasena).toBe(M.CONTRASENA_CORTA);
    });

    it("confirmacion vacia o distinta", () => {
        expect(validarRegistro({...valido, confirmar: ""}).confirmar).toBe(M.CONFIRMAR_VACIO);
        expect(validarRegistro({...valido, confirmar: "otra123"}).confirmar).toBe(M.NO_COINCIDEN);
    });
});
