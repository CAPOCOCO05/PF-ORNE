import { fireEvent, render, screen } from "@testing-library/react-native";
import PantallaPerfil from "../PantallaPerfil";
import { useAuth } from "../../context/AuthContext";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));

const mockSignOut = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
        user: { email: "ana@mail.com" },
        perfil: { id: "u1", nombre: "Ana", rol: "repartidor" },
        signOut: mockSignOut,
    });
});

describe("PantallaPerfil", () => {
    it("muestra nombre, correo y rol", async () => {
        await render(<PantallaPerfil />);

        expect(screen.getByText("Ana")).toBeTruthy();
        expect(screen.getByText("ana@mail.com")).toBeTruthy();
        expect(screen.getByText("Repartidor")).toBeTruthy();
    });

    it("cerrar sesion llama a signOut", async () => {
        await render(<PantallaPerfil />);

        await fireEvent.press(screen.getByText("Cerrar sesión"));

        expect(mockSignOut).toHaveBeenCalled();
    });
});
