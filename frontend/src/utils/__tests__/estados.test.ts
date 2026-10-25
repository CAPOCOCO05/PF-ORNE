import { ACCIONES } from "../../constants/estadosPedido";
import { accionesDisponibles, estadosDeFiltro, ordenAscendente, preguntaAccion } from "../estados";

describe("accionesDisponibles", () => {
    it.each([
        ["pendiente", "domicilio", ["confirmado", "cancelado"]],
        ["confirmado", "recoleccion", ["en_preparacion", "cancelado"]],
        ["en_preparacion", "domicilio", ["listo"]],
        ["listo", "domicilio", ["en_camino"]],
        ["listo", "recoleccion", ["entregado"]],
        ["listo", null, []],
        ["en_camino", "domicilio", []],
        ["entregado", "recoleccion", []],
        ["cancelado", "domicilio", []],
        ["borrador", "domicilio", []],
    ] as const)("%s (%s) → %j", (estado, tipo, destinos) => {
        expect(accionesDisponibles(estado, tipo).map((a) => a.destino)).toEqual(destinos);
    });

    it("solo enviar a reparto exige repartidor y solo cancelar es destructiva", () => {
        const todas = Object.values(ACCIONES);
        expect(todas.filter((a) => a.requiereRepartidor)).toEqual([ACCIONES.reparto]);
        expect(todas.filter((a) => a.destructiva)).toEqual([ACCIONES.cancelar]);
    });
});

describe("preguntaAccion", () => {
    it("pone el folio en la pregunta", () => {
        expect(preguntaAccion(ACCIONES.listo, "ORN-7K2QXM")).toBe("¿Marcar el pedido ORN-7K2QXM como listo?");
    });
});

describe("estadosDeFiltro y ordenAscendente", () => {
    it("activos trae de pendiente a en camino, sin borradores ni terminados", () => {
        expect(estadosDeFiltro("activos")).toEqual(["pendiente", "confirmado", "en_preparacion", "listo", "en_camino"]);
    });

    it("un estado trae solo ese estado", () => {
        expect(estadosDeFiltro("listo")).toEqual(["listo"]);
    });

    it.each([
        ["activos", true],
        ["pendiente", true],
        ["en_camino", true],
        ["entregado", false],
        ["cancelado", false],
    ] as const)("%s ascendente: %s", (filtro, esperado) => {
        expect(ordenAscendente(filtro)).toBe(esperado);
    });
});
