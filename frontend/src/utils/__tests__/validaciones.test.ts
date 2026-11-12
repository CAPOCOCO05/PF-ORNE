import { MAX_NOMBRE, MENSAJES_VALIDACION as M, normalizarNombre, tieneErrores, validarCorreo, validarLogin, validarNombreCompleto, validarRegistro } from "../validaciones";

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
    const valido = {nombre: "Ana López", correo: "ana@mail.com", contrasena: "secreto", confirmar: "secreto"};

    it("datos validos: sin errores", () => {
        expect(tieneErrores(validarRegistro(valido))).toBe(false);
    });

    it("nombre solo con espacios es invalido", () => {
        expect(validarRegistro({...valido, nombre: "   "}).nombre).toBe(M.NOMBRE_VACIO);
    });

    it("una sola palabra como nombre es invalido (F07 M6)", () => {
        expect(validarRegistro({...valido, nombre: "Ana"}).nombre).toBe(M.NOMBRE_INCOMPLETO);
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

describe("normalizarNombre", () => {
    it("quita espacios de los extremos y colapsa los repetidos", () => {
        expect(normalizarNombre("  Ana    María   López ")).toBe("Ana María López");
    });
});

describe("validarNombreCompleto (F07 M6)", () => {
    it("acepta nombre y apellidos con acentos, ñ, apostrofo y guion", () => {
        expect(validarNombreCompleto("Ana López")).toBeUndefined();
        expect(validarNombreCompleto("José Ñúñez O'Brien")).toBeUndefined();
        expect(validarNombreCompleto("María-José de la Peña")).toBeUndefined();
        expect(validarNombreCompleto("  Ana   López  ")).toBeUndefined();
    });

    it("vacio o solo espacios", () => {
        expect(validarNombreCompleto("")).toBe(M.NOMBRE_VACIO);
        expect(validarNombreCompleto("   ")).toBe(M.NOMBRE_VACIO);
    });

    it("una sola palabra, o el apellido de una sola letra", () => {
        expect(validarNombreCompleto("Ana")).toBe(M.NOMBRE_INCOMPLETO);
        expect(validarNombreCompleto("Ana L")).toBe(M.NOMBRE_INCOMPLETO);
        expect(validarNombreCompleto("Ana -")).toBe(M.NOMBRE_INCOMPLETO);
    });

    it("numeros o simbolos no son validos", () => {
        expect(validarNombreCompleto("Ana López 2")).toBe(M.NOMBRE_CARACTERES);
        expect(validarNombreCompleto("Ana.López")).toBe(M.NOMBRE_CARACTERES);
        expect(validarNombreCompleto("Ana @López")).toBe(M.NOMBRE_CARACTERES);
    });

    it(`maximo ${MAX_NOMBRE} caracteres`, () => {
        const largo = `Ana ${"a".repeat(MAX_NOMBRE)}`;
        expect(validarNombreCompleto(largo)).toBe(M.NOMBRE_LARGO);
        expect(validarNombreCompleto(`Ana ${"a".repeat(MAX_NOMBRE - 4)}`)).toBeUndefined();
    });
});
