import { getPerfil, signIn, signUp } from "../authService";
import { MENSAJES_AUTH } from "../authErrors";
import { supabase } from "../supabase";

jest.mock("../supabase", () => ({
    supabase: {
        from: jest.fn(),
        auth: { signInWithPassword: jest.fn(), signUp: jest.fn() },
    },
}));

// simula la cadena from().select().eq().maybeSingle()
function mockConsulta(respuesta: {data: unknown; error: {message: string} | null}) {
    const maybeSingle = jest.fn().mockResolvedValue(respuesta);
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });
    return { select, eq };
}

describe("getPerfil", () => {
    it("devuelve el perfil del usuario", async () => {
        const perfil = { id: "u1", nombre: "Ana", rol: "cliente" };
        const { select, eq } = mockConsulta({ data: perfil, error: null });

        const resultado = await getPerfil("u1");

        expect(supabase.from).toHaveBeenCalledWith("perfiles");
        expect(select).toHaveBeenCalledWith("id, nombre, rol");
        expect(eq).toHaveBeenCalledWith("id", "u1");
        expect(resultado).toEqual({ perfil, error: null });
    });

    it("devuelve perfil null si el usuario no tiene perfil", async () => {
        mockConsulta({ data: null, error: null });

        expect(await getPerfil("u1")).toEqual({ perfil: null, error: null });
    });

    it("devuelve el mensaje de error si falla la consulta", async () => {
        mockConsulta({ data: null, error: { message: "Network request failed" } });

        expect(await getPerfil("u1")).toEqual({ perfil: null, error: "Network request failed" });
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
