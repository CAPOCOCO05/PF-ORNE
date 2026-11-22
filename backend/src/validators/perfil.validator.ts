import { MAX_CAMPO_DIRECCION, MAX_NUMERO, MAX_REFERENCIA, MENSAJES_ENTREGA } from '../constants/entrega';
import { MAX_NOMBRE, MENSAJES_PERFIL, REGEX_LETRA, REGEX_NOMBRE } from '../constants/perfil';
import { ApiError } from '../errors/ApiError';
import { DatosCliente, DireccionGuardada } from '../types/perfil.types';
import { dentroDeZona, esCoordenada, normalizarTelefono, numeroExteriorValido, telefonoValido } from '../utils/entrega';
import { esObjeto } from './comunes.validator';

// valida lo que llega del cliente en /perfil (limite del sistema)

type Errores = Record<string, string>;

function texto(valor: unknown): string {
    return typeof valor === 'string' ? valor.trim() : '';
}

// trim y espacios repetidos colapsados: asi se guarda en perfiles.nombre (F07 M6)
export function normalizarNombre(nombre: string): string {
    return nombre.trim().replace(/\s+/g, ' ');
}

// nombre y al menos un apellido: dos o mas palabras de 2+ letras (F07 M6, D4)
export function errorNombreCompleto(nombre: string): string | undefined {
    const limpio = normalizarNombre(nombre);
    if (!limpio) return MENSAJES_PERFIL.NOMBRE_VACIO;
    if (!REGEX_NOMBRE.test(limpio)) return MENSAJES_PERFIL.NOMBRE_CARACTERES;
    if (limpio.length > MAX_NOMBRE) return MENSAJES_PERFIL.NOMBRE_LARGO;
    const palabras = limpio.split(' ').filter((p) => (p.match(REGEX_LETRA) ?? []).length >= 2);
    return palabras.length < 2 ? MENSAJES_PERFIL.NOMBRE_INCOMPLETO : undefined;
}

// cuerpo de PATCH /perfil: { nombre }
export function validarNombre(cuerpo: unknown): string {
    const nombre = esObjeto(cuerpo) && typeof cuerpo.nombre === 'string' ? cuerpo.nombre : '';
    const error = errorNombreCompleto(nombre);
    if (error) throw ApiError.solicitudInvalida(error, { nombre: error });
    return normalizarNombre(nombre);
}

function erroresDeTextos(direccion: Record<string, unknown>, errores: Errores): void {
    const { calle, numeroExterior, numeroInterior, colonia, referencia } = direccion;
    if (!texto(calle)) errores.calle = MENSAJES_ENTREGA.OBLIGATORIO;
    else if (texto(calle).length > MAX_CAMPO_DIRECCION) errores.calle = MENSAJES_ENTREGA.TEXTO_LARGO;
    if (!texto(numeroExterior)) errores.numeroExterior = MENSAJES_ENTREGA.OBLIGATORIO;
    else if (!numeroExteriorValido(texto(numeroExterior)) || texto(numeroExterior).length > MAX_NUMERO) errores.numeroExterior = MENSAJES_ENTREGA.NUMERO_EXTERIOR;
    if (texto(numeroInterior).length > MAX_NUMERO) errores.numeroInterior = MENSAJES_ENTREGA.TEXTO_LARGO;
    if (!texto(colonia)) errores.colonia = MENSAJES_ENTREGA.OBLIGATORIO;
    else if (texto(colonia).length > MAX_CAMPO_DIRECCION) errores.colonia = MENSAJES_ENTREGA.TEXTO_LARGO;
    if (texto(referencia).length > MAX_REFERENCIA) errores.referencia = MENSAJES_ENTREGA.TEXTO_LARGO;
}

// la direccion se guarda completa, con pin y dentro de la zona de entrega (F02, F07 M7)
function erroresDeDireccion(direccion: Record<string, unknown>): Errores {
    const errores: Errores = {};
    erroresDeTextos(direccion, errores);
    if (!esCoordenada(direccion.ubicacion)) errores.ubicacion = MENSAJES_ENTREGA.UBICACION;
    else if (!dentroDeZona(direccion.ubicacion)) errores.ubicacion = MENSAJES_ENTREGA.FUERA_DE_ZONA;
    return errores;
}

function direccionLimpia(direccion: Record<string, unknown>): DireccionGuardada {
    const ubicacion = direccion.ubicacion as DireccionGuardada['ubicacion'];
    return {
        calle: texto(direccion.calle),
        numeroExterior: texto(direccion.numeroExterior),
        numeroInterior: texto(direccion.numeroInterior),
        colonia: texto(direccion.colonia),
        referencia: texto(direccion.referencia),
        ubicacion: { latitud: ubicacion.latitud, longitud: ubicacion.longitud },
    };
}

// cuerpo de PUT /perfil/datos-cliente: { telefono, direccion | null }. El telefono es opcional
export function validarDatosCliente(cuerpo: unknown): DatosCliente {
    if (!esObjeto(cuerpo) || (cuerpo.direccion !== null && !esObjeto(cuerpo.direccion))) throw ApiError.solicitudInvalida();
    const telefono = normalizarTelefono(texto(cuerpo.telefono));
    const errores: Errores = cuerpo.direccion ? erroresDeDireccion(cuerpo.direccion) : {};
    if (telefono && !telefonoValido(telefono)) errores.telefono = MENSAJES_ENTREGA.TELEFONO;
    if (Object.keys(errores).length) throw ApiError.solicitudInvalida(undefined, errores);
    return { telefono, direccion: cuerpo.direccion ? direccionLimpia(cuerpo.direccion) : null };
}
