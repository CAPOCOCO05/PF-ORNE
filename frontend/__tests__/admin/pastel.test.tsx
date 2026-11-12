import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { render } from "../../src/test-utils/renderConDialogo";
import AdminPastel from "../../app/admin/catalogo/[id]";
import { guardarPastel, obtenerPastelAdmin } from "../../src/services/catalogoService";
import { PastelAdmin } from "../../src/types/pedido.types";
import { MENSAJES_CATALOGO } from "../../src/utils/catalogo";
import { MENSAJES_PEDIDO } from "../../src/utils/pedido";

// F07 M4: formulario de alta y edicion de pasteles del catalogo
const mockNavigate = jest.fn();
let mockId = "nuevo";
jest.mock("expo-router", () => {
    const { useEffect } = jest.requireActual("react");
    return {
        useRouter: () => ({ navigate: mockNavigate }),
        useLocalSearchParams: () => ({ id: mockId }),
        useFocusEffect: (efecto: () => void) => useEffect(efecto, [efecto]),
    };
});
jest.mock("expo-image-picker", () => ({
    requestMediaLibraryPermissionsAsync: jest.fn(),
    launchImageLibraryAsync: jest.fn(),
}));
jest.mock("../../src/services/supabase", () => ({ supabase: {} }));
jest.mock("../../src/services/catalogoService", () => ({
    obtenerPastelAdmin: jest.fn(),
    guardarPastel: jest.fn(),
}));

const PASTEL: PastelAdmin = {
    id: "p1", nombre: "Red Velvet dos pisos", descripcion: "Dos niveles de red velvet", imagen_url: null, precio_base: 930,
    tamanio: "20", niveles: 2, tipo_pan: "redvelvet", relleno: "cremapastelera", activo: true,
};

async function llenarFormulario() {
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Fiesta de chocolate");
    await fireEvent.press(screen.getByLabelText("Tamaño (personas) 20"));
    await fireEvent.press(screen.getByLabelText("Número de niveles 3"));
    await fireEvent.press(screen.getAllByLabelText("Chocolate")[0]);   // pan
    await fireEvent.press(screen.getAllByLabelText("Chocolate")[1]);   // relleno
}

beforeEach(() => {
    jest.clearAllMocks();
    mockId = "nuevo";
    (obtenerPastelAdmin as jest.Mock).mockResolvedValue({ pastel: PASTEL, error: null });
    (guardarPastel as jest.Mock).mockResolvedValue({ id: "nuevo1", error: null, errorNombre: null });
});

describe("Nuevo pastel", () => {
    it("empieza vacío y publicado por defecto, sin consultar la base", async () => {
        await render(<AdminPastel />);

        expect(screen.getByText("Nuevo pastel")).toBeTruthy();
        expect(screen.getByLabelText("Publicado").props.value).toBe(true);
        expect(screen.getByText("Publicar")).toBeTruthy();
        expect(screen.getByText("Elige el tamaño para calcular el precio")).toBeTruthy();
        expect(obtenerPastelAdmin).not.toHaveBeenCalled();
    });

    it("sin datos: errores junto a los campos y no se guarda", async () => {
        await render(<AdminPastel />);

        await fireEvent.press(screen.getByText("Publicar"));

        expect(screen.getByText(MENSAJES_CATALOGO.NOMBRE_VACIO)).toBeTruthy();
        expect(screen.getAllByText(MENSAJES_PEDIDO.OBLIGATORIO)).toHaveLength(4);
        expect(screen.queryByTestId("dialogo-confirmar")).toBeNull();
        expect(guardarPastel).not.toHaveBeenCalled();
    });

    it("la vista previa muestra nombre y precio calculado (igual que el wizard)", async () => {
        await render(<AdminPastel />);

        await llenarFormulario();

        expect(screen.getAllByText("Fiesta de chocolate").length).toBeGreaterThan(0);
        // 20 personas (650) + 2 niveles extra (500) + relleno de chocolate (40)
        expect(screen.getByText("Precio: $1,190.00 MXN")).toBeTruthy();
        expect(screen.getByText("Precio estimado, sujeto a confirmación")).toBeTruthy();
    });

    it("al bajar el tamaño se ajustan los niveles y se avisa", async () => {
        await render(<AdminPastel />);
        await llenarFormulario();

        await fireEvent.press(screen.getByLabelText("Tamaño (personas) 10"));

        expect(screen.getByText("Ajustamos los niveles a 1: es el máximo para 10 personas.")).toBeTruthy();
        expect(screen.getByLabelText("Número de niveles 1").props.accessibilityState.selected).toBe(true);
    });

    it("confirma, guarda y regresa al catálogo", async () => {
        await render(<AdminPastel />);
        await llenarFormulario();

        await fireEvent.press(screen.getByText("Publicar"));
        expect(screen.getByText("¿Publicar este pastel?")).toBeTruthy();
        await fireEvent.press(screen.getByTestId("dialogo-confirmar"));

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/admin/catalogo"));
        expect(guardarPastel).toHaveBeenCalledWith(null, expect.objectContaining({
            nombre: "Fiesta de chocolate", tamanio: "20", niveles: 3, tipoPan: "chocolate", relleno: "chocolate", activo: true,
        }));
    });

    it("si se cancela la confirmación no se guarda", async () => {
        await render(<AdminPastel />);
        await llenarFormulario();

        await fireEvent.press(screen.getByText("Publicar"));
        await fireEvent.press(screen.getByTestId("dialogo-cancelar"));

        expect(guardarPastel).not.toHaveBeenCalled();
    });

    it("oculto desde el alta: el botón dice \"Guardar pastel\"", async () => {
        await render(<AdminPastel />);

        await fireEvent(screen.getByLabelText("Publicado"), "valueChange", false);

        expect(screen.getByText("Guardar pastel")).toBeTruthy();
        expect(screen.getByText("Oculto: los clientes no lo ven")).toBeTruthy();
    });

    it("nombre repetido: el error aparece junto al campo", async () => {
        (guardarPastel as jest.Mock).mockResolvedValue({ id: null, error: null, errorNombre: MENSAJES_CATALOGO.NOMBRE_REPETIDO });
        await render(<AdminPastel />);
        await llenarFormulario();

        await fireEvent.press(screen.getByText("Publicar"));
        await fireEvent.press(screen.getByTestId("dialogo-confirmar"));

        expect(await screen.findByText(MENSAJES_CATALOGO.NOMBRE_REPETIDO)).toBeTruthy();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("error al guardar: diálogo con Reintentar que vuelve a guardar lo capturado", async () => {
        (guardarPastel as jest.Mock)
            .mockResolvedValueOnce({ id: null, error: MENSAJES_CATALOGO.IMAGEN, errorNombre: null })
            .mockResolvedValueOnce({ id: "nuevo1", error: null, errorNombre: null });
        await render(<AdminPastel />);
        await llenarFormulario();

        await fireEvent.press(screen.getByText("Publicar"));
        await fireEvent.press(screen.getByTestId("dialogo-confirmar"));
        expect(await screen.findByText(MENSAJES_CATALOGO.IMAGEN)).toBeTruthy();
        await fireEvent.press(screen.getByText("Reintentar"));

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/admin/catalogo"));
        expect(guardarPastel).toHaveBeenCalledTimes(2);
    });

    it("imagen elegida: se valida el formato", async () => {
        (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
        (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
            canceled: false, assets: [{ uri: "file:///a.gif", mimeType: "image/gif" }],
        });
        await render(<AdminPastel />);

        await fireEvent.press(screen.getByText("Elegir imagen"));

        expect(await screen.findByText(MENSAJES_PEDIDO.IMAGEN_FORMATO)).toBeTruthy();
    });

    it("imagen válida: se muestra y cambia el enlace", async () => {
        (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
        (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
            canceled: false, assets: [{ uri: "file:///a.jpg", mimeType: "image/jpeg" }],
        });
        await render(<AdminPastel />);

        await fireEvent.press(screen.getByText("Elegir imagen"));

        expect(await screen.findByText("Cambiar imagen")).toBeTruthy();
        expect(screen.getByLabelText("Imagen del pastel").props.source).toEqual({ uri: "file:///a.jpg" });
    });
});

describe("Editar pastel", () => {
    beforeEach(() => {
        mockId = "p1";
    });

    it("carga los datos guardados", async () => {
        await render(<AdminPastel />);

        expect(await screen.findByDisplayValue("Red Velvet dos pisos")).toBeTruthy();
        expect(obtenerPastelAdmin).toHaveBeenCalledWith("p1");
        expect(screen.getByText("Editar pastel")).toBeTruthy();
        expect(screen.getByLabelText("Tamaño (personas) 20").props.accessibilityState.selected).toBe(true);
        expect(screen.getByText("Precio: $930.00 MXN")).toBeTruthy();
        expect(screen.getByText("Guardar cambios")).toBeTruthy();
    });

    it("ocultar y guardar cambios", async () => {
        await render(<AdminPastel />);
        await screen.findByDisplayValue("Red Velvet dos pisos");

        await fireEvent(screen.getByLabelText("Publicado"), "valueChange", false);
        await fireEvent.press(screen.getByText("Guardar cambios"));
        expect(screen.getByText("Quedará oculto para los clientes.")).toBeTruthy();
        await fireEvent.press(screen.getByTestId("dialogo-confirmar"));

        await waitFor(() => expect(guardarPastel).toHaveBeenCalledWith("p1", expect.objectContaining({ activo: false })));
    });

    it("error al cargar: mensaje y reintentar", async () => {
        (obtenerPastelAdmin as jest.Mock)
            .mockResolvedValueOnce({ pastel: null, error: "Error de conexión, inténtalo de nuevo" })
            .mockResolvedValueOnce({ pastel: PASTEL, error: null });
        await render(<AdminPastel />);

        await fireEvent.press(await screen.findByText("Reintentar"));

        expect(await screen.findByDisplayValue("Red Velvet dos pisos")).toBeTruthy();
    });

    it("pastel inexistente", async () => {
        (obtenerPastelAdmin as jest.Mock).mockResolvedValue({ pastel: null, error: null });
        await render(<AdminPastel />);

        expect(await screen.findByText(MENSAJES_CATALOGO.NO_ENCONTRADO)).toBeTruthy();
    });
});
