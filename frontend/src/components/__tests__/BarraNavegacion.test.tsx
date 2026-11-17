import { pestaniaActiva } from "../BarraNavegacion";

jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ session: null }) }));

// F08 N1 D5: en una ruta sin pestaña se resalta la pestaña de la que se llego
const OCULTAS = { "pedido/nuevo": "home", "pedido/[id]": "pedidos", "perfil/editar": "perfil" };

describe("pestaniaActiva", () => {
    it.each([
        ["home", "home"],
        ["pedidos", "pedidos"],
        ["pedido/nuevo", "home"],
        ["pedido/[id]", "pedidos"],
        ["perfil/editar", "perfil"],
    ])("%s → %s", (ruta, esperada) => {
        expect(pestaniaActiva(ruta, OCULTAS)).toBe(esperada);
    });

    it("sin rutas ocultas regresa la misma ruta", () => {
        expect(pestaniaActiva("index", {})).toBe("index");
    });
});
