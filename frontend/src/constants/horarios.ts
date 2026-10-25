import { HoraBloque } from "../types/pedido.types";

// bloques de entrega de 2 h (F02 D2); en la BD se guarda el inicio (pedidos.hora_entrega)
export const BLOQUES_HORARIO: {inicio: HoraBloque; texto: string}[] = [
    {inicio: '10:00', texto: '10:00 – 12:00'},
    {inicio: '12:00', texto: '12:00 – 14:00'},
    {inicio: '14:00', texto: '14:00 – 16:00'},
    {inicio: '16:00', texto: '16:00 – 18:00'},
];

export function textoBloque(inicio: HoraBloque | null): string {
    return BLOQUES_HORARIO.find((b) => b.inicio === inicio)?.texto ?? '';
}
