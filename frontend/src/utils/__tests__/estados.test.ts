import { ACCIONES } from "../../constants/estadosPedido";
import { accionesDisponibles, estadosDeFiltro, MENSAJES_MOTIVO, motivoNoEntrega, ordenAscendente, preguntaAccion } from "../estados";

describe("accionesDisponibles", () => {
    it.each([
        ["pendiente", "domicilio", ["confirmado", "cancelado"]],
        ["confirmado", "recoleccion", ["en_preparacion", "cancelado"]],
        ["en_preparacion", "domicilio", ["listo"]],
        ["listo", "domicilio", ["en_camino"]],
        ["listo", "recoleccion", ["entregado"]],
        ["listo", null, []],
        ["en_camino", "domicilio", []],
        ["no_entregado", "domicilio", ["listo", "cancelado"]],
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

    it("solo reprogramar quita el repartidor", () => {
        expect(Object.values(ACCIONES).filter((a) => a.quitaRepartidor)).toEqual([ACCIONES.reprogramar]);
    });
});

describe("preguntaAccion", () => {
    it("pone el folio en la pregunta", () => {
        expect(preguntaAccion(ACCIONES.listo, "ORN-7K2QXM")).toBe("¿Marcar el pedido ORN-7K2QXM como listo?");
    });
});

describe("estadosDeFiltro y ordenAscendente", () => {
    it("activos trae de pendiente a no entregado, sin borradores ni terminados", () => {
        expect(estadosDeFiltro("activos")).toEqual(["pendiente", "confirmado", "en_preparacion", "listo", "en_camino", "no_entregado"]);
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

describe("motivoNoEntrega", () => {
    it("usa la opcion elegida tal cual", () => {
        expect(motivoNoEntrega("Nadie recibió el pedido", "")).toEqual({ motivo: "Nadie recibió el pedido", error: null });
    });

    it("sin opcion pide elegir un motivo", () => {
        expect(motivoNoEntrega(null, "")).toEqual({ motivo: null, error: MENSAJES_MOTIVO.SIN_MOTIVO });
    });

    it("'Otro' usa el texto escrito, sin espacios de sobra", () => {
        expect(motivoNoEntrega("Otro", "  Calle cerrada por obras  ")).toEqual({ motivo: "Calle cerrada por obras", error: null });
    });

    it("'Otro' vacio o solo con espacios pide escribirlo", () => {
        expect(motivoNoEntrega("Otro", "   ")).toEqual({ motivo: null, error: MENSAJES_MOTIVO.OTRO_VACIO });
    });

    it("'Otro' de mas de 200 caracteres no se acepta", () => {
        expect(motivoNoEntrega("Otro", "a".repeat(201)).error).toBe(MENSAJES_MOTIVO.MUY_LARGO);
    });
});
