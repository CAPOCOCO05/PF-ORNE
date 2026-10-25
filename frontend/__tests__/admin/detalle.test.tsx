import { Alert } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
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
    cliente: "Ana López",
    repartidor: null,
    pago: { metodo: "tarjeta", monto: 790, estado: "simulado" },
};

// presiona el boton de la accion y luego el boton de confirmar del dialogo
async function confirmarAccion(alerta: jest.SpyInstance, titulo: string) {
    await fireEvent.press(screen.getByText(titulo));
    const botones = alerta.mock.calls[alerta.mock.calls.length - 1][2] as { text: string; onPress?: () => void }[];
    botones.find((b) => b.text === titulo)?.onPress?.();
}

let alerta: jest.SpyInstance;

beforeEach(() => {
    jest.clearAllMocks();
    alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
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
        expect(alerta.mock.calls[0][0]).toBe("¿Confirmar el pedido ORN-7K2QXM?");
        expect(cambiarEstado).not.toHaveBeenCalled();

        (obtenerPedidoAdmin as jest.Mock).mockResolvedValue({ pedido: { ...PEDIDO, estado: "confirmado" }, error: null });
        (alerta.mock.calls[0][2] as { text: string; onPress?: () => void }[]).find((b) => b.text === "Confirmar pedido")?.onPress?.();

        await waitFor(() => expect(cambiarEstado).toHaveBeenCalledWith({ id: "ped1", estadoActual: "pendiente", destino: "confirmado", repartidorId: undefined }));
        expect(await screen.findByText("Iniciar preparación")).toBeTruthy();
    });

    it("si falla, avisa y el estado mostrado no cambia", async () => {
        (cambiarEstado as jest.Mock).mockResolvedValue({ resultado: "error", error: MENSAJES_ADMIN.ACTUALIZAR });
        await render(<AdminDetallePedido />);
        await screen.findByText("Pedido ORN-7K2QXM");

        await confirmarAccion(alerta, "Confirmar pedido");

        await waitFor(() => expect(alerta).toHaveBeenLastCalledWith("No se pudo actualizar", MENSAJES_ADMIN.ACTUALIZAR));
        expect(obtenerPedidoAdmin).toHaveBeenCalledTimes(1);
        expect(screen.getByText("Confirmar pedido")).toBeTruthy();
    });

    it("si otro admin lo movio, recarga y avisa", async () => {
        (cambiarEstado as jest.Mock).mockResolvedValue({ resultado: "desactualizado", error: MENSAJES_ADMIN.ACTUALIZADO });
        await render(<AdminDetallePedido />);
        await screen.findByText("Pedido ORN-7K2QXM");

        (obtenerPedidoAdmin as jest.Mock).mockResolvedValue({ pedido: { ...PEDIDO, estado: "cancelado" }, error: null });
        await confirmarAccion(alerta, "Confirmar pedido");

        await waitFor(() => expect(alerta).toHaveBeenLastCalledWith("Aviso", "El pedido fue actualizado"));
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
        expect(alerta).not.toHaveBeenCalled();

        await fireEvent.press(screen.getByLabelText("Repartidor Luis"));
        await confirmarAccion(alerta, "Enviar a reparto");

        expect(alerta.mock.calls[0][1]).toBe("Repartidor: Luis");
        await waitFor(() => expect(cambiarEstado).toHaveBeenCalledWith({ id: "ped1", estadoActual: "listo", destino: "en_camino", repartidorId: "rep1" }));
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

    it("error al cargar: mensaje y reintentar", async () => {
        (obtenerPedidoAdmin as jest.Mock)
            .mockResolvedValueOnce({ pedido: null, error: "Error de conexión, inténtalo de nuevo" })
            .mockResolvedValueOnce({ pedido: PEDIDO, error: null });
        await render(<AdminDetallePedido />);

        await fireEvent.press(await screen.findByText("Reintentar"));

        expect(await screen.findByText("Pedido ORN-7K2QXM")).toBeTruthy();
    });
});
