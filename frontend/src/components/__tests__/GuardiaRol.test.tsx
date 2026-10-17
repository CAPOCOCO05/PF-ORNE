import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import GuardiaRol from "../GuardiaRol";
import { useAuth } from "../../context/AuthContext";

jest.mock("expo-router", () => {
    const { Text } = jest.requireActual("react-native");
    return {
        Redirect: ({ href }: { href: string }) => <Text>{`redirect:${href}`}</Text>,
    };
});
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));

function mockAuth(valores: object) {
    (useAuth as jest.Mock).mockReturnValue({ perfil: null, loading: false, ...valores });
}

async function renderGuardia() {
    await render(
        <GuardiaRol rol="admin">
            <Text>contenido admin</Text>
        </GuardiaRol>
    );
}

describe("GuardiaRol", () => {
    it("mientras carga muestra el spinner y no el contenido", async () => {
        mockAuth({ loading: true });
        await renderGuardia();

        expect(screen.getByTestId("cargando")).toBeTruthy();
        expect(screen.queryByText("contenido admin")).toBeNull();
    });

    it("con el rol correcto muestra el contenido", async () => {
        mockAuth({ perfil: { id: "u1", nombre: "Ana", rol: "admin" } });
        await renderGuardia();

        expect(screen.getByText("contenido admin")).toBeTruthy();
    });

    it("con otro rol regresa a /", async () => {
        mockAuth({ perfil: { id: "u1", nombre: "Ana", rol: "cliente" } });
        await renderGuardia();

        expect(screen.getByText("redirect:/")).toBeTruthy();
        expect(screen.queryByText("contenido admin")).toBeNull();
    });

    it("sin sesion regresa a /", async () => {
        mockAuth({});
        await renderGuardia();

        expect(screen.getByText("redirect:/")).toBeTruthy();
    });
});
