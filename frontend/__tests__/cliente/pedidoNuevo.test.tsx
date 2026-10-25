import { Alert } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import PasoTamanio from "../../app/(cliente)/pedido/nuevo/index";
import PasoSabor from "../../app/(cliente)/pedido/nuevo/sabor";
import PasoDecoracion from "../../app/(cliente)/pedido/nuevo/decoracion";
import { PedidoProvider, usePedido } from "../../src/context/PedidoContext";
import { guardarBorrador } from "../../src/services/pedidosService";
import { PedidoEnCurso } from "../../src/types/pedido.types";
import { MENSAJES_PEDIDO } from "../../src/utils/pedido";

const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => {
    const { useEffect } = jest.requireActual("react");
    return {
        useRouter: () => ({ push: mockPush, navigate: mockNavigate, back: mockBack }),
        useLocalSearchParams: () => ({}),
        useFocusEffect: (efecto: () => void) => useEffect(efecto, [efecto]),
    };
});
jest.mock("expo-image-picker", () => ({
    requestMediaLibraryPermissionsAsync: jest.fn(),
    launchImageLibraryAsync: jest.fn(),
}));
jest.mock("../../src/context/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
jest.mock("../../src/services/catalogoService", () => ({ obtenerPastel: jest.fn() }));
jest.mock("../../src/services/pedidosService", () => ({
    guardarBorrador: jest.fn(),
    obtenerBorrador: jest.fn(),
    urlReferencia: jest.fn().mockResolvedValue({ url: null, error: null }),
}));

// precarga el contexto como si se viniera de los pasos anteriores
function ConDatos({ datos, children }: { datos: Partial<PedidoEnCurso>; children: React.ReactNode }) {
    const { actualizar } = usePedido();
    const { useEffect } = jest.requireActual("react");
    useEffect(() => actualizar(datos), []);
    return <>{children}</>;
}

async function renderPaso(paso: React.ReactNode, datos: Partial<PedidoEnCurso> = {}) {
    await render(<PedidoProvider><ConDatos datos={datos}>{paso}</ConDatos></PedidoProvider>);
}

beforeEach(() => {
    jest.clearAllMocks();
    (guardarBorrador as jest.Mock).mockResolvedValue({ id: "ped1", imagenRuta: null, error: null });
});

describe("Paso 1: tamaño y niveles", () => {
    it("sin elegir nada no avanza y marca los campos obligatorios", async () => {
        await renderPaso(<PasoTamanio />);

        await fireEvent.press(screen.getByText("Siguiente"));

        expect(screen.getAllByText(MENSAJES_PEDIDO.OBLIGATORIO)).toHaveLength(2);
        expect(guardarBorrador).not.toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
    });

    it("deshabilita los niveles no permitidos para el tamaño", async () => {
        await renderPaso(<PasoTamanio />);

        await fireEvent.press(screen.getByLabelText("Tamaño (personas) 15"));

        expect(screen.getByLabelText("Número de niveles 2").props.accessibilityState.disabled).toBe(false);
        expect(screen.getByLabelText("Número de niveles 3").props.accessibilityState.disabled).toBe(true);
    });

    it("al bajar el tamaño ajusta los niveles y avisa", async () => {
        await renderPaso(<PasoTamanio />, { tamanio: "30", niveles: 4 });

        await fireEvent.press(screen.getByLabelText("Tamaño (personas) 15"));

        expect(screen.getByText("Ajustamos los niveles a 2: es el máximo para 15 personas.")).toBeTruthy();
        expect(screen.getByLabelText("Número de niveles 2").props.accessibilityState.selected).toBe(true);
    });

    it("el precio se actualiza al elegir tamaño y niveles", async () => {
        await renderPaso(<PasoTamanio />);

        await fireEvent.press(screen.getByLabelText("Tamaño (personas) 20"));
        expect(screen.getByTestId("precio-pedido")).toHaveTextContent("desde $650.00 MXN");

        await fireEvent.press(screen.getByLabelText("Número de niveles 3"));
        expect(screen.getByTestId("precio-pedido")).toHaveTextContent("desde $1,150.00 MXN");
        expect(screen.getByText("Precio estimado, sujeto a confirmación de la pastelería")).toBeTruthy();
    });

    it("completo: guarda el borrador (se retoma en el paso 2) y avanza", async () => {
        await renderPaso(<PasoTamanio />);
        await fireEvent.press(screen.getByLabelText("Tamaño (personas) 10"));
        await fireEvent.press(screen.getByLabelText("Número de niveles 1"));

        await fireEvent.press(screen.getByText("Siguiente"));

        await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/pedido/nuevo/sabor"));
        expect(guardarBorrador).toHaveBeenCalledWith(
            expect.objectContaining({ tamanio: "10", niveles: 1 }), "u1", { pasoActual: 2, sincronizarImagen: false, guardarEntrega: false },
        );
    });

    it("si falla el guardado avisa con Reintentar y no avanza", async () => {
        const alerta = jest.spyOn(Alert, "alert");
        (guardarBorrador as jest.Mock).mockResolvedValue({ id: null, imagenRuta: null, error: "Error de conexión. Tu progreso no se guardó, inténtalo de nuevo" });
        await renderPaso(<PasoTamanio />, { tamanio: "10", niveles: 1 });

        await fireEvent.press(screen.getByText("Siguiente"));

        await waitFor(() => expect(alerta).toHaveBeenCalled());
        const [, mensaje, botones] = alerta.mock.calls[0];
        expect(mensaje).toBe("Error de conexión. Tu progreso no se guardó, inténtalo de nuevo");
        expect(botones?.map((b) => b.text)).toEqual(["Cancelar", "Reintentar"]);
        expect(mockPush).not.toHaveBeenCalled();
    });

    it("'Salir' sin borrador pregunta antes de salir", async () => {
        const alerta = jest.spyOn(Alert, "alert");
        await renderPaso(<PasoTamanio />);

        await fireEvent.press(screen.getByText("Salir"));

        expect(alerta.mock.calls[0][0]).toBe("¿Salir del pedido?");
        alerta.mock.calls[0][2]?.find((b) => b.text === "Salir")?.onPress?.();
        expect(mockNavigate).toHaveBeenCalledWith("/home");
    });
});

describe("Paso 2: sabores", () => {
    it("el sabor elegido queda resaltado", async () => {
        await renderPaso(<PasoSabor />, { tamanio: "10", niveles: 1 });

        await fireEvent.press(screen.getByLabelText("Red Velvet"));
        await fireEvent.press(screen.getByLabelText("Cajeta"));

        expect(screen.getByLabelText("Red Velvet").props.accessibilityState.selected).toBe(true);
        expect(screen.getByLabelText("Vainilla").props.accessibilityState.selected).toBe(false);
        expect(screen.getByLabelText("Cajeta").props.accessibilityState.selected).toBe(true);
    });

    it("el relleno cambia el precio y deja de ser 'desde'", async () => {
        await renderPaso(<PasoSabor />, { tamanio: "10", niveles: 1 });

        await fireEvent.press(screen.getByLabelText("Mantequilla de maní"));

        expect(screen.getByTestId("precio-pedido")).toHaveTextContent("$400.00 MXN");
    });

    it("'Atrás' regresa sin guardar", async () => {
        await renderPaso(<PasoSabor />);

        await fireEvent.press(screen.getByText("Atrás"));

        expect(mockBack).toHaveBeenCalled();
        expect(guardarBorrador).not.toHaveBeenCalled();
    });
});

describe("Paso 3: decoración", () => {
    it("muestra el contador del mensaje", async () => {
        await renderPaso(<PasoDecoracion />);

        await fireEvent.changeText(screen.getByLabelText("Descripción de la decoración"), "Feliz 🎂");

        expect(screen.getByText("7/500")).toBeTruthy();
    });

    it("rechaza un archivo que no es imagen", async () => {
        (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
        (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
            canceled: false,
            assets: [{ uri: "file:///doc.pdf", mimeType: "application/pdf", fileName: "doc.pdf", fileSize: 100 }],
        });
        await renderPaso(<PasoDecoracion />);

        await fireEvent.press(screen.getByText("Adjuntar imagen"));

        expect(await screen.findByText(MENSAJES_PEDIDO.IMAGEN_FORMATO)).toBeTruthy();
    });

    it("permiso de galeria denegado: ofrece abrir Ajustes", async () => {
        const alerta = jest.spyOn(Alert, "alert");
        (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
        await renderPaso(<PasoDecoracion />);

        await fireEvent.press(screen.getByText("Adjuntar imagen"));

        await waitFor(() => expect(alerta).toHaveBeenCalled());
        expect(alerta.mock.calls[0][0]).toBe("Necesitamos acceso a tu galería");
        expect(alerta.mock.calls[0][2]?.map((b) => b.text)).toContain("Abrir Ajustes");
        expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    });

    it("'Siguiente' sube la imagen y avanza a la entrega (se retoma en el paso 4)", async () => {
        await renderPaso(<PasoDecoracion />, { id: "ped1", tamanio: "10", niveles: 1, tipoPan: "fresa", relleno: "cajeta" });

        await fireEvent.press(screen.getByText("Siguiente"));

        await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/pedido/nuevo/entrega"));
        expect(guardarBorrador).toHaveBeenCalledWith(expect.anything(), "u1", { pasoActual: 4, sincronizarImagen: true, guardarEntrega: false });
    });
});
