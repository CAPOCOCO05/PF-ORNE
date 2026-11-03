import { fireEvent, render, screen } from "@testing-library/react-native";
import RepartidorEntregas from "../../app/repartidor/index";
import { listarEntregas } from "../../src/services/repartidorService";
import { EntregaResumen } from "../../src/types/pedido.types";

const mockPush = jest.fn();
jest.mock("expo-router", () => {
    const { useEffect } = jest.requireActual("react");
    return {
        useRouter: () => ({ push: mockPush }),
        useFocusEffect: (efecto: () => void) => useEffect(efecto, [efecto]),
    };
});
jest.mock("../../src/services/supabase", () => ({ supabase: {} }));
jest.mock("../../src/services/repartidorService", () => ({
    ...jest.requireActual("../../src/services/repartidorService"),
    listarEntregas: jest.fn(),
}));

const ENTREGA: EntregaResumen = {
    id: "ped1", folio: "ORN-7K2QXM", cliente: "Ana López", fechaEntrega: "2026-10-26", horaEntrega: "12:00",
    direccion: "Calle Primera 123, Centro",
};

beforeEach(() => {
    jest.clearAllMocks();
    (listarEntregas as jest.Mock).mockResolvedValue({ entregas: [ENTREGA], error: null });
});

describe("Mis entregas (repartidor)", () => {
    it("muestra folio, cliente, horario y direccion resumida", async () => {
        await render(<RepartidorEntregas />);

        expect(await screen.findByText("ORN-7K2QXM")).toBeTruthy();
        expect(screen.getByText("Ana López")).toBeTruthy();
        expect(screen.getByText("lunes 26 oct 2026 · 12:00 – 14:00")).toBeTruthy();
        expect(screen.getByText("Calle Primera 123, Centro")).toBeTruthy();
    });

    it("al tocar una entrega abre su detalle", async () => {
        await render(<RepartidorEntregas />);

        await fireEvent.press(await screen.findByLabelText("Ver entrega ORN-7K2QXM"));

        expect(mockPush).toHaveBeenCalledWith("/repartidor/entrega/ped1");
    });

    it("lista vacia", async () => {
        (listarEntregas as jest.Mock).mockResolvedValue({ entregas: [], error: null });
        await render(<RepartidorEntregas />);

        expect(await screen.findByText("No tienes entregas asignadas")).toBeTruthy();
    });

    it("error al cargar: mensaje y reintentar", async () => {
        (listarEntregas as jest.Mock)
            .mockResolvedValueOnce({ entregas: [], error: "Error de conexión, inténtalo de nuevo" })
            .mockResolvedValueOnce({ entregas: [ENTREGA], error: null });
        await render(<RepartidorEntregas />);

        expect(await screen.findByText("Error de conexión, inténtalo de nuevo")).toBeTruthy();
        await fireEvent.press(screen.getByText("Reintentar"));

        expect(await screen.findByText("ORN-7K2QXM")).toBeTruthy();
        expect(listarEntregas).toHaveBeenCalledTimes(2);
    });
});
