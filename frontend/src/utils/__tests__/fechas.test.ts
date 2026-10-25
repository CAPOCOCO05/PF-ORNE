import { formatearFecha, formatearFechaEntrega } from "../fechas";

describe("formatearFecha", () => {
    it("dia, mes abreviado y año en hora local", () => {
        expect(formatearFecha(new Date(2026, 9, 17, 12).toISOString())).toBe("17 oct 2026");
        expect(formatearFecha(new Date(2027, 0, 3, 12).toISOString())).toBe("3 ene 2027");
    });

    it("fecha invalida: texto vacio", () => {
        expect(formatearFecha("no es fecha")).toBe("");
    });
});

describe("formatearFechaEntrega", () => {
    it("dia de la semana, dia, mes y año sin depender de la zona horaria", () => {
        expect(formatearFechaEntrega("2026-10-26")).toBe("lunes 26 oct 2026");
        expect(formatearFechaEntrega("2027-01-02")).toBe("sábado 2 ene 2027");
    });

    it("texto invalido: vacio", () => {
        expect(formatearFechaEntrega("no-es-fecha")).toBe("");
    });
});
