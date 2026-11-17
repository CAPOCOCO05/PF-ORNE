import { fireEvent, render, screen } from "@testing-library/react-native";
import Index from "../../app/index";
import { useAuth } from "../../src/context/AuthContext";

jest.mock("expo-router", () => {
    const { Text } = jest.requireActual("react-native");
    return {
        Redirect: ({ href }: { href: string }) => <Text>{`redirect:${href}`}</Text>,
    };
});
jest.mock("../../src/context/AuthContext", () => ({
    ERROR_SIN_PERFIL: "No se pudo cargar tu cuenta, inicia sesión de nuevo",
    useAuth: jest.fn(),
}));

const mockReintentar = jest.fn();
const mockSignOut = jest.fn();
const SESION = { user: { id: "u1" } };

function mockAuth(valores: object) {
    (useAuth as jest.Mock).mockReturnValue({
        session: null,
        perfil: null,
        loading: false,
        authError: null,
        reintentarPerfil: mockReintentar,
        signOut: mockSignOut,
        ...valores,
    });
}

beforeEach(() => jest.clearAllMocks());

describe("Index (redireccion inicial)", () => {
    it("mientras carga muestra el spinner", async () => {
        mockAuth({ loading: true });
        await render(<Index />);

        expect(screen.getByTestId("cargando")).toBeTruthy();
    });

    it("sin sesion va al catalogo (F09)", async () => {
        mockAuth({});
        await render(<Index />);

        expect(screen.getByText("redirect:/home")).toBeTruthy();
    });

    it.each([
        ["cliente", "/home"],
        ["admin", "/admin"],
        ["repartidor", "/repartidor"],
    ])("rol %s va a %s", async (rol, ruta) => {
        mockAuth({ session: SESION, perfil: { id: "u1", nombre: "Ana", rol } });
        await render(<Index />);

        expect(screen.getByText(`redirect:${ruta}`)).toBeTruthy();
    });

    it("sesion sin perfil: espera a que se cierre la sesion", async () => {
        mockAuth({ session: SESION, authError: "No se pudo cargar tu cuenta, inicia sesión de nuevo" });
        await render(<Index />);

        expect(screen.getByTestId("cargando")).toBeTruthy();
    });

    it("error de conexion: muestra el aviso y permite reintentar o cerrar sesion", async () => {
        mockAuth({ session: SESION, authError: "Error de conexión, inténtalo de nuevo" });
        await render(<Index />);

        expect(screen.getByText("Error de conexión, inténtalo de nuevo")).toBeTruthy();
        await fireEvent.press(screen.getByText("Reintentar"));
        expect(mockReintentar).toHaveBeenCalled();
        await fireEvent.press(screen.getByText("Cerrar sesión"));
        expect(mockSignOut).toHaveBeenCalled();
    });
});
