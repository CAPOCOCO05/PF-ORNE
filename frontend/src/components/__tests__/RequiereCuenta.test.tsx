import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import RequiereCuenta from "../RequiereCuenta";
import { useAuth } from "../../context/AuthContext";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));

function mockAuth(valores: object) {
    (useAuth as jest.Mock).mockReturnValue({ session: null, loading: false, ...valores });
}

async function renderPantalla() {
    await render(
        <RequiereCuenta mensaje="Crea tu cuenta para ver tus pedidos.">
            <Text>datos del cliente</Text>
        </RequiereCuenta>
    );
}

beforeEach(() => jest.clearAllMocks());

describe("RequiereCuenta (F09)", () => {
    it("con sesion muestra la pantalla", async () => {
        mockAuth({ session: { user: { id: "u1" } } });
        await renderPantalla();

        expect(screen.getByText("datos del cliente")).toBeTruthy();
    });

    it("mientras carga no muestra ni la pantalla ni la invitacion", async () => {
        mockAuth({ loading: true });
        await renderPantalla();

        expect(screen.getByTestId("cargando")).toBeTruthy();
        expect(screen.queryByText("datos del cliente")).toBeNull();
    });

    it("sin sesion no monta la pantalla e invita a crear cuenta", async () => {
        mockAuth({});
        await renderPantalla();

        expect(screen.queryByText("datos del cliente")).toBeNull();
        expect(screen.getByText("Crea tu cuenta para ver tus pedidos.")).toBeTruthy();

        await fireEvent.press(screen.getByText("Crear cuenta"));
        expect(mockPush).toHaveBeenCalledWith("/register");

        await fireEvent.press(screen.getByText("Iniciar sesión"));
        expect(mockPush).toHaveBeenCalledWith("/login");
    });
});
