// si la ultima peticion a la API se quedo sin respuesta (sin internet o API inalcanzable).
// api.ts lo marca en cada peticion y el banner de conexion lo escucha (F10 A8): asi el banner no
// depende solo de que el sistema avise el cambio de red, que en iOS no siempre llega

type Oyente = (sinRespuesta: boolean) => void;

let sinRespuesta = false;
const oyentes = new Set<Oyente>();

// llego = true si la API respondio (aunque sea con un error); false si no hubo respuesta
export function marcarRespuestaApi(llego: boolean): void {
    if (sinRespuesta === !llego) return;
    sinRespuesta = !llego;
    oyentes.forEach((oyente) => oyente(sinRespuesta));
}

export function apiSinRespuesta(): boolean {
    return sinRespuesta;
}

// devuelve la funcion para dejar de escuchar
export function suscribirRespuestaApi(oyente: Oyente): () => void {
    oyentes.add(oyente);
    return () => {
        oyentes.delete(oyente);
    };
}
