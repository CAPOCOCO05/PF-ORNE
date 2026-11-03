import { Alert, Linking } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import RepartidorDetalleEntrega from "../../app/repartidor/entrega/[id]";
import { marcarEntregado, MENSAJES_REPARTIDOR, obtenerEntrega } from "../../src/services/repartidorService";
import { EntregaRepartidor } from "../../src/types/pedido.types";
import { ENTREGA_VACIA } from "../../src/utils/entrega";

const mockNavigate = jest.fn();
jest.mock("expo-router", () => ({
    useRouter: () => ({ navigate: mockNavigate }),
    useLocalSearchParams: () => ({ id: "ped1" }),
}));
jest.mock("react-native-maps", () => {
    const { View } = jest.requireActual("react-native");
    const MapView = ({ children, testID }: { children: React.ReactNode; testID: string }) => <View testID={testID}>{children}</View>;
    return { __esModule: true, default: MapView, Marker: () => null };
});
jest.mock("../../src/services/supabase", () => ({ supabase: {} }));
jest.mock("../../src/services/repartidorService", () => ({
    ...jest.requireActual("../../src/services/repartidorService"),
    obtenerEntrega: jest.fn(),
    marcarEntregado: jest.fn(),
}));

const ENTREGA: EntregaRepartidor = {
    id: "ped1", estado: "en_camino", folio: "ORN-7K2QXM", cliente: "Ana López", tamanio: "15", niveles: 2,
    entrega: {
        ...ENTREGA_VACIA, tipoEntrega: "domicilio", calle: "Calle Primera", numeroExterior: "123", colonia: "Centro",
        referencia: "Casa azul, portón negro", telefono: "6461234567", ubicacion: { latitud: 31.78, longitud: -116.59 },
        fechaEntrega: "2026-10-26", horaEntrega: "12:00",
    },
};

// presiona "Marcar como entregado" y confirma en el dialogo
async function confirmarEntrega(alerta: jest.SpyInstance) {
    await fireEvent.press(await screen.findByText("Marcar como entregado"));
    const botones = alerta.mock.calls[alerta.mock.calls.length - 1][2] as { text: string; onPress?: () => void }[];
    botones.find((b) => b.text === "Marcar como entregado")?.onPress?.();
}

let alerta: jest.SpyInstance;

beforeEach(() => {
    jest.clearAllMocks();
    alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (obtenerEntrega as jest.Mock).mockResolvedValue({ entrega: ENTREGA, error: null });
});

describe("Detalle de la entrega (repartidor)", () => {
    it("muestra mapa, direccion con referencias, horario, cliente y pastel, sin precios", async () => {
        await render(<RepartidorDetalleEntrega />);

        expect(await screen.findByText("Entrega ORN-7K2QXM")).toBeTruthy();
        expect(screen.getByTestId("mapa-destino")).toBeTruthy();
        expect(screen.getByText("Calle Primera 123, Centro")).toBeTruthy();
        expect(screen.getByText(/Casa azul, portón negro/)).toBeTruthy();
        expect(screen.getByText(/Ana López/)).toBeTruthy();
        expect(screen.getByText(/lunes 26 oct 2026/)).toBeTruthy();
        expect(screen.getByText(/12:00 – 14:00/)).toBeTruthy();
        expect(screen.getByText(/15 personas/)).toBeTruthy();
        expect(screen.queryByText(/\$/)).toBeNull();
    });

    it("Cómo llegar abre la app de mapas con la ruta", async () => {
        const abrir = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
        await render(<RepartidorDetalleEntrega />);

        await fireEvent.press(await screen.findByText("Cómo llegar"));

        expect(abrir).toHaveBeenCalledWith(expect.stringContaining("31.78%2C-116.59"));
    });

    it("sin coordenadas: no muestra el mapa y Cómo llegar busca por la direccion", async () => {
        (obtenerEntrega as jest.Mock).mockResolvedValue({ entrega: { ...ENTREGA, entrega: { ...ENTREGA.entrega, ubicacion: null } }, error: null });
        const abrir = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
        await render(<RepartidorDetalleEntrega />);

        await fireEvent.press(await screen.findByText("Cómo llegar"));

        expect(screen.queryByTestId("mapa-destino")).toBeNull();
        expect(abrir).toHaveBeenCalledWith(expect.stringContaining("Calle%20Primera%20123"));
    });

    it("al confirmar la entrega regresa a la lista", async () => {
        (marcarEntregado as jest.Mock).mockResolvedValue({ resultado: "ok", error: null });
        await render(<RepartidorDetalleEntrega />);

        await confirmarEntrega(alerta);

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/repartidor"));
        expect(marcarEntregado).toHaveBeenCalledWith("ped1");
    });

    it("si falla, avisa y se queda en el detalle", async () => {
        (marcarEntregado as jest.Mock).mockResolvedValue({ resultado: "error", error: MENSAJES_REPARTIDOR.ACTUALIZAR });
        await render(<RepartidorDetalleEntrega />);

        await confirmarEntrega(alerta);

        await waitFor(() => expect(alerta).toHaveBeenLastCalledWith("No se pudo actualizar", MENSAJES_REPARTIDOR.ACTUALIZAR));
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(screen.getByText("Marcar como entregado")).toBeTruthy();
    });

    it("pedido ya entregado: no ofrece marcarlo otra vez", async () => {
        (obtenerEntrega as jest.Mock).mockResolvedValue({ entrega: { ...ENTREGA, estado: "entregado" }, error: null });
        await render(<RepartidorDetalleEntrega />);

        expect(await screen.findByText(MENSAJES_REPARTIDOR.YA_NO_DISPONIBLE)).toBeTruthy();
        expect(screen.queryByText("Marcar como entregado")).toBeNull();
    });

    it("error al cargar: mensaje y reintentar", async () => {
        (obtenerEntrega as jest.Mock)
            .mockResolvedValueOnce({ entrega: null, error: "Error de conexión, inténtalo de nuevo" })
            .mockResolvedValueOnce({ entrega: ENTREGA, error: null });
        await render(<RepartidorDetalleEntrega />);

        await fireEvent.press(await screen.findByText("Reintentar"));

        expect(await screen.findByText("Entrega ORN-7K2QXM")).toBeTruthy();
    });
});
