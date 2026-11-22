import { guardarDatosCliente, obtenerDatosCliente } from "../perfilService";
import { MENSAJES_DATOS } from "../erroresDatos";
import { supabase } from "../supabase";
import { llamadaFetch, simularApi, simularSinConexion } from "../../test-utils/apiSimulada";

// F07 M7: datos de contacto del cliente por medio de la API (/perfil/datos-cliente)
jest.mock("../supabase", () => ({ supabase: { auth: { getSession: jest.fn() } } }));

const DATOS = {
    telefono: "6461234567",
    direccion: {
        calle: "Calle Primera", numeroExterior: "123", numeroInterior: "", colonia: "Zona Centro", referencia: "",
        ubicacion: { latitud: 31.782259, longitud: -116.5956174 },
    },
};

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { access_token: "tok" } } });
});

describe("obtenerDatosCliente (F07 M7)", () => {
    it("pide los datos del usuario de la sesion", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { datos: DATOS } });

        expect(await obtenerDatosCliente()).toEqual({ datos: DATOS, error: null });
        const [url, opciones] = llamadaFetch(fetchMock);
        expect(url).toBe("/perfil/datos-cliente");
        expect(opciones.headers).toHaveProperty("Authorization", "Bearer tok");
    });

    it("sin internet: datos null y mensaje de conexion", async () => {
        simularSinConexion();

        expect(await obtenerDatosCliente()).toEqual({ datos: null, error: MENSAJES_DATOS.CONEXION });
    });
});

describe("guardarDatosCliente (F07 M7)", () => {
    it("manda telefono y direccion con PUT", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { datos: DATOS } });

        expect(await guardarDatosCliente(DATOS)).toEqual({ error: null });
        const [url, opciones] = llamadaFetch(fetchMock);
        expect(url).toBe("/perfil/datos-cliente");
        expect(opciones.method).toBe("PUT");
        expect(JSON.parse(opciones.body as string)).toEqual(DATOS);
    });

    it("quitar la direccion manda direccion null", async () => {
        const fetchMock = simularApi({ status: 200, cuerpo: { datos: { telefono: "", direccion: null } } });

        await guardarDatosCliente({ telefono: "", direccion: null });

        expect(JSON.parse(llamadaFetch(fetchMock)[1].body as string)).toEqual({ telefono: "", direccion: null });
    });

    it("datos rechazados por la API: su mensaje", async () => {
        simularApi({ status: 400, cuerpo: { error: "Revisa los datos enviados", detalles: { telefono: "Ingresa un teléfono de 10 dígitos" } } });

        expect(await guardarDatosCliente({ ...DATOS, telefono: "123" })).toEqual({ error: "Revisa los datos enviados" });
    });

    it("sin internet: mensaje de conexion", async () => {
        simularSinConexion();

        expect(await guardarDatosCliente(DATOS)).toEqual({ error: MENSAJES_DATOS.CONEXION });
    });
});
