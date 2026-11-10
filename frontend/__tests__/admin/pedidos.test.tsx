import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AdminPedidos from "../../app/admin/index";
import { contarPorEstado, listarPedidosAdmin } from "../../src/services/adminService";
import { PedidoAdminResumen } from "../../src/types/pedido.types";

const mockPush = jest.fn();
// guarda el ultimo efecto de enfoque para simular que se regresa a la pantalla
let mockEnfocar: () => void = () => {};
jest.mock("expo-router", () => {
    const { useEffect } = jest.requireActual("react");
    return {
        useRouter: () => ({ push: mockPush }),
        useFocusEffect: (efecto: () => void) => {
            mockEnfocar = efecto;
            useEffect(efecto, [efecto]);
        },
    };
});
jest.mock("../../src/services/supabase", () => ({ supabase: {} }));
jest.mock("../../src/services/adminService", () => ({
    ...jest.requireActual("../../src/services/adminService"),
    listarPedidosAdmin: jest.fn(),
    contarPorEstado: jest.fn(),
}));

const CONTEOS = {
    pendiente: 3, confirmado: 5, en_preparacion: 2, listo: 1,
    en_camino: 4, entregado: 7, no_entregado: 0, cancelado: 2,
};
const TODOS_ACTIVOS = { pestania: "activos", estados: [] };

const PEDIDO: PedidoAdminResumen = {
    id: "ped1", estado: "pendiente", folio: "ORN-7K2QXM", total: 790, cliente: "Ana López",
    tipoEntrega: "domicilio", fechaEntrega: "2026-10-26", horaEntrega: "12:00",
};

beforeEach(() => {
    jest.clearAllMocks();
    (listarPedidosAdmin as jest.Mock).mockResolvedValue({ pedidos: [PEDIDO], hayMas: false, error: null });
    (contarPorEstado as jest.Mock).mockResolvedValue({ conteos: CONTEOS, error: null });
});

describe("Lista de pedidos del admin", () => {
    it("muestra folio, cliente, entrega, total y estado; empieza en Activos", async () => {
        await render(<AdminPedidos />);

        expect(await screen.findByText("ORN-7K2QXM")).toBeTruthy();
        expect(listarPedidosAdmin).toHaveBeenCalledWith(TODOS_ACTIVOS, 0);
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

    it("al elegir la pestaña Entregados recarga con ese estado y oculta los chips", async () => {
        await render(<AdminPedidos />);
        await screen.findByText("ORN-7K2QXM");

        await fireEvent.press(screen.getByText("Entregados"));

        await waitFor(() => expect(listarPedidosAdmin).toHaveBeenLastCalledWith({ pestania: "entregado", estados: [] }, 0));
        expect(screen.queryByText("Listos (1)")).toBeNull();
    });

    it("cada chip de Activos muestra cuantos pedidos hay en ese estado", async () => {
        await render(<AdminPedidos />);

        expect(await screen.findByText("Pendientes (3)")).toBeTruthy();
        expect(screen.getByText("Confirmados (5)")).toBeTruthy();
        expect(screen.getByText("En preparación (2)")).toBeTruthy();
        expect(screen.getByText("Listos (1)")).toBeTruthy();
        expect(screen.getByText("En camino (4)")).toBeTruthy();
        expect(screen.getByText("No entregados (0)")).toBeTruthy();
    });

    it("se pueden marcar varios estados y limpiar la seleccion", async () => {
        await render(<AdminPedidos />);
        await screen.findByText("Listos (1)");
        expect(screen.queryByText("Limpiar")).toBeNull();

        await fireEvent.press(screen.getByText("Listos (1)"));
        await waitFor(() => expect(listarPedidosAdmin).toHaveBeenLastCalledWith({ pestania: "activos", estados: ["listo"] }, 0));
        await fireEvent.press(screen.getByText("En camino (4)"));
        await waitFor(() => expect(listarPedidosAdmin).toHaveBeenLastCalledWith({ pestania: "activos", estados: ["listo", "en_camino"] }, 0));
        expect(screen.getByRole("checkbox", { name: "Listos (1)" }).props.accessibilityState).toEqual({ checked: true });

        await fireEvent.press(screen.getByText("Limpiar"));

        await waitFor(() => expect(listarPedidosAdmin).toHaveBeenLastCalledWith(TODOS_ACTIVOS, 0));
        expect(screen.queryByText("Limpiar")).toBeNull();
    });

    it("al regresar a la pantalla conserva la seleccion y recarga los contadores", async () => {
        await render(<AdminPedidos />);
        await fireEvent.press(await screen.findByText("Pendientes (3)"));
        await waitFor(() => expect(listarPedidosAdmin).toHaveBeenLastCalledWith({ pestania: "activos", estados: ["pendiente"] }, 0));
        (contarPorEstado as jest.Mock).mockResolvedValue({ conteos: { ...CONTEOS, pendiente: 2 }, error: null });

        await act(async () => mockEnfocar());

        expect(listarPedidosAdmin).toHaveBeenLastCalledWith({ pestania: "activos", estados: ["pendiente"] }, 0);
        expect(await screen.findByText("Pendientes (2)")).toBeTruthy();
    });

    it("si fallan los contadores, los chips se muestran sin numero y la lista carga", async () => {
        (contarPorEstado as jest.Mock).mockResolvedValue({ conteos: null, error: "Error de conexión, inténtalo de nuevo" });
        await render(<AdminPedidos />);

        expect(await screen.findByText("ORN-7K2QXM")).toBeTruthy();
        expect(screen.getByText("Listos")).toBeTruthy();
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
