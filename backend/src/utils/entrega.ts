import { Coordenadas, RADIO_ENTREGA_KM, SUCURSAL_COORDENADAS } from '../constants/entrega';

// funciones puras de entrega (F02), sin acceso a datos

// formula de haversine (igual que distancia_sucursal_km en la migracion 008)
export function distanciaKm(a: Coordenadas, b: Coordenadas): number {
    const radianes = (grados: number) => grados * Math.PI / 180;
    const dLat = radianes(b.latitud - a.latitud);
    const dLng = radianes(b.longitud - a.longitud);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(radianes(a.latitud)) * Math.cos(radianes(b.latitud)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function dentroDeZona(ubicacion: Coordenadas): boolean {
    return distanciaKm(SUCURSAL_COORDENADAS, ubicacion) <= RADIO_ENTREGA_KM;
}

// se aceptan espacios y guiones al escribir; se guardan solo los 10 digitos
export function normalizarTelefono(telefono: string): string {
    return telefono.replace(/[\s-]/g, '');
}

export function telefonoValido(telefono: string): boolean {
    return /^[0-9]{10}$/.test(normalizarTelefono(telefono));
}

// empieza con un numero positivo ("123", "123-B", "45 A") o es "S/N" (F10 A6)
export function numeroExteriorValido(numero: string): boolean {
    return /^(S\/N|[1-9][0-9A-Za-z\s/-]*)$/i.test(numero.trim());
}

export function esCoordenada(valor: unknown): valor is Coordenadas {
    if (typeof valor !== 'object' || valor === null) return false;
    const { latitud, longitud } = valor as Record<string, unknown>;
    return typeof latitud === 'number' && typeof longitud === 'number'
        && Math.abs(latitud) <= 90 && Math.abs(longitud) <= 180;
}
