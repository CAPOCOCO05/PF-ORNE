import { urlComoLlegar } from "../mapas";

const UBICACION = { latitud: 31.78, longitud: -116.59 };

describe("urlComoLlegar", () => {
    it("android: ruta en Google Maps a las coordenadas", () => {
        expect(urlComoLlegar(UBICACION, "Calle Primera 123", "android"))
            .toBe("https://www.google.com/maps/dir/?api=1&destination=31.78%2C-116.59");
    });

    it("ios: ruta en Apple Maps a las coordenadas", () => {
        expect(urlComoLlegar(UBICACION, "Calle Primera 123", "ios")).toBe("https://maps.apple.com/?daddr=31.78%2C-116.59");
    });

    it("sin coordenadas: busca por la direccion en texto", () => {
        expect(urlComoLlegar(null, " Calle Primera 123, Centro ", "android"))
            .toBe("https://www.google.com/maps/dir/?api=1&destination=Calle%20Primera%20123%2C%20Centro");
    });

    it("sin coordenadas ni direccion no hay ruta", () => {
        expect(urlComoLlegar(null, "  ", "ios")).toBeNull();
    });
});
