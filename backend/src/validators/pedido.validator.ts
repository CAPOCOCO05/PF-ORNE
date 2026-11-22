import { MENSAJES_CATALOGO, NIVELES, NIVELES_MAX, RELLENOS, SABORES_PAN, TAMANIOS } from '../constants/catalogo';
import { MAX_CAMPO_DIRECCION, MAX_NUMERO, MAX_REFERENCIA, MENSAJES_ENTREGA } from '../constants/entrega';
import { HORAS_BLOQUE, MAX_MENSAJE, MENSAJES_PEDIDO, PASOS, TIPOS_ENTREGA } from '../constants/pedido';
import { ApiError } from '../errors/ApiError';
import { Niveles, RellenoId, SaborPanId, Tamanio } from '../types/catalogo.types';
import { DatosBorrador, DatosEntrega, HoraBloque, PasoPedido, TipoEntrega } from '../types/pedido.types';
import { esCoordenada, normalizarTelefono, numeroExteriorValido, telefonoValido } from '../utils/entrega';
import { contarCaracteres, esRutaReferencia } from '../utils/pedido';
import { esObjeto } from './comunes.validator';

// valida el borrador que manda la app (limite del sistema). Un borrador puede estar incompleto:
// aqui se revisan tipos, opciones y largos; lo obligatorio lo exige confirmar_pedido (008)

type Errores = Record<string, string>;

function texto(valor: unknown): string {
    return typeof valor === 'string' ? valor.trim() : '';
}

// null o una de las opciones permitidas
function opcion<T>(valor: unknown, permitidos: readonly T[], campo: string, errores: Errores): T | null {
    if (valor === null || valor === undefined) return null;
    if (!permitidos.includes(valor as T)) errores[campo] = MENSAJES_CATALOGO.OPCION_INVALIDA;
    return valor as T;
}

function textoMaximo(valor: unknown, maximo: number, campo: string, errores: Errores): string {
    if (valor !== undefined && valor !== null && typeof valor !== 'string') errores[campo] = MENSAJES_CATALOGO.OPCION_INVALIDA;
    const limpio = texto(valor);
    if (limpio.length > maximo) errores[campo] = MENSAJES_ENTREGA.TEXTO_LARGO;
    return limpio;
}

function fecha(valor: unknown, errores: Errores): string | null {
    if (valor === null || valor === undefined) return null;
    const valida = typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(`${valor}T00:00:00Z`));
    if (!valida) errores.fechaEntrega = MENSAJES_PEDIDO.FECHA;
    return valida ? valor : null;
}

function validarDireccion(entrega: Record<string, unknown>, errores: Errores) {
    const numeroExterior = textoMaximo(entrega.numeroExterior, MAX_NUMERO, 'numeroExterior', errores);
    if (numeroExterior && !numeroExteriorValido(numeroExterior)) errores.numeroExterior = MENSAJES_ENTREGA.NUMERO_EXTERIOR;
    const ubicacion = entrega.ubicacion ?? null;
    if (ubicacion !== null && !esCoordenada(ubicacion)) errores.ubicacion = MENSAJES_ENTREGA.UBICACION;
    return {
        calle: textoMaximo(entrega.calle, MAX_CAMPO_DIRECCION, 'calle', errores),
        numeroExterior,
        numeroInterior: textoMaximo(entrega.numeroInterior, MAX_NUMERO, 'numeroInterior', errores),
        colonia: textoMaximo(entrega.colonia, MAX_CAMPO_DIRECCION, 'colonia', errores),
        referencia: textoMaximo(entrega.referencia, MAX_REFERENCIA, 'referencia', errores),
        ubicacion: esCoordenada(ubicacion) ? { latitud: ubicacion.latitud, longitud: ubicacion.longitud } : null,
    };
}

function validarEntrega(entrega: unknown, errores: Errores): DatosEntrega | null {
    if (entrega === null || entrega === undefined) return null;
    if (!esObjeto(entrega)) throw ApiError.solicitudInvalida();
    const telefono = normalizarTelefono(texto(entrega.telefono));
    if (telefono && !telefonoValido(telefono)) errores.telefono = MENSAJES_ENTREGA.TELEFONO;
    return {
        tipoEntrega: opcion<TipoEntrega>(entrega.tipoEntrega, TIPOS_ENTREGA, 'tipoEntrega', errores),
        ...validarDireccion(entrega, errores),
        telefono,
        fechaEntrega: fecha(entrega.fechaEntrega, errores),
        horaEntrega: opcion<HoraBloque>(entrega.horaEntrega, HORAS_BLOQUE, 'horaEntrega', errores),
    };
}

function validarMensaje(valor: unknown, errores: Errores): string | null {
    const mensaje = texto(valor);
    if (contarCaracteres(mensaje) > MAX_MENSAJE) errores.mensaje = MENSAJES_PEDIDO.MENSAJE_LARGO;
    return mensaje || null;
}

// cuerpo de POST /pedidos y PATCH /pedidos/:id
export function validarBorrador(cuerpo: unknown): DatosBorrador {
    if (!esObjeto(cuerpo) || !PASOS.includes(cuerpo.pasoActual as PasoPedido)) throw ApiError.solicitudInvalida();
    const errores: Errores = {};
    const datos: DatosBorrador = {
        pasoActual: cuerpo.pasoActual as PasoPedido,
        tamanio: opcion<Tamanio>(cuerpo.tamanio, TAMANIOS, 'tamanio', errores),
        niveles: opcion<Niveles>(cuerpo.niveles, NIVELES, 'niveles', errores),
        tipoPan: opcion<SaborPanId>(cuerpo.tipoPan, SABORES_PAN, 'tipoPan', errores),
        relleno: opcion<RellenoId>(cuerpo.relleno, RELLENOS, 'relleno', errores),
        mensaje: validarMensaje(cuerpo.mensaje, errores),
        entrega: validarEntrega(cuerpo.entrega, errores),
    };
    if (!errores.tamanio && !errores.niveles && datos.tamanio && datos.niveles && datos.niveles > NIVELES_MAX[datos.tamanio]) {
        errores.niveles = MENSAJES_CATALOGO.NIVELES_EXCEDIDOS;
    }
    if (Object.keys(errores).length) throw ApiError.solicitudInvalida(undefined, errores);
    return datos;
}

// ?ruta=<uuid>/<uuid>/referencia.<ext>
export function validarRutaReferencia(valor: unknown): string {
    if (typeof valor !== 'string' || !esRutaReferencia(valor)) throw ApiError.noEncontrado(MENSAJES_PEDIDO.IMAGEN_NO_DISPONIBLE);
    return valor;
}
