import { fireEvent, render, screen } from "@testing-library/react-native";
import AdminCatalogo from "../../app/admin/catalogo/index";
import { listarCatalogoAdmin } from "../../src/services/catalogoService";
import { PastelAdmin } from "../../src/types/pedido.types";

// F07 M4: lista del catalogo en el panel admin
const mockPush = jest.fn();
jest.mock("expo-router", () => {
    const { useEffect } = jest.requireActual("react");
    return {
        useRouter: () => ({ push: mockPush }),
        useFocusEffect: (efecto: () => void) => useEffect(efecto, [efecto]),
    };
});
jest.mock("../../src/services/supabase", () => ({ supabase: {} }));
jest.mock("../../src/services/catalogoService", () => ({ listarCatalogoAdmin: jest.fn() }));

const PUBLICADO: PastelAdmin = {
    id: "p1", nombre: "Boda clásica", descripcion: null, imagen_url: null, precio_base: 1430,
    tamanio: "30", niveles: 3, tipo_pan: "vainilla", relleno: "cremapastelera", activo: true,
};
const OCULTO: PastelAdmin = { ...PUBLICADO, id: "p2", nombre: "Red Velvet", precio_base: 530, activo: false };

beforeEach(() => {
    jest.clearAllMocks();
    (listarCatalogoAdmin as jest.Mock).mockResolvedValue({ pasteles: [PUBLICADO, OCULTO], hayMas: false, error: null });
});

describe("Catálogo del admin", () => {
    it("lista publicados y ocultos con su precio y etiqueta", async () => {
        await render(<AdminCatalogo />);

        expect(await screen.findByText("Boda clásica")).toBeTruthy();
        expect(listarCatalogoAdmin).toHaveBeenCalledWith(0);
        expect(screen.getByText("$1,430.00 MXN")).toBeTruthy();
        expect(screen.getByText("Publicado")).toBeTruthy();
        expect(screen.getByText("Red Velvet")).toBeTruthy();
        expect(screen.getByText("Oculto")).toBeTruthy();
    });

    it("al tocar un pastel abre su formulario", async () => {
        await render(<AdminCatalogo />);

        await fireEvent.press(await screen.findByLabelText("Editar Red Velvet"));

        expect(mockPush).toHaveBeenCalledWith("/admin/catalogo/p2");
    });

    it("\"Nuevo pastel\" abre el formulario de alta", async () => {
        await render(<AdminCatalogo />);
        await screen.findByText("Boda clásica");

        await fireEvent.press(screen.getByText("Nuevo pastel"));

        expect(mockPush).toHaveBeenCalledWith("/admin/catalogo/nuevo");
    });

    it("catálogo vacío", async () => {
        (listarCatalogoAdmin as jest.Mock).mockResolvedValue({ pasteles: [], hayMas: false, error: null });
        await render(<AdminCatalogo />);

        expect(await screen.findByText("Aún no hay pasteles en el catálogo")).toBeTruthy();
    });

    it("error al cargar: mensaje y reintentar", async () => {
        (listarCatalogoAdmin as jest.Mock)
            .mockResolvedValueOnce({ pasteles: [], hayMas: false, error: "Error de conexión, inténtalo de nuevo" })
            .mockResolvedValueOnce({ pasteles: [PUBLICADO], hayMas: false, error: null });
        await render(<AdminCatalogo />);

        await fireEvent.press(await screen.findByText("Reintentar"));

        expect(await screen.findByText("Boda clásica")).toBeTruthy();
    });
});
