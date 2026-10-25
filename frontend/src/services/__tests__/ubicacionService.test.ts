import * as Location from "expo-location";
import {
    buscarDireccion, direccionDesdeCoordenadas, MENSAJES_UBICACION, pedirPermisoUbicacion, ubicacionInicial,
} from "../ubicacionService";
import { SUCURSAL } from "../../constants/sucursal";

jest.mock("expo-location", () => ({
    requestForegroundPermissionsAsync: jest.fn(),
    getCurrentPositionAsync: jest.fn(),
    reverseGeocodeAsync: jest.fn(),
    geocodeAsync: jest.fn(),
    PermissionStatus: { GRANTED: "granted", DENIED: "denied" },
    Accuracy: { Balanced: 3 },
}));

const permiso = Location.requestForegroundPermissionsAsync as jest.Mock;
const posicion = Location.getCurrentPositionAsync as jest.Mock;
const inversa = Location.reverseGeocodeAsync as jest.Mock;
const geocodificar = Location.geocodeAsync as jest.Mock;

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
});

describe("pedirPermisoUbicacion", () => {
    it("true si el usuario da permiso", async () => {
        permiso.mockResolvedValue({ status: "granted" });
        expect(await pedirPermisoUbicacion()).toBe(true);
    });

    it("false si lo niega o si falla la solicitud", async () => {
        permiso.mockResolvedValueOnce({ status: "denied" });
        expect(await pedirPermisoUbicacion()).toBe(false);
        permiso.mockRejectedValueOnce(new Error("sin servicio"));
        expect(await pedirPermisoUbicacion()).toBe(false);
    });
});

describe("ubicacionInicial", () => {
    it("usa la ubicacion del usuario si dio permiso", async () => {
        permiso.mockResolvedValue({ status: "granted" });
        posicion.mockResolvedValue({ coords: { latitude: 31.8, longitude: -116.6 } });

        expect(await ubicacionInicial()).toEqual({ coordenadas: { latitud: 31.8, longitud: -116.6 }, esDelUsuario: true });
    });

    it("sin permiso: la sucursal, sin pedir la posicion", async () => {
        permiso.mockResolvedValue({ status: "denied" });

        expect(await ubicacionInicial()).toEqual({ coordenadas: SUCURSAL.coordenadas, esDelUsuario: false });
        expect(posicion).not.toHaveBeenCalled();
    });

    it("si falla el GPS: la sucursal", async () => {
        permiso.mockResolvedValue({ status: "granted" });
        posicion.mockRejectedValue(new Error("timeout"));

        expect(await ubicacionInicial()).toEqual({ coordenadas: SUCURSAL.coordenadas, esDelUsuario: false });
    });
});

describe("direccionDesdeCoordenadas", () => {
    const pin = { latitud: 31.78, longitud: -116.59 };

    it("autocompleta calle, numero exterior y colonia", async () => {
        inversa.mockResolvedValue([{ street: "Calle Primera", streetNumber: "123", district: "Zona Centro" }]);

        const resultado = await direccionDesdeCoordenadas(pin);

        expect(inversa).toHaveBeenCalledWith({ latitude: 31.78, longitude: -116.59 });
        expect(resultado).toEqual({
            direccion: { calle: "Calle Primera", numeroExterior: "123", colonia: "Zona Centro" },
            error: null,
        });
    });

    it("campos que el geocodificador no trae quedan vacios", async () => {
        inversa.mockResolvedValue([{ street: "Calle Primera", streetNumber: null, district: null }]);

        expect((await direccionDesdeCoordenadas(pin)).direccion).toEqual({ calle: "Calle Primera", numeroExterior: "", colonia: "" });
    });

    it("sin resultados o sin calle ni colonia: aviso para llenar a mano", async () => {
        inversa.mockResolvedValueOnce([]);
        expect(await direccionDesdeCoordenadas(pin)).toEqual({ direccion: null, error: MENSAJES_UBICACION.SIN_DIRECCION });
        inversa.mockResolvedValueOnce([{ street: null, streetNumber: null, district: null }]);
        expect(await direccionDesdeCoordenadas(pin)).toEqual({ direccion: null, error: MENSAJES_UBICACION.SIN_DIRECCION });
    });

    it("error de conexion: aviso para llenar a mano", async () => {
        inversa.mockRejectedValue(new Error("Network request failed"));
        expect(await direccionDesdeCoordenadas(pin)).toEqual({ direccion: null, error: MENSAJES_UBICACION.SIN_DIRECCION });
    });
});

describe("buscarDireccion", () => {
    it("busca dentro de Ensenada y devuelve las coordenadas", async () => {
        geocodificar.mockResolvedValue([{ latitude: 31.86, longitude: -116.62 }]);

        const resultado = await buscarDireccion("  Av. Reforma 100 ");

        expect(geocodificar).toHaveBeenCalledWith("Av. Reforma 100, Ensenada, B.C.");
        expect(resultado).toEqual({ ubicacion: { latitud: 31.86, longitud: -116.62 }, error: null });
    });

    it("texto vacio: no consulta", async () => {
        expect(await buscarDireccion("   ")).toEqual({ ubicacion: null, error: MENSAJES_UBICACION.BUSQUEDA_VACIA });
        expect(geocodificar).not.toHaveBeenCalled();
    });

    it("sin resultados", async () => {
        geocodificar.mockResolvedValue([]);
        expect(await buscarDireccion("xyz")).toEqual({ ubicacion: null, error: MENSAJES_UBICACION.SIN_RESULTADOS });
    });

    it("error de conexion: aviso para llenar a mano", async () => {
        geocodificar.mockRejectedValue(new Error("Network request failed"));
        expect(await buscarDireccion("Av. Reforma")).toEqual({ ubicacion: null, error: MENSAJES_UBICACION.SIN_DIRECCION });
    });
});
