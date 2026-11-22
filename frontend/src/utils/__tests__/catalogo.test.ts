import {
    FORMULARIO_PASTEL_VACIO, formularioDePastel, MENSAJES_CATALOGO, validarPastel,
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
