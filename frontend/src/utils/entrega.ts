import { RADIO_ENTREGA_KM, SUCURSAL } from "../constants/sucursal";
import { Coordenadas, DatosEntrega, Niveles } from "../types/pedido.types";
import { MENSAJES_PEDIDO } from "./pedido";

// reglas de entrega de F02 (D3, D4, D5) sin dependencias de pantalla.
// Las fechas viajan como texto 'YYYY-MM-DD' para no mezclar zonas horarias.
// El servidor valida lo mismo con la hora de Ensenada (migracion 008).

export const MENSAJES_ENTREGA = {
    TELEFONO: 'Ingresa un teléfono de 10 dígitos',
    NUMERO_EXTERIOR: 'Escribe un número válido (ej. 123 o 123-B) o S/N',
    UBICACION: 'Fija tu ubicación en el mapa',
    FUERA_DE_ZONA: 'Esta dirección está fuera de nuestra zona de entrega; puedes elegir recolección en sucursal',
    DOMINGO: 'No hacemos entregas en domingo',
    FECHA_MAXIMA: 'Solo puedes programar entregas hasta 60 días adelante',
} as const;

export const ENTREGA_VACIA: DatosEntrega = {
    tipoEntrega: null,
    calle: '',
    numeroExterior: '',
    numeroInterior: '',
    colonia: '',
    referencia: '',
    telefono: '',
    ubicacion: null,
    fechaEntrega: null,
    horaEntrega: null,
};

export const DIAS_MAXIMOS = 60;
export const MAX_CAMPO_DIRECCION = 100;
export const MAX_REFERENCIA = 200;

export function diasAnticipacion(niveles: Niveles | null): number {
    if (niveles !== null && niveles >= 3) return 10;
    if (niveles === 2) return 7;
    return 2;
}

export function mensajeAnticipacion(niveles: Niveles | null): string {
    const n = niveles ?? 1;
    return `Los pedidos de ${n} ${n === 1 ? 'nivel' : 'niveles'} requieren al menos ${diasAnticipacion(niveles)} días de anticipación`;
}

// fecha de hoy del dispositivo como 'YYYY-MM-DD'
export function hoyLocal(ahora: Date = new Date()): string {
    return aTexto(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

function aTexto(anio: number, mes: number, dia: number): string {
    return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// se opera en UTC para que sumar dias no dependa del horario de verano
function aUtc(fecha: string): Date {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia));
}

export function sumarDias(fecha: string, dias: number): string {
    const d = aUtc(fecha);
    d.setUTCDate(d.getUTCDate() + dias);
    return aTexto(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function esDomingo(fecha: string): boolean {
    return aUtc(fecha).getUTCDay() === 0;
}

export function fechaMinima(niveles: Niveles | null, hoy: string): string {
    return sumarDias(hoy, diasAnticipacion(niveles));
}

export function fechaMaxima(hoy: string): string {
    return sumarDias(hoy, DIAS_MAXIMOS);
}

// motivo por el que la fecha no se puede elegir, o undefined si esta disponible
export function validarFechaEntrega(fecha: string, niveles: Niveles | null, hoy: string): string | undefined {
    if (fecha < fechaMinima(niveles, hoy)) return mensajeAnticipacion(niveles);
    if (fecha > fechaMaxima(hoy)) return MENSAJES_ENTREGA.FECHA_MAXIMA;
    if (esDomingo(fecha)) return MENSAJES_ENTREGA.DOMINGO;
    return undefined;
}

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
    return distanciaKm(SUCURSAL.coordenadas, ubicacion) <= RADIO_ENTREGA_KM;
}

// se aceptan espacios y guiones al escribir; se guardan solo los 10 digitos
export function normalizarTelefono(telefono: string): string {
    return telefono.replace(/[\s-]/g, '');
}

export function telefonoValido(telefono: string): boolean {
    return /^[0-9]{10}$/.test(normalizarTelefono(telefono));
}

// F10 A6: empieza con un numero positivo ("123", "123-B", "45 A") o es "S/N";
// rechaza texto sin numero ("abc") y negativos ("-5")
export function numeroExteriorValido(numero: string): boolean {
    return /^(S\/N|[1-9][0-9A-Za-z\s/-]*)$/i.test(numero.trim());
}

// obligatorio y con formato de numero; undefined si esta bien
export function validarNumeroExterior(numero: string): string | undefined {
    if (!numero.trim()) return MENSAJES_PEDIDO.OBLIGATORIO;
    if (!numeroExteriorValido(numero)) return MENSAJES_ENTREGA.NUMERO_EXTERIOR;
    return undefined;
}

// texto legible para el repartidor: "Calle 123 Int 4, Colonia"
export function armarDireccion({calle, numeroExterior, numeroInterior, colonia}: Pick<DatosEntrega, 'calle' | 'numeroExterior' | 'numeroInterior' | 'colonia'>): string {
    const interior = numeroInterior.trim() ? ` Int ${numeroInterior.trim()}` : '';
    return `${calle.trim()} ${numeroExterior.trim()}${interior}, ${colonia.trim()}`;
}

// semanas del mes para el calendario, de lunes a domingo; null = celda vacia (D7)
export function semanasDelMes(anio: number, mes: number): (string | null)[][] {
    const diasEnMes = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
    const huecoInicial = (new Date(Date.UTC(anio, mes, 1)).getUTCDay() + 6) % 7; // lunes = 0
    const celdas: (string | null)[] = Array(huecoInicial).fill(null);
    for (let dia = 1; dia <= diasEnMes; dia++) celdas.push(aTexto(anio, mes, dia));
    while (celdas.length % 7 !== 0) celdas.push(null);

    const semanas: (string | null)[][] = [];
    for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
    return semanas;
}

export type CampoEntrega = 'tipoEntrega' | 'calle' | 'numeroExterior' | 'colonia' | 'ubicacion' | 'telefono' | 'fechaEntrega' | 'horaEntrega';

// campos faltantes o invalidos del paso 4 (F02 D4)
export function validarEntrega(datos: DatosEntrega, niveles: Niveles | null, hoy: string): Partial<Record<CampoEntrega, string>> {
    const errores: Partial<Record<CampoEntrega, string>> = {};
    if (!datos.tipoEntrega) errores.tipoEntrega = MENSAJES_PEDIDO.OBLIGATORIO;

    if (datos.tipoEntrega === 'domicilio') {
        if (!datos.calle.trim()) errores.calle = MENSAJES_PEDIDO.OBLIGATORIO;
        const errorNumero = validarNumeroExterior(datos.numeroExterior);
        if (errorNumero) errores.numeroExterior = errorNumero;
        if (!datos.colonia.trim()) errores.colonia = MENSAJES_PEDIDO.OBLIGATORIO;
        if (!datos.ubicacion) errores.ubicacion = MENSAJES_ENTREGA.UBICACION;
        else if (!dentroDeZona(datos.ubicacion)) errores.ubicacion = MENSAJES_ENTREGA.FUERA_DE_ZONA;
    }

    if (!datos.telefono.trim()) errores.telefono = MENSAJES_PEDIDO.OBLIGATORIO;
    else if (!telefonoValido(datos.telefono)) errores.telefono = MENSAJES_ENTREGA.TELEFONO;

    if (!datos.fechaEntrega) errores.fechaEntrega = MENSAJES_PEDIDO.OBLIGATORIO;
    else {
        const errorFecha = validarFechaEntrega(datos.fechaEntrega, niveles, hoy);
        if (errorFecha) errores.fechaEntrega = errorFecha;
    }

    if (!datos.horaEntrega) errores.horaEntrega = MENSAJES_PEDIDO.OBLIGATORIO;
    return errores;
}
