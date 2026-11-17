import { PEDIDO_NUEVO, rutaPorRol, rutaTrasAutenticar } from "../rutas";

describe("rutaPorRol", () => {
    it.each([
        ["cliente", "/home"],
        ["admin", "/admin"],
        ["repartidor", "/repartidor"],
    ] as const)("%s → %s", (rol, esperado) => {
        expect(rutaPorRol(rol)).toBe(esperado);
    });
});

describe("rutaTrasAutenticar (F09)", () => {
    it("sin pedido pendiente va a /", () => {
        expect(rutaTrasAutenticar()).toBe("/");
        expect(rutaTrasAutenticar("")).toBe("/");
        expect(rutaTrasAutenticar("  ")).toBe("/");
    });

    it("'Crear pedido' abre el wizard vacio", () => {
        expect(rutaTrasAutenticar(PEDIDO_NUEVO)).toBe("/pedido/nuevo");
    });

    it("'Pedir' abre el wizard con el pastel precargado", () => {
        expect(rutaTrasAutenticar("p1")).toEqual({ pathname: "/pedido/nuevo", params: { pastel: "p1" } });
    });
});
