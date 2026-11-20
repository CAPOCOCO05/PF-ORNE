import { DatosCliente, DatosEntrega, DireccionGuardada } from "../types/pedido.types";
import { dentroDeZona, ENTREGA_VACIA, MENSAJES_ENTREGA, normalizarTelefono, telefonoValido, validarNumeroExterior } from "./entrega";
import { MENSAJES_PEDIDO } from "./pedido";
import { normalizarNombre, validarNombreCompleto } from "./validaciones";

// reglas del perfil del cliente (F07 M7) sin dependencias de pantalla

export const DATOS_CLIENTE_VACIOS: DatosCliente = {telefono: '', direccion: null};

// formulario de "Editar datos". La direccion usa la forma de DatosEntrega para
// reutilizar FormularioDomicilio de F02 tal cual
export interface FormularioDatosCliente {
    nombre: string;
    telefono: string;
    conDireccion: boolean;      // false: sin direccion guardada (o se quito)
    direccion: DatosEntrega;
}

export type CampoDatosCliente = 'nombre' | 'telefono' | 'calle' | 'numeroExterior' | 'colonia' | 'ubicacion';

export function formularioDesdeDatos(nombre: string, {telefono, direccion}: DatosCliente): FormularioDatosCliente {
    return {
        nombre,
        telefono,
        conDireccion: direccion !== null,
        direccion: {...ENTREGA_VACIA, ...(direccion ?? {})},
    };
}

// lo que se guarda: textos sin espacios sobrantes; sin direccion si no esta activada
export function datosDesdeFormulario({telefono, conDireccion, direccion}: FormularioDatosCliente): DatosCliente {
    if (!conDireccion || !direccion.ubicacion) return {telefono: normalizarTelefono(telefono.trim()), direccion: null};
    return {
        telefono: normalizarTelefono(telefono.trim()),
        direccion: {
            calle: direccion.calle.trim(),
            numeroExterior: direccion.numeroExterior.trim(),
            numeroInterior: direccion.numeroInterior.trim(),
            colonia: direccion.colonia.trim(),
            referencia: direccion.referencia.trim(),
            ubicacion: direccion.ubicacion,
        },
    };
}

// nombre (M6), telefono opcional pero de 10 digitos, y direccion completa dentro de la zona (F02)
export function validarDatosCliente(formulario: FormularioDatosCliente): Partial<Record<CampoDatosCliente, string>> {
    const errores: Partial<Record<CampoDatosCliente, string>> = {};
    const errorNombre = validarNombreCompleto(formulario.nombre);
    if (errorNombre) errores.nombre = errorNombre;
    if (formulario.telefono.trim() && !telefonoValido(formulario.telefono)) errores.telefono = MENSAJES_ENTREGA.TELEFONO;
    if (!formulario.conDireccion) return errores;

    const {calle, numeroExterior, colonia, ubicacion} = formulario.direccion;
    if (!calle.trim()) errores.calle = MENSAJES_PEDIDO.OBLIGATORIO;
    const errorNumero = validarNumeroExterior(numeroExterior);
    if (errorNumero) errores.numeroExterior = errorNumero;
    if (!colonia.trim()) errores.colonia = MENSAJES_PEDIDO.OBLIGATORIO;
    if (!ubicacion) errores.ubicacion = MENSAJES_ENTREGA.UBICACION;
    else if (!dentroDeZona(ubicacion)) errores.ubicacion = MENSAJES_ENTREGA.FUERA_DE_ZONA;
    return errores;
}

// hay algo distinto a lo guardado (para preguntar antes de salir sin guardar)
export function hayCambios(original: FormularioDatosCliente, actual: FormularioDatosCliente): boolean {
    return normalizarNombre(original.nombre) !== normalizarNombre(actual.nombre)
        || JSON.stringify(datosDesdeFormulario(original)) !== JSON.stringify(datosDesdeFormulario(actual));
}

// precarga del paso de entrega en un pedido nuevo (D5): telefono y, si hay, la direccion.
// El tipo de entrega no se elige: la direccion solo se usa si el cliente elige Domicilio
export function entregaDesdeDatos({telefono, direccion}: DatosCliente): Partial<DatosEntrega> {
    return {
        ...(telefono ? {telefono} : {}),
        ...(direccion ?? {}),
    };
}

// aplica la precarga solo sobre los campos vacios: no pisa lo que el cliente ya escribio
export function completarEntrega(entrega: DatosEntrega, precarga: Partial<DatosEntrega>): DatosEntrega {
    const vacios = Object.entries(precarga).filter(([campo]) => {
        const actual = entrega[campo as keyof DatosEntrega];
        return actual === null || actual === '';
    });
    return {...entrega, ...Object.fromEntries(vacios)};
}

// "Calle 123 Int 4, Colonia" para mostrar en el perfil
export function textoDireccion({calle, numeroExterior, numeroInterior, colonia}: DireccionGuardada): string {
    const interior = numeroInterior ? ` Int ${numeroInterior}` : '';
    return `${calle} ${numeroExterior}${interior}, ${colonia}`;
}
