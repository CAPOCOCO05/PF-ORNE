import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AdminPedidos from "../../app/admin/index";
import { listarPedidosAdmin } from "../../src/services/adminService";
import { PedidoAdminResumen } from "../../src/types/pedido.types";

const mockPush = jest.fn();
jest.mock("expo-router", () => {
    const { useEffect } = jest.requireActual("react");
    return {
        useRouter: () => ({ push: mockPush }),
        useFocusEffect: (efecto: () => void) => useEffect(efecto, [efecto]),
    };
});
jest.mock("../../src/services/supabase", () => ({ supabase: {} }));
jest.mock("../../src/services/adminService", () => ({
    ...jest.requireActual("../../src/services/adminService"),
    listarPedidosAdmin: jest.fn(),
}));

const PEDIDO: PedidoAdminResumen = {
    id: "ped1", estado: "pendiente", folio: "ORN-7K2QXM", total: 790, cliente: "Ana López",
    tipoEntrega: "domicilio", fechaEntrega: "2026-10-26", horaEntrega: "12:00",
};

beforeEach(() => {
    jest.clearAllMocks();
    (listarPedidosAdmin as jest.Mock).mockResolvedValue({ pedidos: [PEDIDO], hayMas: false, error: null });
});

describe("Lista de pedidos del admin", () => {
    it("muestra folio, cliente, entrega, total y estado; empieza en Activos", async () => {
        await render(<AdminPedidos />);

        expect(await screen.findByText("ORN-7K2QXM")).toBeTruthy();
        expect(listarPedidosAdmin).toHaveBeenCalledWith("activos", 0);
        expect(screen.getByText("Ana López")).toBeTruthy();
        expect(screen.getByText("lunes 26 oct 2026 · 12:00 – 14:00")).toBeTruthy();
        expect(screen.getByText("A domicilio")).toBeTruthy();
        expect(screen.getByText("$790.00 MXN")).toBeTruthy();
        expect(screen.getByText("Pendiente")).toBeTruthy();
    });

    it("al tocar un pedido abre su detalle", async () => {
        await render(<AdminPedidos />);

        await fireEvent.press(await screen.findByLabelText("Ver pedido ORN-7K2QXM"));

        expect(mockPush).toHaveBeenCalledWith("/admin/pedido/ped1");
    });

    it("al elegir un chip recarga con ese estado", async () => {
        await render(<AdminPedidos />);
        await screen.findByText("ORN-7K2QXM");

        await fireEvent.press(screen.getByText("Entregados"));

        await waitFor(() => expect(listarPedidosAdmin).toHaveBeenLastCalledWith("entregado", 0));
    });

    it("lista vacia: avisa que no hay pedidos en el estado", async () => {
        (listarPedidosAdmin as jest.Mock).mockResolvedValue({ pedidos: [], hayMas: false, error: null });
        await render(<AdminPedidos />);

        expect(await screen.findByText("No hay pedidos en este estado")).toBeTruthy();
    });

    it("error al cargar: mensaje y reintentar", async () => {
        (listarPedidosAdmin as jest.Mock)
            .mockResolvedValueOnce({ pedidos: [], hayMas: false, error: "Error de conexión, inténtalo de nuevo" })
            .mockResolvedValueOnce({ pedidos: [PEDIDO], hayMas: false, error: null });
        await render(<AdminPedidos />);

        expect(await screen.findByText("Error de conexión, inténtalo de nuevo")).toBeTruthy();
        await fireEvent.press(screen.getByText("Reintentar"));

        expect(await screen.findByText("ORN-7K2QXM")).toBeTruthy();
        expect(listarPedidosAdmin).toHaveBeenCalledTimes(2);
    });
});
