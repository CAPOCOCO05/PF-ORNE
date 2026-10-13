import { renderHook, waitFor } from "@testing-library/react-native";
import { Session } from "@supabase/supabase-js";
import { AuthProvider, useAuth, ERROR_CONEXION, ERROR_SIN_PERFIL } from "../AuthContext";
import * as authService from "../../services/authService";

// el automock carga el modulo real: se evita crear el cliente de Supabase (AsyncStorage nativo)
jest.mock("../../services/supabase", () => ({ supabase: {} }));
jest.mock("../../services/authService");

const servicio = authService as jest.Mocked<typeof authService>;

const sesion = { user: { id: "u1" } } as Session;

function renderAuth() {
    return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

beforeEach(() => {
    jest.clearAllMocks();
    servicio.onAuthChange.mockReturnValue(() => {});
    servicio.signOut.mockResolvedValue();
});

describe("AuthContext", () => {
    it("sin sesion: termina de cargar sin perfil", async () => {
        servicio.getSession.mockResolvedValue(null);

        const { result } = await renderAuth();

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.perfil).toBeNull();
        expect(servicio.getPerfil).not.toHaveBeenCalled();
    });

    it("con sesion: sigue cargando hasta tener el perfil y expone el rol", async () => {
        const perfil = { id: "u1", nombre: "Ana", rol: "admin" as const };
        servicio.getSession.mockResolvedValue(sesion);
        servicio.getPerfil.mockResolvedValue({ perfil, error: null });

        const { result } = await renderAuth();

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.perfil).toEqual(perfil);
        expect(result.current.authError).toBeNull();
    });

    it("sesion sin perfil: cierra la sesion y muestra el aviso", async () => {
        servicio.getSession.mockResolvedValue(sesion);
        servicio.getPerfil.mockResolvedValue({ perfil: null, error: null });

        const { result } = await renderAuth();

        await waitFor(() => expect(result.current.authError).toBe(ERROR_SIN_PERFIL));
        expect(servicio.signOut).toHaveBeenCalled();
    });

    it("error al leer el perfil: conserva la sesion y avisa de la conexion", async () => {
        jest.spyOn(console, "warn").mockImplementation(() => {});
        servicio.getSession.mockResolvedValue(sesion);
        servicio.getPerfil.mockResolvedValue({ perfil: null, error: "Network request failed" });

        const { result } = await renderAuth();

        await waitFor(() => expect(result.current.authError).toBe(ERROR_CONEXION));
        expect(result.current.loading).toBe(false);
        expect(result.current.session).toBe(sesion);
        expect(servicio.signOut).not.toHaveBeenCalled();
    });
});
