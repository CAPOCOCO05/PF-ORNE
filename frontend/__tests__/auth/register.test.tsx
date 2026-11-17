import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { render } from "../../src/test-utils/renderConDialogo";
import Register from "../../app/(auth)/register";
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

const mockSignUp = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    (useAuth as jest.Mock).mockReturnValue({ signUp: mockSignUp });
});

async function llenar(nombre: string) {
    await fireEvent.changeText(screen.getByPlaceholderText("Nombre y apellidos"), nombre);
    await fireEvent.changeText(screen.getByPlaceholderText("ejemplo@gmail.com"), "ana@mail.com");
    await fireEvent.changeText(screen.getByPlaceholderText("Mínimo 6 caracteres"), "secreto");
    await fireEvent.changeText(screen.getByPlaceholderText("Repite tu contraseña"), "secreto");
}

describe("Register (F00, F07 M6)", () => {
    it("informa del aviso de privacidad con un enlace, sin casilla (F08 N2)", async () => {
        await render(<Register />);

        expect(screen.getByText(/Al registrarte aceptas nuestro/)).toBeTruthy();
        expect(screen.getByText("Aviso de privacidad")).toBeTruthy();
        expect(screen.queryByRole("checkbox")).toBeNull();
    });

    it("pide el nombre completo con su ayuda", async () => {
        await render(<Register />);

        expect(screen.getByText("Nombre completo")).toBeTruthy();
        expect(screen.getByText("Lo usará el repartidor para entregarte tu pedido")).toBeTruthy();
    });

    it("con campos vacios muestra los errores y no registra", async () => {
        await render(<Register />);

        await fireEvent.press(screen.getByText("Registrarme"));

        expect(screen.getByText(MENSAJES_VALIDACION.NOMBRE_VACIO)).toBeTruthy();
        expect(screen.getByText(MENSAJES_VALIDACION.CORREO_VACIO)).toBeTruthy();
        expect(mockSignUp).not.toHaveBeenCalled();
    });

    it("una sola palabra como nombre no se puede registrar", async () => {
        await render(<Register />);

        await llenar("Ana");
        await fireEvent.press(screen.getByText("Registrarme"));

        expect(screen.getByText(MENSAJES_VALIDACION.NOMBRE_INCOMPLETO)).toBeTruthy();
        expect(screen.queryByText("Lo usará el repartidor para entregarte tu pedido")).toBeNull();
        expect(mockSignUp).not.toHaveBeenCalled();
    });

    it("nombre completo: registra con el nombre normalizado y va a /", async () => {
        mockSignUp.mockResolvedValue({ error: null, requiereConfirmacion: false });
        await render(<Register />);

        await llenar("  Ana   López  ");
        await fireEvent.press(screen.getByText("Registrarme"));

        await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
        expect(mockSignUp).toHaveBeenCalledWith({ nombre: "Ana López", email: "ana@mail.com", password: "secreto" });
    });

    it("error del servidor: se muestra y no navega", async () => {
        mockSignUp.mockResolvedValue({ error: "Este correo ya está registrado", requiereConfirmacion: false });
        await render(<Register />);

        await llenar("Ana López");
        await fireEvent.press(screen.getByText("Registrarme"));

        expect(await screen.findByText("Este correo ya está registrado")).toBeTruthy();
        expect(mockReplace).not.toHaveBeenCalled();
    });

    it("si venia de 'Crear pedido': explica el motivo y al registrarse abre el pedido (F09)", async () => {
        mockParams = { pedir: "nuevo" };
        mockSignUp.mockResolvedValue({ error: null, requiereConfirmacion: false });
        await render(<Register />);

        expect(screen.getByText("Crea tu cuenta para hacer tu pedido")).toBeTruthy();
        await llenar("Ana López");
        await fireEvent.press(screen.getByText("Registrarme"));

        await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith("/pedido/nuevo"));
        expect(mockReplace).not.toHaveBeenCalled();
    });

    it("sin pedido pendiente no muestra el motivo", async () => {
        await render(<Register />);

        expect(screen.queryByText("Crea tu cuenta para hacer tu pedido")).toBeNull();
        expect(screen.getByText("Ver catálogo sin cuenta")).toBeTruthy();
    });
});
