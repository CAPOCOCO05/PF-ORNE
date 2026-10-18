import { fireEvent, render, screen } from "@testing-library/react-native";
import Home from "../../app/(cliente)/home";
import { useCatalogo } from "../../src/hooks/useCatalogo";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("../../src/hooks/useCatalogo", () => ({ useCatalogo: jest.fn() }));

const mockReintentar = jest.fn();

const PASTEL = {
    id: "p1", nombre: "Red Velvet", descripcion: "Pan red velvet con crema pastelera", imagen_url: null,
    precio_base: 530, tamanio: "15", niveles: 1, tipo_pan: "redvelvet", relleno: "cremapastelera",
};

function mockCatalogo(valores: object) {
    (useCatalogo as jest.Mock).mockReturnValue({
        pasteles: [], hayMas: true, cargando: false, error: null,
        cargarMas: jest.fn(), reintentar: mockReintentar, recargar: jest.fn(),
        ...valores,
    });
}

beforeEach(() => jest.clearAllMocks());

describe("Home (catalogo)", () => {
    it("muestra las tarjetas con precio y detalles", async () => {
        mockCatalogo({ pasteles: [PASTEL] });
        await render(<Home />);

        expect(screen.getByText("Catálogo")).toBeTruthy();
        expect(screen.getByText("$530.00 MXN")).toBeTruthy();
        expect(screen.getByText("Red Velvet")).toBeTruthy();
        expect(screen.getByText("Pan red velvet con crema pastelera")).toBeTruthy();
    });

    it("'Pedir' abre el pedido con el pastel precargado", async () => {
        mockCatalogo({ pasteles: [PASTEL] });
        await render(<Home />);

        await fireEvent.press(screen.getByLabelText("Pedir Red Velvet"));

        expect(mockPush).toHaveBeenCalledWith({ pathname: "/pedido/nuevo", params: { pastel: "p1" } });
    });

    it("'Crear pedido' abre el pedido vacio", async () => {
        mockCatalogo({});
        await render(<Home />);

        await fireEvent.press(screen.getByText("Crear pedido"));

        expect(mockPush).toHaveBeenCalledWith("/pedido/nuevo");
    });

    it("primera carga: spinner", async () => {
        mockCatalogo({ cargando: true });
        await render(<Home />);

        expect(screen.getByTestId("catalogo-cargando")).toBeTruthy();
    });

    it("catalogo vacio: mensaje", async () => {
        mockCatalogo({ hayMas: false });
        await render(<Home />);

        expect(screen.getByText("Aún no hay pasteles en el catálogo")).toBeTruthy();
    });

    it("error: mensaje y reintentar", async () => {
        mockCatalogo({ error: "Error de conexión, inténtalo de nuevo" });
        await render(<Home />);

        expect(screen.getByText("Error de conexión, inténtalo de nuevo")).toBeTruthy();
        await fireEvent.press(screen.getByText("Reintentar"));
        expect(mockReintentar).toHaveBeenCalled();
    });

    it("fin de la lista: avisa que no hay mas", async () => {
        mockCatalogo({ pasteles: [PASTEL], hayMas: false });
        await render(<Home />);

        expect(screen.getByText("No hay más pasteles")).toBeTruthy();
    });
});
