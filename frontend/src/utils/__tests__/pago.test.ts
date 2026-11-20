import { digitoControlClabe, formatearClabe, generarClabe } from "../pago";

const ID_A = "6f1c2b9e-1a2b-4c3d-9e8f-001122334455";
const ID_B = "0a9b8c7d-6e5f-4a3b-8c2d-ffeeddccbbaa";

describe("generarClabe", () => {
    it("da 18 digitos", () => {
        expect(generarClabe(ID_A)).toMatch(/^\d{18}$/);
    });

    it("el ultimo digito es el verificador de los primeros 17", () => {
        const clabe = generarClabe(ID_A);
        expect(Number(clabe[17])).toBe(digitoControlClabe(clabe));
    });

    it("el mismo pedido siempre muestra la misma CLABE", () => {
        expect(generarClabe(ID_A)).toBe(generarClabe(ID_A));
    });

    it("cada pedido tiene una CLABE distinta y no es de ceros", () => {
        expect(generarClabe(ID_A)).not.toBe(generarClabe(ID_B));
        expect(generarClabe(ID_A)).not.toBe("000000000000000000");
    });
});

describe("digitoControlClabe", () => {
    it("calcula el verificador con pesos 3, 7, 1 (CLABE de ejemplo de Banxico)", () => {
        expect(digitoControlClabe("03218000011835971")).toBe(9);
    });
});

describe("formatearClabe", () => {
    it("agrupa en 3-3-4-4-4", () => {
        expect(formatearClabe("032180000118359719")).toBe("032 180 0001 1835 9719");
    });
});
