import {
    FORMULARIO_PASTEL_VACIO, formularioDePastel, MENSAJES_CATALOGO, nombreImagenCatalogo, rutaDeUrlCatalogo, validarPastel,
} from "../catalogo";
import { MENSAJES_PEDIDO } from "../pedido";
import { FormularioPastel, PastelAdmin } from "../../types/pedido.types";

const VALIDO: FormularioPastel = {
    ...FORMULARIO_PASTEL_VACIO,
    nombre: "Red Velvet dos pisos", tamanio: "20", niveles: 2, tipoPan: "redvelvet", relleno: "cremapastelera",
};

describe("validarPastel", () => {
    it("formulario completo: sin errores", () => {
        expect(validarPastel(VALIDO)).toEqual({});
    });

    it("formulario vacio: nombre y las cuatro opciones son obligatorios; la descripcion no", () => {
        expect(validarPastel(FORMULARIO_PASTEL_VACIO)).toEqual({
            nombre: MENSAJES_CATALOGO.NOMBRE_VACIO,
            tamanio: MENSAJES_PEDIDO.OBLIGATORIO,
            niveles: MENSAJES_PEDIDO.OBLIGATORIO,
            tipoPan: MENSAJES_PEDIDO.OBLIGATORIO,
            relleno: MENSAJES_PEDIDO.OBLIGATORIO,
        });
    });

    it("nombre de solo espacios cuenta como vacio", () => {
        expect(validarPastel({ ...VALIDO, nombre: "   " }).nombre).toBe(MENSAJES_CATALOGO.NOMBRE_VACIO);
    });

    it("nombre de 60 caracteres es valido; de 61 no", () => {
        expect(validarPastel({ ...VALIDO, nombre: "a".repeat(60) }).nombre).toBeUndefined();
        expect(validarPastel({ ...VALIDO, nombre: "a".repeat(61) }).nombre).toBe(MENSAJES_CATALOGO.NOMBRE_LARGO);
    });

    it("descripcion de mas de 200 caracteres", () => {
        expect(validarPastel({ ...VALIDO, descripcion: "a".repeat(200) }).descripcion).toBeUndefined();
        expect(validarPastel({ ...VALIDO, descripcion: "a".repeat(201) }).descripcion).toBe(MENSAJES_CATALOGO.DESCRIPCION_LARGA);
    });

    it("niveles por encima del maximo del tamaño (misma regla del wizard)", () => {
        expect(validarPastel({ ...VALIDO, tamanio: "10", niveles: 2 }).niveles).toBe(MENSAJES_CATALOGO.NIVELES_EXCEDIDOS);
    });
});

describe("formularioDePastel", () => {
    it("copia los datos del pastel y deja la descripcion vacia si es null", () => {
        const pastel: PastelAdmin = {
            id: "p1", nombre: "Boda clásica", descripcion: null, imagen_url: "https://x/catalogo/a.jpg", precio_base: 1430,
            tamanio: "30", niveles: 3, tipo_pan: "vainilla", relleno: "cremapastelera", activo: false,
        };

        expect(formularioDePastel(pastel)).toEqual({
            nombre: "Boda clásica", descripcion: "", tamanio: "30", niveles: 3, tipoPan: "vainilla",
            relleno: "cremapastelera", activo: false, imagenUrl: "https://x/catalogo/a.jpg", imagenLocal: null,
        });
    });
});

describe("imagenes del catalogo", () => {
    it("nombre de archivo unico por subida", () => {
        expect(nombreImagenCatalogo("png", 1700000000000, 0.123456789)).toMatch(/^pastel-1700000000000-[a-z0-9]{1,6}\.png$/);
    });

    it("ruta del bucket a partir de la URL publica", () => {
        expect(rutaDeUrlCatalogo("https://abc.supabase.co/storage/v1/object/public/catalogo/pastel-1-x.jpg")).toBe("pastel-1-x.jpg");
    });

    it("null si no hay URL o no es del bucket catalogo", () => {
        expect(rutaDeUrlCatalogo(null)).toBeNull();
        expect(rutaDeUrlCatalogo("https://otro.sitio/imagen.jpg")).toBeNull();
        expect(rutaDeUrlCatalogo("https://abc.supabase.co/storage/v1/object/public/referencias-pasteles/a.jpg")).toBeNull();
    });
});
