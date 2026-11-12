import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { render } from "../../src/test-utils/renderConDialogo";
import Perfil from "../../app/(cliente)/perfil";
import EditarPerfil from "../../app/(cliente)/perfil/editar";
import { guardarDatosCliente, obtenerDatosCliente } from "../../src/services/perfilService";
import { MENSAJES_VALIDACION } from "../../src/utils/validaciones";
import { MENSAJES_PEDIDO } from "../../src/utils/pedido";

const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock("expo-router", () => {
    const { useEffect } = jest.requireActual("react");
    return {
        useRouter: () => ({ push: mockPush, navigate: mockNavigate }),
        useFocusEffect: (efecto: () => void) => useEffect(efecto, [efecto]),
    };
});
jest.mock("react-native-maps", () => {
    const { View } = jest.requireActual("react-native");
    const MapView = ({ children, testID }: { children: React.ReactNode; testID: string }) => <View testID={testID}>{children}</View>;
    return { __esModule: true, default: MapView, Marker: () => null, Circle: () => null };
});
const mockSignOut = jest.fn();
const mockActualizarNombre = jest.fn();
jest.mock("../../src/context/AuthContext", () => ({
    useAuth: () => ({
        user: { id: "u1", email: "ana@mail.com" },
        perfil: { id: "u1", nombre: "Ana López", rol: "cliente" },
        signOut: mockSignOut,
        actualizarNombre: mockActualizarNombre,
    }),
}));
jest.mock("../../src/services/perfilService", () => ({ obtenerDatosCliente: jest.fn(), guardarDatosCliente: jest.fn() }));
jest.mock("../../src/services/ubicacionService", () => ({
    ...jest.requireActual("../../src/services/ubicacionService"),
    ubicacionInicial: jest.fn().mockResolvedValue({ coordenadas: { latitud: 31.78, longitud: -116.6 }, esDelUsuario: false }),
    direccionDesdeCoordenadas: jest.fn(),
    buscarDireccion: jest.fn(),
}));

const DATOS = {
    telefono: "6461234567",
    direccion: {
        calle: "Calle Primera", numeroExterior: "123", numeroInterior: "", colonia: "Zona Centro",
        referencia: "Portón negro", ubicacion: { latitud: 31.78, longitud: -116.6 },
    },
};

beforeEach(() => {
    jest.clearAllMocks();
    (obtenerDatosCliente as jest.Mock).mockResolvedValue({ datos: DATOS, error: null });
    (guardarDatosCliente as jest.Mock).mockResolvedValue({ error: null });
    mockActualizarNombre.mockResolvedValue({ error: null });
});

describe("Perfil del cliente (F07 M7)", () => {
    it("muestra datos personales y la direccion con su mapa", async () => {
        await render(<Perfil />);

        expect(await screen.findByText("6461234567")).toBeTruthy();
        expect(screen.getAllByText("Ana López").length).toBeGreaterThan(0);
        expect(screen.getByText("ana@mail.com")).toBeTruthy();
        expect(screen.getByText("Calle Primera 123, Zona Centro")).toBeTruthy();
        expect(screen.getByText("Portón negro")).toBeTruthy();
        expect(screen.getByTestId("mapa-destino")).toBeTruthy();
    });

    it("sin datos guardados: avisa que no hay direccion", async () => {
        (obtenerDatosCliente as jest.Mock).mockResolvedValue({ datos: { telefono: "", direccion: null }, error: null });
        await render(<Perfil />);

        expect(await screen.findByText("Aún no tienes una dirección guardada")).toBeTruthy();
        expect(screen.getByText("Sin teléfono")).toBeTruthy();
    });

    it("error al cargar: mensaje y reintentar", async () => {
        (obtenerDatosCliente as jest.Mock).mockResolvedValueOnce({ datos: null, error: "Error de conexión, inténtalo de nuevo" });
        await render(<Perfil />);

        expect(await screen.findByText("Error de conexión, inténtalo de nuevo")).toBeTruthy();
        await fireEvent.press(screen.getByText("Reintentar"));
        expect(await screen.findByText("6461234567")).toBeTruthy();
    });

    it("'Editar datos' abre el formulario y 'Cerrar sesión' cierra la sesion", async () => {
        await render(<Perfil />);
        await screen.findByText("6461234567");

        await fireEvent.press(screen.getByText("Editar datos"));
        expect(mockPush).toHaveBeenCalledWith("/perfil/editar");

        await fireEvent.press(screen.getByText("Cerrar sesión"));
        expect(mockSignOut).toHaveBeenCalled();
    });
});

describe("Editar datos del cliente (F07 M7)", () => {
    it("precarga lo guardado", async () => {
        await render(<EditarPerfil />);

        expect((await screen.findByLabelText("Nombre completo")).props.value).toBe("Ana López");
        expect(screen.getByLabelText("Teléfono").props.value).toBe("6461234567");
        expect(screen.getByLabelText("Calle").props.value).toBe("Calle Primera");
    });

    it("guarda telefono y nombre y vuelve al perfil", async () => {
        await render(<EditarPerfil />);
        await fireEvent.changeText(await screen.findByLabelText("Teléfono"), "646 000 0000");
        await fireEvent.changeText(screen.getByLabelText("Nombre completo"), "Ana María López");

        await fireEvent.press(screen.getByText("Guardar cambios"));

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/perfil"));
        expect(guardarDatosCliente).toHaveBeenCalledWith("u1", { ...DATOS, telefono: "6460000000" });
        expect(mockActualizarNombre).toHaveBeenCalledWith("Ana María López");
    });

    it("si el nombre no cambia no se vuelve a guardar", async () => {
        await render(<EditarPerfil />);
        await fireEvent.changeText(await screen.findByLabelText("Teléfono"), "6460000000");

        await fireEvent.press(screen.getByText("Guardar cambios"));

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/perfil"));
        expect(mockActualizarNombre).not.toHaveBeenCalled();
    });

    it("nombre invalido: error junto al campo y no guarda", async () => {
        await render(<EditarPerfil />);
        await fireEvent.changeText(await screen.findByLabelText("Nombre completo"), "Ana");

        expect(screen.getByText(MENSAJES_VALIDACION.NOMBRE_INCOMPLETO)).toBeTruthy();
        await fireEvent.press(screen.getByText("Guardar cambios"));
        expect(guardarDatosCliente).not.toHaveBeenCalled();
    });

    it("'Quitar dirección' guarda sin direccion", async () => {
        await render(<EditarPerfil />);
        await fireEvent.press(await screen.findByText("Quitar dirección"));

        expect(screen.getByText("Aún no tienes una dirección guardada")).toBeTruthy();
        await fireEvent.press(screen.getByText("Guardar cambios"));

        await waitFor(() => expect(guardarDatosCliente).toHaveBeenCalledWith("u1", { telefono: "6461234567", direccion: null }));
    });

    it("'Agregar dirección' sin llenarla marca los obligatorios", async () => {
        (obtenerDatosCliente as jest.Mock).mockResolvedValue({ datos: { telefono: "", direccion: null }, error: null });
        await render(<EditarPerfil />);
        await fireEvent.press(await screen.findByText("Agregar dirección"));

        await fireEvent.press(screen.getByText("Guardar cambios"));

        expect(screen.getAllByText(MENSAJES_PEDIDO.OBLIGATORIO).length).toBe(3);
        expect(guardarDatosCliente).not.toHaveBeenCalled();
    });

    it("error al guardar: dialogo y se queda en el formulario", async () => {
        (guardarDatosCliente as jest.Mock).mockResolvedValue({ error: "Error de conexión, inténtalo de nuevo" });
        await render(<EditarPerfil />);
        await fireEvent.changeText(await screen.findByLabelText("Teléfono"), "6460000000");

        await fireEvent.press(screen.getByText("Guardar cambios"));

        expect(await screen.findByText("No se pudieron guardar tus datos")).toBeTruthy();
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Teléfono").props.value).toBe("6460000000");
    });

    it("'Cancelar' sin cambios vuelve directo; con cambios pregunta", async () => {
        await render(<EditarPerfil />);
        await fireEvent.press(await screen.findByText("Cancelar"));
        expect(mockNavigate).toHaveBeenCalledWith("/perfil");

        mockNavigate.mockClear();
        await fireEvent.changeText(screen.getByLabelText("Teléfono"), "6460000000");
        await fireEvent.press(screen.getByText("Cancelar"));

        expect(await screen.findByText("¿Salir sin guardar?")).toBeTruthy();
        expect(mockNavigate).not.toHaveBeenCalled();
        await fireEvent.press(screen.getByText("Salir"));
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/perfil"));
    });
});
