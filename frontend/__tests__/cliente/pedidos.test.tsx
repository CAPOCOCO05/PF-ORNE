import { Alert } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Pedidos from "../../app/(cliente)/pedidos";
import { eliminarBorrador, listarMisPedidos } from "../../src/services/pedidosService";
import { ResumenPedido } from "../../src/types/pedido.types";

const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock("expo-router", () => {
    const { useEffect } = jest.requireActual("react");
    return {
        useRouter: () => ({ push: mockPush, navigate: mockNavigate }),
        useFocusEffect: (efecto: () => void) => useEffect(efecto, [efecto]),
    };
});
jest.mock("../../src/context/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
jest.mock("../../src/services/pedidosService", () => ({ listarMisPedidos: jest.fn(), eliminarBorrador: jest.fn() }));

const BORRADOR: ResumenPedido = {
    id: "ped1", estado: "borrador", folio: null, total: 790, pasoActual: 2, creadoEn: new Date(2026, 9, 17, 12).toISOString(),
    tamanio: "15", niveles: 2, tipoPan: "fresa", relleno: null,
};
const CONFIRMADO: ResumenPedido = {
    ...BORRADOR, id: "ped2", estado: "pendiente", folio: "AB12CD", total: 540, relleno: "chocolate",
};

beforeEach(() => {
    jest.clearAllMocks();
    (listarMisPedidos as jest.Mock).mockResolvedValue({ pedidos: [BORRADOR, CONFIRMADO], error: null });
});

describe("Mis pedidos", () => {
    it("lista los pedidos con su estado y resumen", async () => {
        await render(<Pedidos />);

        expect(await screen.findByText("Pedido sin confirmar")).toBeTruthy();
        expect(listarMisPedidos).toHaveBeenCalledWith("u1");
        expect(screen.getByText("Borrador")).toBeTruthy();
        expect(screen.getByText("15 personas · 2 niveles · Fresa")).toBeTruthy();
        expect(screen.getByText("$790.00 MXN")).toBeTruthy();
        expect(screen.getByText("Pedido AB12CD")).toBeTruthy();
        expect(screen.getByText("Pendiente")).toBeTruthy();
        expect(screen.getByText("15 personas · 2 niveles · Fresa con Chocolate")).toBeTruthy();
    });

    it("solo los borradores tienen 'Continuar pedido' y abre el wizard con el borrador", async () => {
        await render(<Pedidos />);

        await fireEvent.press(await screen.findByText("Continuar pedido"));

        expect(screen.getAllByText("Continuar pedido")).toHaveLength(1);
        expect(mockPush).toHaveBeenCalledWith({ pathname: "/pedido/nuevo", params: { borrador: "ped1" } });
    });

    it("eliminar pide confirmacion y quita el borrador de la lista", async () => {
        const alerta = jest.spyOn(Alert, "alert");
        (eliminarBorrador as jest.Mock).mockResolvedValue({ error: null });
        await render(<Pedidos />);

        await fireEvent.press(await screen.findByText("Eliminar"));
        expect(alerta.mock.calls[0][0]).toBe("¿Eliminar borrador?");
        expect(eliminarBorrador).not.toHaveBeenCalled();

        await alerta.mock.calls[0][2]?.find((b) => b.text === "Eliminar")?.onPress?.();

        expect(eliminarBorrador).toHaveBeenCalledWith("ped1", "u1");
        await waitFor(() => expect(screen.queryByText("Pedido sin confirmar")).toBeNull());
        expect(screen.getByText("Pedido AB12CD")).toBeTruthy();
    });

    it("si falla eliminar, avisa y conserva el borrador", async () => {
        const alerta = jest.spyOn(Alert, "alert");
        (eliminarBorrador as jest.Mock).mockResolvedValue({ error: "Error de conexión, inténtalo de nuevo" });
        await render(<Pedidos />);

        await fireEvent.press(await screen.findByText("Eliminar"));
        await alerta.mock.calls[0][2]?.find((b) => b.text === "Eliminar")?.onPress?.();

        await waitFor(() => expect(alerta).toHaveBeenLastCalledWith("No se pudo eliminar", "Error de conexión, inténtalo de nuevo"));
        expect(screen.getByText("Pedido sin confirmar")).toBeTruthy();
    });

    it("sin pedidos: invita a ver el catalogo", async () => {
        (listarMisPedidos as jest.Mock).mockResolvedValue({ pedidos: [], error: null });
        await render(<Pedidos />);

        await fireEvent.press(await screen.findByText("Ver catálogo"));

        expect(screen.getByText("Aún no tienes pedidos")).toBeTruthy();
        expect(mockNavigate).toHaveBeenCalledWith("/home");
    });

    it("error al cargar: mensaje y reintentar", async () => {
        (listarMisPedidos as jest.Mock)
            .mockResolvedValueOnce({ pedidos: [], error: "Error de conexión, inténtalo de nuevo" })
            .mockResolvedValueOnce({ pedidos: [BORRADOR], error: null });
        await render(<Pedidos />);

        await fireEvent.press(await screen.findByText("Reintentar"));

        expect(await screen.findByText("Pedido sin confirmar")).toBeTruthy();
        expect(listarMisPedidos).toHaveBeenCalledTimes(2);
    });
});
