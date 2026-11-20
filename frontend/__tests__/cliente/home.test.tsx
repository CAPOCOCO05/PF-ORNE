import { fireEvent, render, screen } from "@testing-library/react-native";
import Home from "../../app/(cliente)/home";
import { useCatalogo } from "../../src/hooks/useCatalogo";
import { FILTROS_VACIOS } from "../../src/constants/filtrosCatalogo";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("../../src/hooks/useCatalogo", () => ({ useCatalogo: jest.fn() }));
let mockSesion: object | null = { user: { id: "u1" } };
jest.mock("../../src/context/AuthContext", () => ({ useAuth: () => ({ session: mockSesion }) }));

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

beforeEach(() => {
    jest.clearAllMocks();
    mockSesion = { user: { id: "u1" } };
});

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

    it("sin cuenta, 'Pedir' lleva al registro recordando el pastel (F09)", async () => {
        mockSesion = null;
        mockCatalogo({ pasteles: [PASTEL] });
        await render(<Home />);

        expect(screen.getByText("Red Velvet")).toBeTruthy();
        await fireEvent.press(screen.getByLabelText("Pedir Red Velvet"));

        expect(mockPush).toHaveBeenCalledWith({ pathname: "/register", params: { pedir: "p1" } });
    });

    it("sin cuenta, 'Crear pedido' lleva al registro con un pedido nuevo (F09)", async () => {
        mockSesion = null;
        mockCatalogo({});
        await render(<Home />);

        await fireEvent.press(screen.getByText("Crear pedido"));

        expect(mockPush).toHaveBeenCalledWith({ pathname: "/register", params: { pedir: "nuevo" } });
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

describe("Home: filtros del catalogo (F07 M5)", () => {
    // filtros con los que se llamo al hook en el ultimo render
    const ultimosFiltros = () => (useCatalogo as jest.Mock).mock.calls.at(-1)?.[0];

    it("al inicio no hay filtros y el desplegable esta cerrado", async () => {
        mockCatalogo({ pasteles: [PASTEL] });
        await render(<Home />);

        expect(ultimosFiltros()).toEqual(FILTROS_VACIOS);
        expect(screen.getByText("Filtrar")).toBeTruthy();
        expect(screen.queryByText(/Ordenar/)).toBeNull(); // F10 A3: solo "Filtrar"
        expect(screen.queryByTestId("panel-filtros")).toBeNull();
    });

    it("elige filtros de varias secciones y los aplica con 'Ver resultados'", async () => {
        mockCatalogo({ pasteles: [PASTEL] });
        await render(<Home />);

        await fireEvent.press(screen.getByText("Filtrar"));
        await fireEvent.press(screen.getByLabelText("Precio $500–$800"));
        await fireEvent.press(screen.getByLabelText("Pan Chocolate"));
        await fireEvent.press(screen.getByLabelText("Pan Vainilla"));
        await fireEvent.press(screen.getByLabelText("Relleno Cajeta"));
        expect(ultimosFiltros()).toEqual(FILTROS_VACIOS); // aun es borrador

        await fireEvent.press(screen.getByText("Ver resultados"));

        expect(ultimosFiltros()).toEqual({
            ...FILTROS_VACIOS, precio: "500a800", panes: ["chocolate", "vainilla"], rellenos: ["cajeta"],
        });
        expect(screen.queryByTestId("panel-filtros")).toBeNull();
        expect(screen.getByText("Filtrar (4)")).toBeTruthy();
        expect(screen.getByText("Pan: Chocolate")).toBeTruthy();
    });

    it("quita un filtro con su chip y todos con 'Quitar todos'", async () => {
        mockCatalogo({ pasteles: [PASTEL] });
        await render(<Home />);
        await fireEvent.press(screen.getByText("Filtrar"));
        await fireEvent.press(screen.getByLabelText("Tamaño 15 personas"));
        await fireEvent.press(screen.getByLabelText("Niveles 2 niveles"));
        await fireEvent.press(screen.getByText("Ver resultados"));

        await fireEvent.press(screen.getByLabelText("Quitar filtro 15 personas"));
        expect(ultimosFiltros()).toEqual({ ...FILTROS_VACIOS, niveles: [2] });

        await fireEvent.press(screen.getByText("Filtrar (1)"));
        await fireEvent.press(screen.getByLabelText("Pan Fresa"));
        await fireEvent.press(screen.getByText("Ver resultados"));
        await fireEvent.press(screen.getByText("Quitar todos"));
        expect(ultimosFiltros()).toEqual(FILTROS_VACIOS);
    });

    it("'Limpiar' en el desplegable desmarca todo antes de aplicar", async () => {
        mockCatalogo({ pasteles: [PASTEL] });
        await render(<Home />);
        await fireEvent.press(screen.getByText("Filtrar"));
        await fireEvent.press(screen.getByLabelText("Pan Fresa"));

        await fireEvent.press(screen.getByText("Limpiar"));
        await fireEvent.press(screen.getByText("Ver resultados"));

        expect(ultimosFiltros()).toEqual(FILTROS_VACIOS);
    });

    it("sin resultados con filtros: mensaje distinto y 'Limpiar filtros'", async () => {
        mockCatalogo({ hayMas: false });
        await render(<Home />);
        await fireEvent.press(screen.getByText("Filtrar"));
        await fireEvent.press(screen.getByLabelText("Pan Fresa"));
        await fireEvent.press(screen.getByText("Ver resultados"));

        expect(screen.getByText("No hay pasteles con esos filtros")).toBeTruthy();
        expect(screen.queryByText("Aún no hay pasteles en el catálogo")).toBeNull();

        await fireEvent.press(screen.getByText("Limpiar filtros"));
        expect(ultimosFiltros()).toEqual(FILTROS_VACIOS);
        expect(screen.getByText("Aún no hay pasteles en el catálogo")).toBeTruthy();
    });
});
