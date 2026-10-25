import { Coordenadas } from "../types/pedido.types";

// sucursal unica (F02 D6); las mismas coordenadas usa distancia_sucursal_km() en la migracion 008
export const SUCURSAL = {
    nombre: 'Pastelería ORNE',
    direccion: 'Calle Primera, C.P. 22785, Ensenada, B.C.',
    horario: 'Lunes a sábado, de 10:00 a 18:00',
    coordenadas: {latitud: 31.782259, longitud: -116.5956174} satisfies Coordenadas,
} as const;

// entrega a domicilio gratis dentro de este radio (F02 D5)
export const RADIO_ENTREGA_KM = 15;
