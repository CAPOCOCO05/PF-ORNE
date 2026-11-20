import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { render } from "../../src/test-utils/renderConDialogo";
import PasoPago from "../../app/(cliente)/pedido/nuevo/pago";
import Confirmacion from "../../app/(cliente)/pedido/nuevo/confirmacion";
import { formatearClabe, generarClabe } from "../../src/utils/pago";
import { PedidoProvider, usePedido } from "../../src/context/PedidoContext";
import { confirmarPedido, MENSAJES_CONFIRMACION, obtenerPedido } from "../../src/services/pedidosService";
import { PedidoCompleto, PedidoEnCurso } from "../../src/types/pedido.types";
import { ENTREGA_VACIA } from "../../src/utils/entrega";

const mockReplace = jest.fn();
const mockDismissTo = jest.fn();
const mockNavigate = jest.fn();
jest.mock("expo-router", () => {
    const { useEffect } = jest.requireActual("react");
    return {
        useRouter: () => ({ replace: mockReplace, dismissTo: mockDismissTo, navigate: mockNavigate, back: jest.fn() }),
        useLocalSearchParams: () => ({ id: "ped1" }),
        useFocusEffect: (efecto: () => void) => useEffect(efecto, [efecto]),
    };
});
jest.mock("../../src/context/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
jest.mock("../../src/services/catalogoService", () => ({ obtenerPastel: jest.fn() }));
// los mensajes de pedidosService se usan reales; el cliente de Supabase no se carga
jest.mock("../../src/services/supabase", () => ({ supabase: {} }));
// F07 M7: sin datos guardados, el pedido nuevo empieza sin precarga
jest.mock("../../src/services/perfilService", () => ({ obtenerDatosCliente: jest.fn().mockResolvedValue({ datos: null, error: null }) }));
jest.mock("../../src/services/pedidosService", () => ({
    ...jest.requireActual("../../src/services/pedidosService"),
    guardarBorrador: jest.fn(),
    obtenerBorrador: jest.fn(),
    confirmarPedido: jest.fn(),
    obtenerPedido: jest.fn(),
    urlReferencia: jest.fn().mockResolvedValue({ url: null, error: null }),
}));

const ENTREGA = {
    ...ENTREGA_VACIA, tipoEntrega: "domicilio", calle: "Calle Primera", numeroExterior: "123", colonia: "Centro",
    ubicacion: { latitud: 31.78, longitud: -116.59 }, telefono: "6461234567", fechaEntrega: "2026-10-26", horaEntrega: "12:00",
} as const;

const PEDIDO: Partial<PedidoEnCurso> = {
    id: "ped1", tamanio: "15", niveles: 2, tipoPan: "fresa", relleno: "chocolate", mensaje: "Feliz día", entrega: ENTREGA,
};

function ConDatos({ children }: { children: React.ReactNode }) {
    const { actualizar } = usePedido();
    const { useEffect } = jest.requireActual("react");
    useEffect(() => actualizar(PEDIDO), []);
    return <>{children}</>;
}

async function renderPago() {
    await render(<PedidoProvider><ConDatos><PasoPago /></ConDatos></PedidoProvider>);
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe("Paso 5: pago", () => {
    it("el resumen muestra todo lo capturado en F01 y F02", async () => {
        await renderPago();

        // cada dato se muestra como "Etiqueta: valor"
        for (const texto of [
            "Tamaño: 15 personas", "Niveles: 2", "Pan: Fresa", "Relleno: Chocolate", "Domicilio: Calle Primera 123, Centro",
            "Fecha: lunes 26 oct 2026", "Horario: 12:00 – 14:00", "Teléfono: 6461234567",
        ]) {
            expect(screen.getByText(texto)).toBeTruthy();
        }
        expect(screen.getByText("Feliz día")).toBeTruthy();
    });

    it("'Editar' regresa al paso de la seccion", async () => {
        await renderPago();

        await fireEvent.press(screen.getByLabelText("Editar Sabor"));

        expect(mockDismissTo).toHaveBeenCalledWith("/pedido/nuevo/sabor");
    });

    it("al confirmar abre el comprobante en lugar del pago", async () => {
        (confirmarPedido as jest.Mock).mockResolvedValue({ folio: "ORN-7K2QXM", total: 790, error: null });
        await renderPago();

        await fireEvent.press(screen.getByText("Confirmar pedido"));

        await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({ pathname: "/pedido/nuevo/confirmacion", params: { id: "ped1" } }));
        expect(confirmarPedido).toHaveBeenCalledWith("ped1");
    });

    it("sin conexion: avisa y permite reintentar sin perder el pedido", async () => {
        (confirmarPedido as jest.Mock)
            .mockResolvedValueOnce({ folio: null, total: null, error: { codigo: "CONEXION", mensaje: MENSAJES_CONFIRMACION.CONEXION } })
            .mockResolvedValueOnce({ folio: "ORN-7K2QXM", total: 790, error: null });
        await renderPago();

        await fireEvent.press(screen.getByText("Confirmar pedido"));
        expect(await screen.findByText(MENSAJES_CONFIRMACION.CONEXION)).toBeTruthy();
        expect(mockReplace).not.toHaveBeenCalled();

        await fireEvent.press(screen.getByText("Reintentar"));

        await waitFor(() => expect(mockReplace).toHaveBeenCalled());
        expect(confirmarPedido).toHaveBeenCalledTimes(2);
    });

    it("fecha que ya no es valida: regresa al paso de entrega", async () => {
        (confirmarPedido as jest.Mock).mockResolvedValue({
            folio: null, total: null, error: { codigo: "FECHA_NO_DISPONIBLE", mensaje: MENSAJES_CONFIRMACION.FECHA_NO_DISPONIBLE },
        });
        await renderPago();

        await fireEvent.press(screen.getByText("Confirmar pedido"));
        expect(await screen.findByText("No se pudo confirmar")).toBeTruthy();
        await fireEvent.press(screen.getByTestId("dialogo-confirmar"));

        expect(mockDismissTo).toHaveBeenCalledWith("/pedido/nuevo/entrega");
    });

    it("ya confirmado: abre su comprobante", async () => {
        (confirmarPedido as jest.Mock).mockResolvedValue({
            folio: null, total: null, error: { codigo: "PEDIDO_YA_CONFIRMADO", mensaje: MENSAJES_CONFIRMACION.PEDIDO_YA_CONFIRMADO },
        });
        await renderPago();

        await fireEvent.press(screen.getByText("Confirmar pedido"));
        expect(await screen.findByText("No se pudo confirmar")).toBeTruthy();
        await fireEvent.press(screen.getByTestId("dialogo-confirmar"));

        expect(mockReplace).toHaveBeenCalledWith("/pedido/ped1");
    });
});

describe("Paso 6: confirmación", () => {
    const CONFIRMADO: PedidoCompleto = {
        id: "ped1", estado: "pendiente", folio: "ORN-7K2QXM", total: 790, creadoEn: "2026-10-22T12:00:00Z",
        tamanio: "15", niveles: 2, tipoPan: "fresa", relleno: "chocolate", mensaje: "", imagenRuta: null,
        entrega: { ...ENTREGA_VACIA, tipoEntrega: "recoleccion", telefono: "6461234567", fechaEntrega: "2026-10-26", horaEntrega: "10:00" },
        motivoNoEntrega: null,
    };

    it("muestra el folio, el total del servidor y los datos bancarios con el folio como referencia", async () => {
        (obtenerPedido as jest.Mock).mockResolvedValue({ pedido: CONFIRMADO, error: null });
        await render(<Confirmacion />);

        expect(await screen.findByText("ORN-7K2QXM")).toBeTruthy();
        expect(obtenerPedido).toHaveBeenCalledWith("ped1");
        expect(screen.getByText("Total: $790.00 MXN")).toBeTruthy();
        expect(screen.getByText(`CLABE: ${formatearClabe(generarClabe("ped1"))}`)).toBeTruthy();
        expect(screen.getByText("Referencia: ORN-7K2QXM")).toBeTruthy();
    });

    it("botones para salir del wizard", async () => {
        (obtenerPedido as jest.Mock).mockResolvedValue({ pedido: CONFIRMADO, error: null });
        await render(<Confirmacion />);
        await screen.findByText("ORN-7K2QXM");

        await fireEvent.press(screen.getByText("Ver mis pedidos"));
        expect(mockNavigate).toHaveBeenCalledWith("/pedidos");
        await fireEvent.press(screen.getByText("Volver al catálogo"));
        expect(mockNavigate).toHaveBeenCalledWith("/home");
    });

    it("pedido no entregado: avisa al cliente con el motivo (F07 M2)", async () => {
        (obtenerPedido as jest.Mock).mockResolvedValue({
            pedido: { ...CONFIRMADO, estado: "no_entregado", motivoNoEntrega: "Nadie recibió el pedido" }, error: null,
        });
        await render(<Confirmacion />);

        expect(await screen.findByText("No pudimos entregar tu pedido")).toBeTruthy();
        expect(screen.getByText("Motivo: Nadie recibió el pedido")).toBeTruthy();
        expect(screen.getByText(/No entregado ·/)).toBeTruthy();
    });

    it("sin entrega fallida no muestra el aviso", async () => {
        (obtenerPedido as jest.Mock).mockResolvedValue({ pedido: CONFIRMADO, error: null });
        await render(<Confirmacion />);
        await screen.findByText("ORN-7K2QXM");

        expect(screen.queryByTestId("aviso-no-entregado")).toBeNull();
    });

    it("si no carga, permite reintentar", async () => {
        (obtenerPedido as jest.Mock)
            .mockResolvedValueOnce({ pedido: null, error: "Error de conexión, inténtalo de nuevo" })
            .mockResolvedValueOnce({ pedido: CONFIRMADO, error: null });
        await render(<Confirmacion />);

        await fireEvent.press(await screen.findByText("Reintentar"));

        expect(await screen.findByText("ORN-7K2QXM")).toBeTruthy();
    });
});
