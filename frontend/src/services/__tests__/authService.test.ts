import { actualizarNombre, getPerfil, signIn, signUp } from "../authService";
import { MENSAJES_DATOS } from "../erroresDatos";
import { MENSAJES_AUTH } from "../authErrors";
import { supabase } from "../supabase";
import { llamadaFetch, simularApi, simularSinConexion } from "../../test-utils/apiSimulada";

jest.mock("../supabase", () => ({
    supabase: {
        auth: { signInWithPassword: jest.fn(), signUp: jest.fn(), getSession: jest.fn() },
    },
}));

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { access_token: "tok" } } });
});

describe("getPerfil (API /perfil)", () => {
    it("devuelve el perfil del usuario de la sesion", async () => {
        const perfil = { id: "u1", nombre: "Ana", rol: "cliente" };
        const fetchMock = simularApi({ status: 200, cuerpo: { perfil } });

        const resultado = await getPerfil();

        const [url, opciones] = llamadaFetch(fetchMock);
        expect(url).toBe("/perfil");
        expect(opciones.headers).toHaveProperty("Authorization", "Bearer tok");
        expect(resultado).toEqual({ perfil, error: null });
    });

    it("404: perfil null sin error (la sesion no tiene perfil)", async () => {
        simularApi({ status: 404, cuerpo: { error: "No encontramos tu perfil" } });

        expect(await getPerfil()).toEqual({ perfil: null, error: null });
    });

    it("sin internet: devuelve el error", async () => {
        simularSinConexion();

        expect(await getPerfil()).toEqual({ perfil: null, error: MENSAJES_DATOS.CONEXION });
    });
});

describe("signIn", () => {
    it("sin error devuelve error null", async () => {
        (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ data: {}, error: null });

        expect(await signIn({ email: "ana@mail.com", password: "secreto" })).toEqual({ error: null });
    });

    it("traduce credenciales invalidas", async () => {
        (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
            data: {}, error: { code: "invalid_credentials", status: 400, message: "Invalid login credentials" },
        });

        expect(await signIn({ email: "ana@mail.com", password: "mala" })).toEqual({ error: MENSAJES_AUTH.CREDENCIALES });
    });
});

describe("signUp", () => {
    const datos = { nombre: "Ana", email: "ana@mail.com", password: "secreto" };

    it("manda el nombre en los metadatos y no requiere confirmacion si hay sesion", async () => {
        (supabase.auth.signUp as jest.Mock).mockResolvedValue({ data: { session: {} }, error: null });

        expect(await signUp(datos)).toEqual({ error: null, requiereConfirmacion: false });
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
            email: "ana@mail.com", password: "secreto", options: { data: { nombre: "Ana" } },
        });
    });

    it("sin sesion: requiere confirmar el correo", async () => {
        (supabase.auth.signUp as jest.Mock).mockResolvedValue({ data: { session: null }, error: null });

        expect(await signUp(datos)).toEqual({ error: null, requiereConfirmacion: true });
    });

    it("traduce correo ya registrado", async () => {
        (supabase.auth.signUp as jest.Mock).mockResolvedValue({
            data: { session: null }, error: { code: "user_already_exists", status: 422, message: "User already registered" },
        });

        expect(await signUp(datos)).toEqual({ error: MENSAJES_AUTH.CORREO_REGISTRADO, requiereConfirmacion: false });
    });
});

describe("actualizarNombre (F07 M6)", () => {
    it("manda el nombre a PATCH /perfil", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { perfil: { id: "u1", nombre: "Ana López", rol: "cliente" } } });

        expect(await actualizarNombre("Ana López")).toEqual({ error: null });
        const [url, opciones] = llamadaFetch(fetchMock);
        expect(url).toBe("/perfil");
        expect(opciones.method).toBe("PATCH");
        expect(JSON.parse(opciones.body as string)).toEqual({ nombre: "Ana López" });
    });

    it("sin internet: mensaje de conexion", async () => {
        simularSinConexion();

        expect(await actualizarNombre("Ana López")).toEqual({ error: MENSAJES_DATOS.CONEXION });
    });

    it("nombre rechazado por la API: su mensaje", async () => {
        simularApi({ status: 400, cuerpo: { error: "Escribe tu nombre y al menos un apellido" } });

        expect(await actualizarNombre("Ana")).toEqual({ error: "Escribe tu nombre y al menos un apellido" });
    });
});
