import { Coordenadas } from "../types/pedido.types";

export type PlataformaMapas = 'ios' | 'android' | 'web' | string;

// "Cómo llegar" del repartidor (F06): ruta a las coordenadas o, si no hay, a la direccion
// en texto. En iOS se abre Apple Maps; en Android y web, Google Maps (app o navegador)
export function urlComoLlegar(ubicacion: Coordenadas | null, direccion: string, plataforma: PlataformaMapas): string | null {
    const destino = ubicacion ? `${ubicacion.latitud},${ubicacion.longitud}` : direccion.trim();
    if (!destino) return null;
    const destinoUrl = encodeURIComponent(destino);
    if (plataforma === 'ios') return `https://maps.apple.com/?daddr=${destinoUrl}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${destinoUrl}`;
}
