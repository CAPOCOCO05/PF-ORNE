import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { render } from "../../src/test-utils/renderConDialogo";
import PasoEntrega from "../../app/(cliente)/pedido/nuevo/entrega";
import { SUCURSAL } from "../../src/constants/sucursal";
import { PedidoProvider, usePedido } from "../../src/context/PedidoContext";
import { guardarBorrador } from "../../src/services/pedidosService";
import { buscarDireccion, direccionDesdeCoordenadas, MENSAJES_UBICACION, ubicacionInicial } from "../../src/services/ubicacionService";
import { PedidoEnCurso } from "../../src/types/pedido.types";
import { MENSAJES_ENTREGA, sumarDias } from "../../src/utils/entrega";
import { MENSAJES_PEDIDO } from "../../src/utils/pedido";
import { MENSAJES_VALIDACION } from "../../src/utils/validaciones";

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => {
    const { useEffect } = jest.requireActual("react");
    return {
        useRouter: () => ({ push: mockPush, back: mockBack }),
        useFocusEffect: (efecto: () => void) => useEffect(efecto, [efecto]),
    };
});
// el mapa nativo se reemplaza por una vista que permite "tocar" una coordenada
jest.mock("react-native-maps", () => {
    const { forwardRef } = jest.requireActual("react");
    const { View } = jest.requireActual("react-native");
    const MapView = forwardRef(({ children, testID, onPress }: { children: React.ReactNode; testID: string; onPress: (e: object) => void }, _ref: unknown) => (
        <View testID={testID} onTouchEnd={() => onPress({ nativeEvent: { coordinate: { latitude: 31.79, longitude: -116.6 } } })}>{children}</View>
    ));
    return { __esModule: true, default: MapView, Marker: () => null, Circle: () => null };
});
const mockActualizarNombre = jest.fn();
let mockPerfil: { id: string; nombre: string; rol: string } | null = null;
jest.mock("../../src/context/AuthContext", () => ({
    useAuth: () => ({ user: { id: "u1" }, perfil: mockPerfil, actualizarNombre: mockActualizarNombre }),
}));
jest.mock("../../src/services/catalogoService", () => ({ obtenerPastel: jest.fn() }));
jest.mock("../../src/services/pedidosService", () => ({ guardarBorrador: jest.fn(), obtenerBorrador: jest.fn() }));
// F07 M7: sin datos guardados, el pedido nuevo empieza sin precarga
jest.mock("../../src/services/perfilService", () => ({ obtenerDatosCliente: jest.fn().mockResolvedValue({ datos: null, error: null }) }));
jest.mock("../../src/services/ubicacionService", () => ({
    ...jest.requireActual("../../src/services/ubicacionService"),
    ubicacionInicial: jest.fn(),
    direccionDesdeCoordenadas: jest.fn(),
    buscarDireccion: jest.fn(),
}));

function ConDatos({ datos, children }: { datos: Partial<PedidoEnCurso>; children: React.ReactNode }) {
    const { actualizar } = usePedido();
    const { useEffect } = jest.requireActual("react");
    useEffect(() => actualizar(datos), []);
    return <>{children}</>;
}

const PEDIDO = { id: "ped1", tamanio: "10", niveles: 1, tipoPan: "fresa", relleno: "cajeta" } as const;

async function renderEntrega() {
    await render(<PedidoProvider><ConDatos datos={PEDIDO}><PasoEntrega /></ConDatos></PedidoProvider>);
}

// primer lunes disponible para 1 nivel (hoy + 2 o despues)
function fechaDisponible(): string {
    const hoy = new Date();
    let fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    fecha = sumarDias(fecha, 2);
    while (new Date(`${fecha}T12:00:00Z`).getUTCDay() === 0) fecha = sumarDias(fecha, 1);
    return fecha;
}

async function elegirFechaYHorario() {
    const fecha = fechaDisponible();
    // si la fecha cae en el mes siguiente, se avanza el calendario
    if (!screen.queryByLabelText(fecha)) await fireEvent.press(screen.getByLabelText("Mes siguiente"));
    await fireEvent.press(screen.getByLabelText(fecha));
    await fireEvent.press(screen.getByLabelText("Horario 12:00 – 14:00"));
    return fecha;
}

beforeEach(() => {
    jest.clearAllMocks();
    mockPerfil = { id: "u1", nombre: "Ana López", rol: "cliente" };
    mockActualizarNombre.mockResolvedValue({ error: null });
    (guardarBorrador as jest.Mock).mockResolvedValue({ id: "ped1", imagenRuta: null, error: null });
    (ubicacionInicial as jest.Mock).mockResolvedValue({ coordenadas: SUCURSAL.coordenadas, esDelUsuario: false });
    (direccionDesdeCoordenadas as jest.Mock).mockResolvedValue({
        direccion: { calle: "Calle Primera", numeroExterior: "123", colonia: "Zona Centro" }, error: null,
    });
});

describe("Paso 4: entrega", () => {
    it("sin capturar nada no avanza y marca los obligatorios", async () => {
        await renderEntrega();

        await fireEvent.press(screen.getByText("Siguiente"));

        expect(screen.getAllByText(MENSAJES_PEDIDO.OBLIGATORIO).length).toBeGreaterThanOrEqual(4);
        expect(guardarBorrador).not.toHaveBeenCalled();
    });

    it("Sucursal: muestra la direccion fija sin mapa, guarda la recoleccion y avanza al pago", async () => {
        await renderEntrega();

        await fireEvent.press(screen.getByLabelText("Tipo de entrega Sucursal"));
        expect(screen.getByText(SUCURSAL.direccion)).toBeTruthy();
        expect(screen.queryByTestId("mapa-entrega")).toBeNull();

        await fireEvent.changeText(screen.getByLabelText("Teléfono de contacto"), "6461234567");
        const fecha = await elegirFechaYHorario();
        await fireEvent.press(screen.getByText("Siguiente"));

        await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/pedido/nuevo/pago"));
        expect(guardarBorrador).toHaveBeenCalledWith(
            expect.objectContaining({ entrega: expect.objectContaining({ tipoEntrega: "recoleccion", fechaEntrega: fecha, horaEntrega: "12:00" }) }),
            "u1",
            { pasoActual: 5, sincronizarImagen: false, guardarEntrega: true },
        );
    });

    it("Domicilio: al tocar el mapa autocompleta la direccion", async () => {
        await renderEntrega();
        await fireEvent.press(screen.getByLabelText("Tipo de entrega Domicilio"));

        await fireEvent(screen.getByTestId("mapa-entrega"), "touchEnd");

        await waitFor(() => expect(screen.getByLabelText("Calle").props.value).toBe("Calle Primera"));
        expect(direccionDesdeCoordenadas).toHaveBeenCalledWith({ latitud: 31.79, longitud: -116.6 });
        expect(screen.getByLabelText("Núm. exterior").props.value).toBe("123");
        expect(screen.getByLabelText("Colonia").props.value).toBe("Zona Centro");
    });

    it("Domicilio sin pin: no avanza y pide fijar la ubicacion", async () => {
        await renderEntrega();
        await fireEvent.press(screen.getByLabelText("Tipo de entrega Domicilio"));
        await fireEvent.changeText(screen.getByLabelText("Calle"), "Calle Primera");
        await fireEvent.changeText(screen.getByLabelText("Núm. exterior"), "1");
        await fireEvent.changeText(screen.getByLabelText("Colonia"), "Centro");
        await fireEvent.changeText(screen.getByLabelText("Teléfono de contacto"), "6461234567");
        await elegirFechaYHorario();

        await fireEvent.press(screen.getByText("Siguiente"));

        expect(screen.getByText(MENSAJES_ENTREGA.UBICACION)).toBeTruthy();
        expect(guardarBorrador).not.toHaveBeenCalled();
    });

    it("si falla la geocodificacion avisa y deja llenar a mano", async () => {
        (direccionDesdeCoordenadas as jest.Mock).mockResolvedValue({ direccion: null, error: MENSAJES_UBICACION.SIN_DIRECCION });
        await renderEntrega();
        await fireEvent.press(screen.getByLabelText("Tipo de entrega Domicilio"));

        await fireEvent(screen.getByTestId("mapa-entrega"), "touchEnd");

        expect(await screen.findByText(MENSAJES_UBICACION.SIN_DIRECCION)).toBeTruthy();
        await fireEvent.changeText(screen.getByLabelText("Calle"), "Calle Segunda");
        expect(screen.getByLabelText("Calle").props.value).toBe("Calle Segunda");
    });

    it("la busqueda por texto mueve el pin a la direccion encontrada", async () => {
        (buscarDireccion as jest.Mock).mockResolvedValue({ ubicacion: { latitud: 31.86, longitud: -116.62 }, error: null });
        await renderEntrega();
        await fireEvent.press(screen.getByLabelText("Tipo de entrega Domicilio"));

        await fireEvent.changeText(screen.getByLabelText("Buscar dirección"), "Av. Reforma 100");
        await fireEvent.press(screen.getByText("Buscar"));

        await waitFor(() => expect(direccionDesdeCoordenadas).toHaveBeenCalledWith({ latitud: 31.86, longitud: -116.62 }));
        expect(buscarDireccion).toHaveBeenCalledWith("Av. Reforma 100");
    });

    it("telefono invalido muestra su mensaje", async () => {
        await renderEntrega();
        await fireEvent.changeText(screen.getByLabelText("Teléfono de contacto"), "12345");

        await fireEvent.press(screen.getByText("Siguiente"));

        expect(screen.getByText(MENSAJES_ENTREGA.TELEFONO)).toBeTruthy();
    });
});

describe("Paso 4: nombre completo de quien recibe (F07 M6)", () => {
    // domicilio completo con pin, telefono, fecha y horario
    async function llenarDomicilio() {
        await fireEvent.press(screen.getByLabelText("Tipo de entrega Domicilio"));
        await fireEvent(screen.getByTestId("mapa-entrega"), "touchEnd");
        await waitFor(() => expect(screen.getByLabelText("Calle").props.value).toBe("Calle Primera"));
        await fireEvent.changeText(screen.getByLabelText("Teléfono de contacto"), "6461234567");
        await elegirFechaYHorario();
    }

    it("con nombre completo en el perfil no se pide", async () => {
        await renderEntrega();
        await fireEvent.press(screen.getByLabelText("Tipo de entrega Domicilio"));

        expect(screen.queryByLabelText("Nombre completo de quien recibe")).toBeNull();
    });

    it("nombre incompleto en sucursal: no se pide (D3)", async () => {
        mockPerfil = { id: "u1", nombre: "Ana", rol: "cliente" };
        await renderEntrega();
        await fireEvent.press(screen.getByLabelText("Tipo de entrega Sucursal"));

        expect(screen.queryByLabelText("Nombre completo de quien recibe")).toBeNull();
    });

    it("nombre incompleto a domicilio: precargado, no avanza sin corregirlo", async () => {
        mockPerfil = { id: "u1", nombre: "Ana", rol: "cliente" };
        await renderEntrega();
        await llenarDomicilio();

        expect(screen.getByLabelText("Nombre completo de quien recibe").props.value).toBe("Ana");
        await fireEvent.press(screen.getByText("Siguiente"));

        expect(screen.getByText(MENSAJES_VALIDACION.NOMBRE_INCOMPLETO)).toBeTruthy();
        expect(guardarBorrador).not.toHaveBeenCalled();
        expect(mockActualizarNombre).not.toHaveBeenCalled();
    });

    it("al corregirlo se guarda en el perfil y avanza al pago", async () => {
        mockPerfil = { id: "u1", nombre: "Ana", rol: "cliente" };
        await renderEntrega();
        await llenarDomicilio();

        await fireEvent.changeText(screen.getByLabelText("Nombre completo de quien recibe"), " Ana   López ");
        await fireEvent.press(screen.getByText("Siguiente"));

        await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/pedido/nuevo/pago"));
        expect(mockActualizarNombre).toHaveBeenCalledWith("Ana López");
    });

    it("si no se puede guardar el nombre avisa y no avanza", async () => {
        mockPerfil = { id: "u1", nombre: "Ana", rol: "cliente" };
        mockActualizarNombre.mockResolvedValue({ error: "Error de conexión, inténtalo de nuevo" });
        await renderEntrega();
        await llenarDomicilio();

        await fireEvent.changeText(screen.getByLabelText("Nombre completo de quien recibe"), "Ana López");
        await fireEvent.press(screen.getByText("Siguiente"));

        expect(await screen.findByText("No se pudo guardar tu nombre")).toBeTruthy();
        expect(mockPush).not.toHaveBeenCalled();
    });
});
