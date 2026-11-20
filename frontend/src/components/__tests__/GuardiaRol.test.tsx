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

describe("GuardiaRol con permitirInvitado (F09)", () => {
    async function renderCliente() {
        await render(
            <GuardiaRol rol="cliente" permitirInvitado>
                <Text>catalogo</Text>
            </GuardiaRol>
        );
    }

    it("sin sesion deja ver la seccion", async () => {
        mockAuth({ session: null });
        await renderCliente();

        expect(screen.getByText("catalogo")).toBeTruthy();
    });

    it("con sesion de otro rol regresa a /", async () => {
        mockAuth({ session: { user: { id: "u1" } }, perfil: { id: "u1", nombre: "Ana", rol: "admin" } });
        await renderCliente();

        expect(screen.getByText("redirect:/")).toBeTruthy();
    });

    it("al abrir la app con sesion muestra el spinner mientras carga el perfil", async () => {
        mockAuth({ session: { user: { id: "u1" } }, loading: true });
        await renderCliente();

        expect(screen.getByTestId("cargando")).toBeTruthy();
        expect(screen.queryByText("catalogo")).toBeNull();
    });

    it("al registrarse no desmonta la seccion mientras carga el perfil (conserva el pedido elegido)", async () => {
        mockAuth({ session: null });
        const vista = await render(
            <GuardiaRol rol="cliente" permitirInvitado>
                <Text>catalogo</Text>
            </GuardiaRol>
        );
        expect(screen.getByText("catalogo")).toBeTruthy();

        mockAuth({ session: { user: { id: "u1" } }, loading: true });
        await vista.rerender(
            <GuardiaRol rol="cliente" permitirInvitado>
                <Text>catalogo</Text>
            </GuardiaRol>
        );

        expect(screen.getByText("catalogo")).toBeTruthy();
        expect(screen.queryByTestId("cargando")).toBeNull();
    });

    it("sin permitirInvitado y sin sesion regresa a /", async () => {
        mockAuth({ session: null });
        await renderGuardia();

        expect(screen.getByText("redirect:/")).toBeTruthy();
    });
});
