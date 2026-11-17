import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { render } from "../../src/test-utils/renderConDialogo";
import Login from "../../app/(auth)/login";
import { useAuth } from "../../src/context/AuthContext";
import { MENSAJES_VALIDACION } from "../../src/utils/validaciones";

const mockReplace = jest.fn();
const mockDismissTo = jest.fn();
let mockParams: { pedir?: string } = {};
jest.mock("expo-router", () => {
    const { Text } = jest.requireActual("react-native");
    return {
        useRouter: () => ({ replace: mockReplace, dismissTo: mockDismissTo }),
        useLocalSearchParams: () => mockParams,
        Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
    };
});
jest.mock("../../src/context/AuthContext", () => ({ useAuth: jest.fn() }));

const mockSignIn = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    (useAuth as jest.Mock).mockReturnValue({ signIn: mockSignIn, authError: null });
});

async function llenar(correo: string, contrasena: string) {
    await fireEvent.changeText(screen.getByPlaceholderText("ejemplo@gmail.com"), correo);
    await fireEvent.changeText(screen.getByPlaceholderText("Ingresa tu contraseña"), contrasena);
}

describe("Login", () => {
    it("con campos vacios muestra los errores y no llama a signIn", async () => {
        await render(<Login />);

        await fireEvent.press(screen.getByText("Iniciar sesión"));

        expect(screen.getByText(MENSAJES_VALIDACION.CORREO_VACIO)).toBeTruthy();
        expect(screen.getByText(MENSAJES_VALIDACION.CONTRASENA_VACIA)).toBeTruthy();
        expect(mockSignIn).not.toHaveBeenCalled();
    });

    it("credenciales validas: inicia sesion con el correo sin espacios y va a /", async () => {
        mockSignIn.mockResolvedValue({ error: null });
        await render(<Login />);

        await llenar("  ana@mail.com ", "secreto");
        await fireEvent.press(screen.getByText("Iniciar sesión"));

        await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
        expect(mockSignIn).toHaveBeenCalledWith({ email: "ana@mail.com", password: "secreto" });
    });

    it("error del servidor: lo muestra en pantalla y no navega", async () => {
        mockSignIn.mockResolvedValue({ error: "Correo o contraseña incorrectos" });
        await render(<Login />);

        await llenar("ana@mail.com", "mala");
        await fireEvent.press(screen.getByText("Iniciar sesión"));

        expect(await screen.findByText("Correo o contraseña incorrectos")).toBeTruthy();
        expect(mockReplace).not.toHaveBeenCalled();
    });

    it("muestra el aviso del contexto (sesion sin perfil)", async () => {
        (useAuth as jest.Mock).mockReturnValue({
            signIn: mockSignIn,
            authError: "No se pudo cargar tu cuenta, inicia sesión de nuevo",
        });
        await render(<Login />);

        expect(screen.getByText("No se pudo cargar tu cuenta, inicia sesión de nuevo")).toBeTruthy();
    });

    it("si venia de 'Pedir', al iniciar sesion abre el pedido con ese pastel (F09)", async () => {
        mockParams = { pedir: "p1" };
        mockSignIn.mockResolvedValue({ error: null });
        await render(<Login />);

        await llenar("ana@mail.com", "secreto");
        await fireEvent.press(screen.getByText("Iniciar sesión"));

        await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith({ pathname: "/pedido/nuevo", params: { pastel: "p1" } }));
        expect(mockReplace).not.toHaveBeenCalled();
    });

    it("permite volver al catalogo sin cuenta (F09)", async () => {
        await render(<Login />);

        expect(screen.getByText("Ver catálogo sin cuenta")).toBeTruthy();
    });
});
