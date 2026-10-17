import { rutaPorRol } from "../rutas";

describe("rutaPorRol", () => {
    it.each([
        ["cliente", "/home"],
        ["admin", "/admin"],
        ["repartidor", "/repartidor"],
    ] as const)("%s → %s", (rol, esperado) => {
        expect(rutaPorRol(rol)).toBe(esperado);
    });
});
