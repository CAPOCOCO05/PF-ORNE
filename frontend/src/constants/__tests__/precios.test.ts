import { calcularPrecio, esPrecioEstimado, formatearPrecio } from "../precios";

describe("calcularPrecio", () => {
    it("sin tamaño no hay precio", () => {
        expect(calcularPrecio({ tamanio: null, niveles: 2, relleno: "chocolate" })).toBeNull();
    });

    it("solo tamaño: base con 1 nivel y sin relleno (precio 'desde')", () => {
        expect(calcularPrecio({ tamanio: "15", niveles: null, relleno: null })).toBe(500);
    });

    it.each([
        // coinciden con los precio_base de prueba de 005_catalogo.sql
        ["10", 1, "cremapastelera", 380],
        ["15", 1, "chocolate", 540],
        ["20", 2, "cremapastelera", 930],
        ["30", 2, "mermeladafresa", 1150],
        ["30", 3, "cremapastelera", 1430],
    ] as const)("%s personas, %i niveles, %s → %i", (tamanio, niveles, relleno, esperado) => {
        expect(calcularPrecio({ tamanio, niveles, relleno })).toBe(esperado);
    });
});

describe("formatearPrecio", () => {
    it.each([
        [0, "$0.00 MXN"],
        [380, "$380.00 MXN"],
        [1250, "$1,250.00 MXN"],
        [1234567.5, "$1,234,567.50 MXN"],
    ])("%d → %s", (monto, esperado) => {
        expect(formatearPrecio(monto)).toBe(esperado);
    });
});

describe("esPrecioEstimado", () => {
    it.each([
        [null, false],
        [1, false],
        [2, false],
        [3, true],
        [4, true],
    ] as const)("%s niveles → %s", (niveles, esperado) => {
        expect(esPrecioEstimado(niveles)).toBe(esperado);
    });
});
