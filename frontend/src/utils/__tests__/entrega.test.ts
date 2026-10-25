import {
    MENSAJES_ENTREGA, armarDireccion, dentroDeZona, diasAnticipacion, distanciaKm, esDomingo, fechaMaxima,
    fechaMinima, hoyLocal, normalizarTelefono, semanasDelMes, sumarDias, telefonoValido, validarEntrega, validarFechaEntrega,
} from "../entrega";
import { MENSAJES_PEDIDO } from "../pedido";
import { SUCURSAL } from "../../constants/sucursal";
import { DatosEntrega } from "../../types/pedido.types";

// viernes 16 de octubre de 2026
const HOY = "2026-10-16";

const DOMICILIO: DatosEntrega = {
    tipoEntrega: "domicilio", calle: "Calle Primera", numeroExterior: "123", numeroInterior: "", colonia: "Centro",
    referencia: "", telefono: "646 123 4567", ubicacion: { latitud: 31.79, longitud: -116.6 },
    fechaEntrega: "2026-10-19", horaEntrega: "12:00",
};

describe("fechas", () => {
    it("hoyLocal usa la fecha del dispositivo", () => {
        expect(hoyLocal(new Date(2026, 9, 5, 23, 59))).toBe("2026-10-05");
    });

    it("sumarDias cruza meses y años", () => {
        expect(sumarDias("2026-10-30", 3)).toBe("2026-11-02");
        expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
        expect(sumarDias("2027-02-27", 2)).toBe("2027-03-01");
    });

    it("esDomingo", () => {
        expect(esDomingo("2026-10-18")).toBe(true);
        expect(esDomingo("2026-10-19")).toBe(false);
    });

    it.each([
        [null, 2], [1, 2], [2, 7], [3, 10], [4, 10],
    ] as const)("%s niveles → %i dias de anticipacion", (niveles, dias) => {
        expect(diasAnticipacion(niveles)).toBe(dias);
    });

    it("fecha minima y maxima", () => {
        expect(fechaMinima(1, HOY)).toBe("2026-10-18");
        expect(fechaMinima(2, HOY)).toBe("2026-10-23");
        expect(fechaMaxima(HOY)).toBe("2026-12-15");
    });
});

describe("validarFechaEntrega", () => {
    it("antes de la anticipacion minima", () => {
        expect(validarFechaEntrega("2026-10-17", 1, HOY)).toBe("Los pedidos de 1 nivel requieren al menos 2 días de anticipación");
        expect(validarFechaEntrega("2026-10-22", 2, HOY)).toBe("Los pedidos de 2 niveles requieren al menos 7 días de anticipación");
    });

    it("domingo", () => {
        expect(validarFechaEntrega("2026-10-18", 1, HOY)).toBe(MENSAJES_ENTREGA.DOMINGO);
    });

    it("mas de 60 dias", () => {
        expect(validarFechaEntrega("2026-12-16", 1, HOY)).toBe(MENSAJES_ENTREGA.FECHA_MAXIMA);
    });

    it("fecha valida", () => {
        expect(validarFechaEntrega("2026-10-19", 1, HOY)).toBeUndefined();
        expect(validarFechaEntrega("2026-12-15", 4, HOY)).toBeUndefined();
    });
});

describe("zona de entrega", () => {
    it("distancia a la sucursal", () => {
        expect(distanciaKm(SUCURSAL.coordenadas, SUCURSAL.coordenadas)).toBe(0);
        // ~10 km al norte (mismo caso que la prueba de la migracion 008)
        expect(Math.round(distanciaKm(SUCURSAL.coordenadas, { latitud: 31.87, longitud: -116.6 }))).toBe(10);
    });

    it("Ensenada dentro, Tijuana fuera", () => {
        expect(dentroDeZona({ latitud: 31.86, longitud: -116.6 })).toBe(true);
        expect(dentroDeZona({ latitud: 32.53, longitud: -117.04 })).toBe(false);
    });
});

describe("telefono y direccion", () => {
    it("acepta espacios y guiones; exige 10 digitos", () => {
        expect(normalizarTelefono("646-123 4567")).toBe("6461234567");
        expect(telefonoValido("646 123 4567")).toBe(true);
        expect(telefonoValido("646123456")).toBe(false);
        expect(telefonoValido("64612345ab")).toBe(false);
    });

    it("arma la direccion legible", () => {
        expect(armarDireccion(DOMICILIO)).toBe("Calle Primera 123, Centro");
        expect(armarDireccion({ ...DOMICILIO, numeroInterior: " 4B " })).toBe("Calle Primera 123 Int 4B, Centro");
    });
});

describe("validarEntrega", () => {
    it("domicilio completo es valido", () => {
        expect(validarEntrega(DOMICILIO, 1, HOY)).toEqual({});
    });

    it("sin elegir nada: todo lo obligatorio", () => {
        const vacio: DatosEntrega = {
            tipoEntrega: null, calle: "", numeroExterior: "", numeroInterior: "", colonia: "",
            referencia: "", telefono: "", ubicacion: null, fechaEntrega: null, horaEntrega: null,
        };
        expect(validarEntrega(vacio, 1, HOY)).toEqual({
            tipoEntrega: MENSAJES_PEDIDO.OBLIGATORIO,
            telefono: MENSAJES_PEDIDO.OBLIGATORIO,
            fechaEntrega: MENSAJES_PEDIDO.OBLIGATORIO,
            horaEntrega: MENSAJES_PEDIDO.OBLIGATORIO,
        });
    });

    it("domicilio: exige calle, numero, colonia y ubicacion (el interior es opcional)", () => {
        const errores = validarEntrega({ ...DOMICILIO, calle: " ", numeroExterior: "", colonia: "", ubicacion: null }, 1, HOY);
        expect(errores).toEqual({
            calle: MENSAJES_PEDIDO.OBLIGATORIO,
            numeroExterior: MENSAJES_PEDIDO.OBLIGATORIO,
            colonia: MENSAJES_PEDIDO.OBLIGATORIO,
            ubicacion: MENSAJES_ENTREGA.UBICACION,
        });
    });

    it("domicilio fuera de zona", () => {
        expect(validarEntrega({ ...DOMICILIO, ubicacion: { latitud: 32.53, longitud: -117.04 } }, 1, HOY))
            .toEqual({ ubicacion: MENSAJES_ENTREGA.FUERA_DE_ZONA });
    });

    it("recoleccion no pide direccion pero si telefono", () => {
        const recoleccion: DatosEntrega = { ...DOMICILIO, tipoEntrega: "recoleccion", calle: "", colonia: "", ubicacion: null, telefono: "123" };
        expect(validarEntrega(recoleccion, 1, HOY)).toEqual({ telefono: MENSAJES_ENTREGA.TELEFONO });
    });

    it("fecha que no cumple la anticipacion de los niveles", () => {
        expect(validarEntrega(DOMICILIO, 2, HOY)).toEqual({
            fechaEntrega: "Los pedidos de 2 niveles requieren al menos 7 días de anticipación",
        });
    });
});

describe("semanasDelMes", () => {
    it("octubre 2026 empieza en jueves: tres celdas vacias antes del 1 (semana de lunes a domingo)", () => {
        const semanas = semanasDelMes(2026, 9);

        expect(semanas[0]).toEqual([null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
        expect(semanas).toHaveLength(5);
        expect(semanas[4]).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", null]);
    });

    it("todas las semanas tienen 7 celdas y estan todos los dias del mes", () => {
        const semanas = semanasDelMes(2028, 1); // febrero bisiesto

        expect(semanas.every((semana) => semana.length === 7)).toBe(true);
        expect(semanas.flat().filter(Boolean)).toHaveLength(29);
    });
});
