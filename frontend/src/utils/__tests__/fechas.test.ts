import { formatearFecha } from "../fechas";

describe("formatearFecha", () => {
    it("dia, mes abreviado y año en hora local", () => {
        expect(formatearFecha(new Date(2026, 9, 17, 12).toISOString())).toBe("17 oct 2026");
        expect(formatearFecha(new Date(2027, 0, 3, 12).toISOString())).toBe("3 ene 2027");
    });

    it("fecha invalida: texto vacio", () => {
        expect(formatearFecha("no es fecha")).toBe("");
    });
});
