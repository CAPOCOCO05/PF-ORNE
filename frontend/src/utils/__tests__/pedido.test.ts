import {
    MAX_BYTES_IMAGEN, MENSAJES_PEDIDO, ajustarNiveles, contarCaracteres, limitarMensaje,
    mimeImagen, nivelesPermitidos, normalizarMensaje, validarImagen, validarPaso,
} from "../pedido";
import { PedidoEnCurso } from "../../types/pedido.types";

const PEDIDO_VACIO: PedidoEnCurso = {
    id: null, tamanio: null, niveles: null, tipoPan: null, relleno: null,
    mensaje: "", imagenLocal: null, imagenRuta: null, pasoActual: 1,
};

describe("nivelesPermitidos", () => {
    it.each([
        ["10", [1]],
        ["15", [1, 2]],
        ["20", [1, 2, 3]],
        ["30", [1, 2, 3, 4]],
        [null, [1, 2, 3, 4]],
    ] as const)("%s personas → %j", (tamanio, esperado) => {
        expect(nivelesPermitidos(tamanio)).toEqual(esperado);
    });
});

describe("ajustarNiveles", () => {
    it("baja los niveles al maximo del tamaño y avisa", () => {
        expect(ajustarNiveles("15", 4)).toEqual({ niveles: 2, ajustado: true });
    });

    it("deja igual los niveles validos o sin elegir", () => {
        expect(ajustarNiveles("20", 3)).toEqual({ niveles: 3, ajustado: false });
        expect(ajustarNiveles("10", null)).toEqual({ niveles: null, ajustado: false });
    });
});

describe("mensaje de decoracion", () => {
    it("un emoji cuenta como un caracter", () => {
        expect(contarCaracteres("Feliz 🎂")).toBe(7);
    });

    it("recorta a 500 caracteres visibles sin partir emojis", () => {
        const largo = "🎂".repeat(501);
        expect(contarCaracteres(limitarMensaje(largo))).toBe(500);
        expect(limitarMensaje("hola")).toBe("hola");
    });

    it("vacio o solo espacios se guarda como null", () => {
        expect(normalizarMensaje("   ")).toBeNull();
        expect(normalizarMensaje("  Feliz día ")).toBe("Feliz día");
    });
});

describe("imagen de referencia", () => {
    it.each([
        [{ uri: "file:///a.bin", mimeType: "image/png" }, "image/png"],
        [{ uri: "file:///a.bin", mimeType: "IMAGE/JPEG" }, "image/jpeg"],
        [{ uri: "file:///foto.HEIC" }, "image/heic"],
        [{ uri: "file:///x", fileName: "foto.jpeg" }, "image/jpeg"],
        [{ uri: "file:///doc.pdf", mimeType: "application/pdf" }, null],
        [{ uri: "file:///a.gif", mimeType: "image/gif" }, null],
        [{ uri: "file:///sin-extension" }, null],
    ])("%j → %s", (imagen, esperado) => {
        expect(mimeImagen(imagen)).toBe(esperado);
    });

    it("rechaza archivos que no son imagen", () => {
        expect(validarImagen({ uri: "file:///doc.pdf", mimeType: "application/pdf" })).toBe(MENSAJES_PEDIDO.IMAGEN_FORMATO);
    });

    it("rechaza imagenes de mas de 5 MB", () => {
        expect(validarImagen({ uri: "file:///a.jpg", fileSize: MAX_BYTES_IMAGEN + 1 })).toBe(MENSAJES_PEDIDO.IMAGEN_TAMANO);
    });

    it("acepta una imagen valida", () => {
        expect(validarImagen({ uri: "file:///a.png", mimeType: "image/png", fileSize: 1000 })).toBeUndefined();
    });
});

describe("validarPaso", () => {
    it("paso 1 exige tamaño y niveles", () => {
        expect(validarPaso(1, PEDIDO_VACIO)).toEqual({
            tamanio: MENSAJES_PEDIDO.OBLIGATORIO,
            niveles: MENSAJES_PEDIDO.OBLIGATORIO,
        });
        expect(validarPaso(1, { ...PEDIDO_VACIO, tamanio: "15", niveles: 2 })).toEqual({});
    });

    it("paso 2 exige pan y relleno", () => {
        expect(validarPaso(2, { ...PEDIDO_VACIO, tipoPan: "fresa" })).toEqual({ relleno: MENSAJES_PEDIDO.OBLIGATORIO });
    });

    it("paso 3 no tiene campos obligatorios", () => {
        expect(validarPaso(3, PEDIDO_VACIO)).toEqual({});
    });
});
