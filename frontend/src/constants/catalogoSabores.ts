import { ImageSourcePropType } from "react-native";
import { RellenoId, SaborPanId } from "../types/pedido.types";

// sabores disponibles: solo los que tienen imagen en assets/sabores (ver 02-data-model.md)
// en la BD se guarda el id; en pantalla, el nombre

export interface Sabor<T extends string> {
    id: T;
    nombre: string;
    imagen: ImageSourcePropType;
}

export const SABORES_PAN: Sabor<SaborPanId>[] = [
    { id: 'vainilla', nombre: 'Vainilla', imagen: require('../../assets/sabores/pan/vainilla.png') },
    { id: 'chocolate', nombre: 'Chocolate', imagen: require('../../assets/sabores/pan/chocolate.png') },
    { id: 'redvelvet', nombre: 'Red Velvet', imagen: require('../../assets/sabores/pan/redvelvet.png') },
    { id: 'fresa', nombre: 'Fresa', imagen: require('../../assets/sabores/pan/fresa.png') },
    { id: 'zanahoria', nombre: 'Zanahoria', imagen: require('../../assets/sabores/pan/zanahoria.png') },
    { id: 'tresleches', nombre: 'Tres leches', imagen: require('../../assets/sabores/pan/tresleches.png') },
];

export const SABORES_RELLENO: Sabor<RellenoId>[] = [
    { id: 'cremapastelera', nombre: 'Crema pastelera', imagen: require('../../assets/sabores/relleno/cremapastelera.png') },
    { id: 'mermeladafresa', nombre: 'Mermelada / Fresa', imagen: require('../../assets/sabores/relleno/mermeladafresa.png') },
    { id: 'chocolate', nombre: 'Chocolate', imagen: require('../../assets/sabores/relleno/chocolate.png') },
    { id: 'mantequillademani', nombre: 'Mantequilla de maní', imagen: require('../../assets/sabores/relleno/mantequillademani.png') },
    { id: 'cajeta', nombre: 'Cajeta', imagen: require('../../assets/sabores/relleno/cajeta.png') },
];

export function nombrePan(id: SaborPanId | null): string {
    return SABORES_PAN.find((s) => s.id === id)?.nombre ?? '';
}

export function nombreRelleno(id: RellenoId | null): string {
    return SABORES_RELLENO.find((s) => s.id === id)?.nombre ?? '';
}
