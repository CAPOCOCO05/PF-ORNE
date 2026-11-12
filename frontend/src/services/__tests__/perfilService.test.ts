import { guardarDatosCliente, obtenerDatosCliente } from "../perfilService";
import { MENSAJES_DATOS } from "../erroresDatos";
import { supabase } from "../supabase";
import { consultaSimulada } from "../../test-utils/consultaSupabase";

jest.mock("../supabase", () => ({ supabase: { from: jest.fn() } }));

const FILA = {
    telefono: "6461234567", calle: "Calle Primera", numero_exterior: "123", numero_interior: null, colonia: "Zona Centro",
    direccion_referencia: null, direccion_lat: "31.7822590", direccion_lng: "-116.5956174",
};

const ERROR_RED = { message: "TypeError: Network request failed", code: "" };

beforeEach(() => jest.clearAllMocks());

describe("obtenerDatosCliente (F07 M7)", () => {
    it("lee la fila del usuario y convierte la direccion", async () => {
        const consulta = consultaSimulada({ data: FILA, error: null });
        (supabase.from as jest.Mock).mockReturnValue(consulta);

        const { datos, error } = await obtenerDatosCliente("u1");

        expect(supabase.from).toHaveBeenCalledWith("datos_cliente");
        expect(consulta.eq).toHaveBeenCalledWith("usuario_id", "u1");
        expect(error).toBeNull();
        expect(datos).toEqual({
            telefono: "6461234567",
            direccion: {
                calle: "Calle Primera", numeroExterior: "123", numeroInterior: "", colonia: "Zona Centro",
                referencia: "", ubicacion: { latitud: 31.782259, longitud: -116.5956174 },
            },
        });
    });

    it("sin fila: datos vacios, no es error", async () => {
        (supabase.from as jest.Mock).mockReturnValue(consultaSimulada({ data: null, error: null }));

        expect(await obtenerDatosCliente("u1")).toEqual({ datos: { telefono: "", direccion: null }, error: null });
    });

    it("solo telefono: sin direccion", async () => {
        const soloTelefono = { ...FILA, calle: null, numero_exterior: null, colonia: null, direccion_lat: null, direccion_lng: null };
        (supabase.from as jest.Mock).mockReturnValue(consultaSimulada({ data: soloTelefono, error: null }));

        const { datos } = await obtenerDatosCliente("u1");

        expect(datos).toEqual({ telefono: "6461234567", direccion: null });
    });

    it("error de red: mensaje de conexion", async () => {
        (supabase.from as jest.Mock).mockReturnValue(consultaSimulada({ data: null, error: ERROR_RED }));

        expect(await obtenerDatosCliente("u1")).toEqual({ datos: null, error: MENSAJES_DATOS.CONEXION });
    });
});

describe("guardarDatosCliente (F07 M7)", () => {
    it("upsert por usuario con la direccion completa", async () => {
        const consulta = consultaSimulada({ error: null });
        (supabase.from as jest.Mock).mockReturnValue(consulta);

        const { error } = await guardarDatosCliente("u1", {
            telefono: "6461234567",
            direccion: {
                calle: "Calle Primera", numeroExterior: "123", numeroInterior: "", colonia: "Zona Centro",
                referencia: "Portón negro", ubicacion: { latitud: 31.78, longitud: -116.6 },
            },
        });

        expect(error).toBeNull();
        expect(consulta.upsert).toHaveBeenCalledWith({
            usuario_id: "u1", telefono: "6461234567", calle: "Calle Primera", numero_exterior: "123",
            numero_interior: null, colonia: "Zona Centro", direccion_referencia: "Portón negro",
            direccion_lat: 31.78, direccion_lng: -116.6,
        }, { onConflict: "usuario_id" });
    });

    it("sin direccion ni telefono vacia todas las columnas", async () => {
        const consulta = consultaSimulada({ error: null });
        (supabase.from as jest.Mock).mockReturnValue(consulta);

        await guardarDatosCliente("u1", { telefono: "", direccion: null });

        expect(consulta.upsert).toHaveBeenCalledWith({
            usuario_id: "u1", telefono: null, calle: null, numero_exterior: null, numero_interior: null,
            colonia: null, direccion_referencia: null, direccion_lat: null, direccion_lng: null,
        }, { onConflict: "usuario_id" });
    });

    it("error de red: mensaje de conexion", async () => {
        (supabase.from as jest.Mock).mockReturnValue(consultaSimulada({ error: ERROR_RED }));

        expect(await guardarDatosCliente("u1", { telefono: "", direccion: null })).toEqual({ error: MENSAJES_DATOS.CONEXION });
    });
});
