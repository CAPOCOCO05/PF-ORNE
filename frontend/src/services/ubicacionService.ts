import * as Location from "expo-location";
import { SUCURSAL } from "../constants/sucursal";
import { Coordenadas, DatosEntrega } from "../types/pedido.types";

// permiso, ubicacion y geocodificacion del paso de entrega (F02 D5).
// Usa el geocodificador del dispositivo: sin API key ni costo.
// Ninguna funcion lanza excepciones: si algo falla, el usuario llena la direccion a mano.

export const MENSAJES_UBICACION = {
    SIN_DIRECCION: 'No pudimos obtener la dirección, llénala manualmente',
    SIN_RESULTADOS: 'No encontramos esa dirección; intenta con otra o mueve el pin en el mapa',
    BUSQUEDA_VACIA: 'Escribe una dirección para buscar',
} as const;

export type DireccionGeocodificada = Pick<DatosEntrega, 'calle' | 'numeroExterior' | 'colonia'>;

interface UbicacionInicial {
    coordenadas: Coordenadas;
    esDelUsuario: boolean;   // false: se uso la sucursal por falta de permiso o de señal
}

// permiso denegado no bloquea el flujo: queda la busqueda por texto (F02, casos de error)
export async function pedirPermisoUbicacion(): Promise<boolean> {
    try {
        const {status} = await Location.requestForegroundPermissionsAsync();
        return status === Location.PermissionStatus.GRANTED;
    } catch (error) {
        console.warn('No se pudo pedir el permiso de ubicación:', error);
        return false;
    }
}

// region inicial del mapa: el usuario si dio permiso; si no, la sucursal (D5)
export async function ubicacionInicial(): Promise<UbicacionInicial> {
    const deSucursal: UbicacionInicial = {coordenadas: SUCURSAL.coordenadas, esDelUsuario: false};
    if (!(await pedirPermisoUbicacion())) return deSucursal;
    try {
        const {coords} = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
        return {coordenadas: {latitud: coords.latitude, longitud: coords.longitude}, esDelUsuario: true};
    } catch (error) {
        console.warn('No se pudo obtener la ubicación actual:', error);
        return deSucursal;
    }
}

// autocompleta calle, numero exterior y colonia al fijar el pin
export async function direccionDesdeCoordenadas(ubicacion: Coordenadas): Promise<{direccion: DireccionGeocodificada | null; error: string | null}> {
    try {
        const [resultado] = await Location.reverseGeocodeAsync({latitude: ubicacion.latitud, longitude: ubicacion.longitud});
        if (!resultado || (!resultado.street && !resultado.district)) {
            return {direccion: null, error: MENSAJES_UBICACION.SIN_DIRECCION};
        }
        return {
            direccion: {
                calle: resultado.street ?? '',
                numeroExterior: resultado.streetNumber ?? '',
                colonia: resultado.district ?? '',
            },
            error: null,
        };
    } catch (error) {
        console.warn('Error en geocodificación inversa:', error);
        return {direccion: null, error: MENSAJES_UBICACION.SIN_DIRECCION};
    }
}

// busqueda por texto; se agrega la ciudad para no caer en otra "Calle Primera"
export async function buscarDireccion(texto: string): Promise<{ubicacion: Coordenadas | null; error: string | null}> {
    const consulta = texto.trim();
    if (!consulta) return {ubicacion: null, error: MENSAJES_UBICACION.BUSQUEDA_VACIA};
    try {
        const [resultado] = await Location.geocodeAsync(`${consulta}, Ensenada, B.C.`);
        if (!resultado) return {ubicacion: null, error: MENSAJES_UBICACION.SIN_RESULTADOS};
        return {ubicacion: {latitud: resultado.latitude, longitud: resultado.longitude}, error: null};
    } catch (error) {
        console.warn('Error al buscar la dirección:', error);
        return {ubicacion: null, error: MENSAJES_UBICACION.SIN_DIRECCION};
    }
}
