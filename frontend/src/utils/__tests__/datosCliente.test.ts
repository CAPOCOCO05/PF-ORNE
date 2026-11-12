import { SUCURSAL } from "../../constants/sucursal";
import { DatosCliente } from "../../types/pedido.types";
import {
    completarEntrega, datosDesdeFormulario, DATOS_CLIENTE_VACIOS, entregaDesdeDatos, formularioDesdeDatos,
    hayCambios, textoDireccion, validarDatosCliente,
} from "../datosCliente";
import { ENTREGA_VACIA, MENSAJES_ENTREGA } from "../entrega";
import { MENSAJES_PEDIDO } from "../pedido";
import { MENSAJES_VALIDACION } from "../validaciones";

const DIRECCION = {
    calle: "Calle Primera", numeroExterior: "123", numeroInterior: "", colonia: "Zona Centro",
    referencia: "Portón negro", ubicacion: SUCURSAL.coordenadas,
};
const DATOS: DatosCliente = { telefono: "6461234567", direccion: DIRECCION };

describe("formularioDesdeDatos / datosDesdeFormulario", () => {
    it("ida y vuelta conserva los datos", () => {
        const formulario = formularioDesdeDatos("Ana López", DATOS);
        expect(formulario.conDireccion).toBe(true);
        expect(datosDesdeFormulario(formulario)).toEqual(DATOS);
    });

    it("sin direccion guardada el formulario empieza sin direccion", () => {
        const formulario = formularioDesdeDatos("Ana López", DATOS_CLIENTE_VACIOS);
        expect(formulario.conDireccion).toBe(false);
        expect(formulario.direccion).toEqual(ENTREGA_VACIA);
    });

    it("quita espacios y guiones del telefono y espacios de la direccion", () => {
        const formulario = formularioDesdeDatos("Ana López", DATOS);
        formulario.telefono = " 646-123 4567 ";
        formulario.direccion = { ...formulario.direccion, calle: "  Calle Primera " };
        expect(datosDesdeFormulario(formulario)).toEqual(DATOS);
    });

    it("con la direccion desactivada no se guarda direccion", () => {
        const formulario = { ...formularioDesdeDatos("Ana López", DATOS), conDireccion: false };
        expect(datosDesdeFormulario(formulario).direccion).toBeNull();
    });
});

describe("validarDatosCliente", () => {
    it("datos completos: sin errores", () => {
        expect(validarDatosCliente(formularioDesdeDatos("Ana López", DATOS))).toEqual({});
    });

    it("nombre con la validacion de M6", () => {
        expect(validarDatosCliente(formularioDesdeDatos("Ana", DATOS)).nombre).toBe(MENSAJES_VALIDACION.NOMBRE_INCOMPLETO);
    });

    it("telefono opcional, pero si se escribe debe tener 10 digitos", () => {
        expect(validarDatosCliente(formularioDesdeDatos("Ana López", { ...DATOS, telefono: "" })).telefono).toBeUndefined();
        expect(validarDatosCliente(formularioDesdeDatos("Ana López", { ...DATOS, telefono: "646" })).telefono).toBe(MENSAJES_ENTREGA.TELEFONO);
    });

    it("direccion activada: obligatorios y pin", () => {
        const formulario = { ...formularioDesdeDatos("Ana López", DATOS_CLIENTE_VACIOS), conDireccion: true };
        expect(validarDatosCliente(formulario)).toEqual({
            calle: MENSAJES_PEDIDO.OBLIGATORIO,
            numeroExterior: MENSAJES_PEDIDO.OBLIGATORIO,
            colonia: MENSAJES_PEDIDO.OBLIGATORIO,
            ubicacion: MENSAJES_ENTREGA.UBICACION,
        });
    });

    it("pin fuera de la zona de entrega", () => {
        const lejos = { ...DIRECCION, ubicacion: { latitud: 32.5, longitud: -117 } };
        expect(validarDatosCliente(formularioDesdeDatos("Ana López", { ...DATOS, direccion: lejos })).ubicacion)
            .toBe(MENSAJES_ENTREGA.FUERA_DE_ZONA);
    });
});

describe("hayCambios", () => {
    const original = formularioDesdeDatos("Ana López", DATOS);

    it("sin cambios (o solo espacios) es false", () => {
        expect(hayCambios(original, { ...original })).toBe(false);
        expect(hayCambios(original, { ...original, nombre: " Ana   López " })).toBe(false);
    });

    it("cambiar nombre, telefono o quitar la direccion es true", () => {
        expect(hayCambios(original, { ...original, nombre: "Ana María López" })).toBe(true);
        expect(hayCambios(original, { ...original, telefono: "6460000000" })).toBe(true);
        expect(hayCambios(original, { ...original, conDireccion: false })).toBe(true);
    });
});

describe("precarga del pedido (D5)", () => {
    it("entregaDesdeDatos: telefono y direccion, sin elegir el tipo de entrega", () => {
        const precarga = entregaDesdeDatos(DATOS);
        expect(precarga).toMatchObject({ telefono: "6461234567", calle: "Calle Primera", ubicacion: SUCURSAL.coordenadas });
        expect(precarga.tipoEntrega).toBeUndefined();
        expect(entregaDesdeDatos(DATOS_CLIENTE_VACIOS)).toEqual({});
    });

    it("completarEntrega solo llena los campos vacios", () => {
        const entrega = { ...ENTREGA_VACIA, telefono: "6460000000", tipoEntrega: "recoleccion" as const };
        const resultado = completarEntrega(entrega, entregaDesdeDatos(DATOS));
        expect(resultado.telefono).toBe("6460000000");
        expect(resultado.tipoEntrega).toBe("recoleccion");
        expect(resultado.calle).toBe("Calle Primera");
        expect(resultado.ubicacion).toEqual(SUCURSAL.coordenadas);
    });
});

describe("textoDireccion", () => {
    it("con y sin numero interior", () => {
        expect(textoDireccion(DIRECCION)).toBe("Calle Primera 123, Zona Centro");
        expect(textoDireccion({ ...DIRECCION, numeroInterior: "4" })).toBe("Calle Primera 123 Int 4, Zona Centro");
    });
});
