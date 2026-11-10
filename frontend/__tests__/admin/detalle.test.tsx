import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { render } from "../../src/test-utils/renderConDialogo";
import AdminDetallePedido from "../../app/admin/pedido/[id]";
import { cambiarEstado, listarRepartidores, MENSAJES_ADMIN, obtenerPedidoAdmin } from "../../src/services/adminService";
import { PedidoAdmin } from "../../src/types/pedido.types";
import { ENTREGA_VACIA } from "../../src/utils/entrega";

const mockNavigate = jest.fn();
jest.mock("expo-router", () => ({
    useRouter: () => ({ navigate: mockNavigate }),
    useLocalSearchParams: () => ({ id: "ped1" }),
}));
jest.mock("../../src/services/supabase", () => ({ supabase: {} }));
jest.mock("../../src/services/pedidosService", () => ({
    ...jest.requireActual("../../src/services/pedidosService"),
    urlReferencia: jest.fn().mockResolvedValue({ url: null, error: null }),
}));
jest.mock("../../src/services/adminService", () => ({
    ...jest.requireActual("../../src/services/adminService"),
    obtenerPedidoAdmin: jest.fn(),
    cambiarEstado: jest.fn(),
    listarRepartidores: jest.fn(),
}));

const PEDIDO: PedidoAdmin = {
    id: "ped1", estado: "pendiente", folio: "ORN-7K2QXM", total: 790, creadoEn: "2026-10-17T12:00:00Z",
    tamanio: "15", niveles: 2, tipoPan: "fresa", relleno: "chocolate", mensaje: "Feliz día", imagenRuta: null,
    entrega: {
        ...ENTREGA_VACIA, tipoEntrega: "domicilio", calle: "Calle Primera", numeroExterior: "123", colonia: "Centro",
        referencia: "Casa azul", telefono: "6461234567", ubicacion: { latitud: 31.78, longitud: -116.59 },
        fechaEntrega: "2026-10-26", horaEntrega: "12:00",
    },
    motivoNoEntrega: null,
    cliente: "Ana López",
    repartidor: null,
    pago: { metodo: "tarjeta", monto: 790, estado: "simulado" },
};

// presiona la accion en pantalla y luego la confirma en el dialogo (F07 M1)
async function confirmarAccion(titulo: string) {
    await fireEvent.press(screen.getByText(titulo));
    await fireEvent.press(screen.getByTestId("dialogo-confirmar"));
}

beforeEach(() => {
    jest.clearAllMocks();
    (obtenerPedidoAdmin as jest.Mock).mockResolvedValue({ pedido: PEDIDO, error: null });
    (listarRepartidores as jest.Mock).mockResolvedValue({ repartidores: [{ id: "rep1", nombre: "Luis" }], error: null });
});

describe("Detalle del pedido (admin)", () => {
    it("muestra todo lo capturado: cliente, pastel, sabores con imagen, entrega y pago", async () => {
        await render(<AdminDetallePedido />);

        expect(await screen.findByText("Pedido ORN-7K2QXM")).toBeTruthy();
        expect(screen.getByText(/Ana López/)).toBeTruthy();
        expect(screen.getByText(/15 personas/)).toBeTruthy();
        expect(screen.getByLabelText("Pan de Fresa")).toBeTruthy();
        expect(screen.getByLabelText("Relleno de Chocolate")).toBeTruthy();
        expect(screen.getByText("Feliz día")).toBeTruthy();
        expect(screen.getByText(/Casa azul/)).toBeTruthy();
        expect(screen.getByText(/Simulado/)).toBeTruthy();
    });

    it("pendiente: ofrece confirmar o cancelar, nada mas", async () => {
        await render(<AdminDetallePedido />);
        await screen.findByText("Pedido ORN-7K2QXM");

        expect(screen.getByText("Confirmar pedido")).toBeTruthy();
        expect(screen.getByText("Cancelar pedido")).toBeTruthy();
        expect(screen.queryByText("Marcar como listo")).toBeNull();
        expect(screen.queryByText("Enviar a reparto")).toBeNull();
    });

    it("pide confirmacion y cambia al siguiente estado", async () => {
        (cambiarEstado as jest.Mock).mockResolvedValue({ resultado: "ok", error: null });
        await render(<AdminDetallePedido />);
        await screen.findByText("Pedido ORN-7K2QXM");

        await fireEvent.press(screen.getByText("Confirmar pedido"));
        expect(screen.getByText("¿Confirmar el pedido ORN-7K2QXM?")).toBeTruthy();
        expect(cambiarEstado).not.toHaveBeenCalled();

        (obtenerPedidoAdmin as jest.Mock).mockResolvedValue({ pedido: { ...PEDIDO, estado: "confirmado" }, error: null });
        await fireEvent.press(screen.getByTestId("dialogo-confirmar"));

        await waitFor(() => expect(cambiarEstado).toHaveBeenCalledWith({ id: "ped1", estadoActual: "pendiente", destino: "confirmado", repartidorId: undefined, quitarRepartidor: undefined }));
        expect(await screen.findByText("Iniciar preparación")).toBeTruthy();
    });

    it("si falla, avisa y el estado mostrado no cambia", async () => {
        (cambiarEstado as jest.Mock).mockResolvedValue({ resultado: "error", error: MENSAJES_ADMIN.ACTUALIZAR });
        await render(<AdminDetallePedido />);
        await screen.findByText("Pedido ORN-7K2QXM");

        await confirmarAccion("Confirmar pedido");

        expect(await screen.findByText("No se pudo actualizar")).toBeTruthy();
        expect(screen.getByText(MENSAJES_ADMIN.ACTUALIZAR)).toBeTruthy();
        expect(obtenerPedidoAdmin).toHaveBeenCalledTimes(1);
        expect(screen.getByText("Confirmar pedido")).toBeTruthy();
    });

    it("si otro admin lo movio, recarga y avisa", async () => {
        (cambiarEstado as jest.Mock).mockResolvedValue({ resultado: "desactualizado", error: MENSAJES_ADMIN.ACTUALIZADO });
        await render(<AdminDetallePedido />);
        await screen.findByText("Pedido ORN-7K2QXM");

        (obtenerPedidoAdmin as jest.Mock).mockResolvedValue({ pedido: { ...PEDIDO, estado: "cancelado" }, error: null });
        await confirmarAccion("Confirmar pedido");

        expect(await screen.findByText("El pedido fue actualizado")).toBeTruthy();
        expect(obtenerPedidoAdmin).toHaveBeenCalledTimes(2);
        expect(screen.getByText("Cancelado")).toBeTruthy();
        expect(screen.queryByText("Confirmar pedido")).toBeNull();
    });

    it("listo a domicilio: no envia a reparto hasta elegir repartidor", async () => {
        (obtenerPedidoAdmin as jest.Mock).mockResolvedValue({ pedido: { ...PEDIDO, estado: "listo" }, error: null });
        (cambiarEstado as jest.Mock).mockResolvedValue({ resultado: "ok", error: null });
        await render(<AdminDetallePedido />);
        await screen.findByText("Pedido ORN-7K2QXM");

        await fireEvent.press(await screen.findByText("Enviar a reparto"));
        expect(screen.queryByTestId("dialogo")).toBeNull();

        await fireEvent.press(screen.getByLabelText("Repartidor Luis"));
        await fireEvent.press(screen.getByText("Enviar a reparto"));
        expect(screen.getByText("Repartidor: Luis")).toBeTruthy();
        await fireEvent.press(screen.getByTestId("dialogo-confirmar"));

        await waitFor(() => expect(cambiarEstado).toHaveBeenCalledWith({ id: "ped1", estadoActual: "listo", destino: "en_camino", repartidorId: "rep1", quitarRepartidor: undefined }));
    });

    it("sin repartidores registrados lo avisa", async () => {
        (obtenerPedidoAdmin as jest.Mock).mockResolvedValue({ pedido: { ...PEDIDO, estado: "listo" }, error: null });
        (listarRepartidores as jest.Mock).mockResolvedValue({ repartidores: [], error: null });
        await render(<AdminDetallePedido />);

        expect(await screen.findByText("No hay repartidores disponibles")).toBeTruthy();
    });

    it("listo para recoger: se marca como entregado sin repartidor", async () => {
        const recoleccion = { ...PEDIDO, estado: "listo", entrega: { ...PEDIDO.entrega, tipoEntrega: "recoleccion" } };
        (obtenerPedidoAdmin as jest.Mock).mockResolvedValue({ pedido: recoleccion, error: null });
        await render(<AdminDetallePedido />);

        expect(await screen.findByText("Marcar como entregado")).toBeTruthy();
        expect(screen.queryByText("Enviar a reparto")).toBeNull();
        expect(listarRepartidores).not.toHaveBeenCalled();
    });

    it("no entregado: muestra el motivo y ofrece reprogramar o cancelar (F07 M2)", async () => {
        const noEntregado = { ...PEDIDO, estado: "no_entregado", motivoNoEntrega: "Nadie recibió el pedido", repartidor: "Luis" };
        (obtenerPedidoAdmin as jest.Mock).mockResolvedValue({ pedido: noEntregado, error: null });
        await render(<AdminDetallePedido />);

        expect(await screen.findByText("No se pudo entregar")).toBeTruthy();
        expect(screen.getByText(/Motivo: Nadie recibió el pedido/)).toBeTruthy();
        expect(screen.getByText("Reprogramar entrega")).toBeTruthy();
        expect(screen.getByText("Cancelar pedido")).toBeTruthy();
        expect(screen.queryByText("Enviar a reparto")).toBeNull();
    });

    it("reprogramar regresa el pedido a listo sin repartidor", async () => {
        const noEntregado = { ...PEDIDO, estado: "no_entregado", motivoNoEntrega: "Nadie recibió el pedido", repartidor: "Luis" };
        (obtenerPedidoAdmin as jest.Mock).mockResolvedValue({ pedido: noEntregado, error: null });
        (cambiarEstado as jest.Mock).mockResolvedValue({ resultado: "ok", error: null });
        await render(<AdminDetallePedido />);
        await screen.findByText("Reprogramar entrega");

        await confirmarAccion("Reprogramar entrega");

        await waitFor(() => expect(cambiarEstado).toHaveBeenCalledWith({
            id: "ped1", estadoActual: "no_entregado", destino: "listo", repartidorId: undefined, quitarRepartidor: true,
        }));
    });

    it("pedido reprogramado: conserva el motivo como intento anterior", async () => {
        (obtenerPedidoAdmin as jest.Mock).mockResolvedValue({ pedido: { ...PEDIDO, estado: "listo", motivoNoEntrega: "Dirección incorrecta o no encontrada" }, error: null });
        await render(<AdminDetallePedido />);

        expect(await screen.findByText("Intento de entrega anterior")).toBeTruthy();
        expect(screen.getByText(/Motivo: Dirección incorrecta o no encontrada/)).toBeTruthy();
    });

    it("error al cargar: mensaje y reintentar", async () => {
        (obtenerPedidoAdmin as jest.Mock)
            .mockResolvedValueOnce({ pedido: null, error: "Error de conexión, inténtalo de nuevo" })
            .mockResolvedValueOnce({ pedido: PEDIDO, error: null });
        await render(<AdminDetallePedido />);

        await fireEvent.press(await screen.findByText("Reintentar"));

        expect(await screen.findByText("Pedido ORN-7K2QXM")).toBeTruthy();
    });
});
