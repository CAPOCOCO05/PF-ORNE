import {
    MAX_DESCRIPCION_PASTEL, MAX_NOMBRE_PASTEL, MAX_URL_IMAGEN, MENSAJES_CATALOGO, NIVELES, NIVELES_MAX, ORDENES,
    RANGOS_PRECIO, RELLENOS, SABORES_PAN, TAMANIOS,
} from '../constants/catalogo';
import { ApiError } from '../errors/ApiError';
import { DatosPastel, FiltrosCatalogo, Niveles, OrdenCatalogo, RangoPrecioId, RellenoId, SaborPanId, Tamanio } from '../types/catalogo.types';
import { esObjeto, listaDeQuery } from './comunes.validator';

// valida lo que llega del cliente antes de pasarlo a la capa de negocio (limite del sistema)

function deLista<T>(valores: string[], permitidos: readonly T[], convertir: (v: string) => T = (v) => v as T): T[] {
    const convertidos = valores.map(convertir);
    if (convertidos.some((v) => !permitidos.includes(v))) throw ApiError.solicitudInvalida(MENSAJES_CATALOGO.FILTROS);
    return convertidos;
}

function precioDeQuery(valor: unknown): RangoPrecioId | null {
    if (valor === undefined || valor === '') return null;
    if (typeof valor !== 'string' || !(valor in RANGOS_PRECIO)) throw ApiError.solicitudInvalida(MENSAJES_CATALOGO.FILTROS);
    return valor as RangoPrecioId;
}

function ordenDeQuery(valor: unknown): OrdenCatalogo {
    if (valor === undefined || valor === '') return 'nombre';
    return deLista([String(valor)], ORDENES)[0];
}

// GET /catalogo?precio=hasta500&panes=vainilla,fresa&rellenos=...&tamanios=10,15&niveles=1,2&orden=precioAsc
export function validarFiltros(query: Record<string, unknown>): FiltrosCatalogo {
    return {
        precio: precioDeQuery(query.precio),
        panes: deLista<SaborPanId>(listaDeQuery(query.panes), SABORES_PAN),
        rellenos: deLista<RellenoId>(listaDeQuery(query.rellenos), RELLENOS),
        tamanios: deLista<Tamanio>(listaDeQuery(query.tamanios), TAMANIOS),
        niveles: deLista<Niveles>(listaDeQuery(query.niveles), NIVELES, (v) => Number(v) as Niveles),
        orden: ordenDeQuery(query.orden),
    };
}

type CampoPastel = 'nombre' | 'descripcion' | 'tamanio' | 'niveles' | 'tipoPan' | 'relleno' | 'activo' | 'imagenUrl';
type ErroresPastel = Partial<Record<CampoPastel, string>>;

function textoLimpio(valor: unknown): string {
    return typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
}

function validarNombre(valor: unknown): string | undefined {
    const nombre = textoLimpio(valor);
    if (!nombre) return MENSAJES_CATALOGO.NOMBRE_VACIO;
    if (nombre.length > MAX_NOMBRE_PASTEL) return MENSAJES_CATALOGO.NOMBRE_LARGO;
    return undefined;
}

function validarOpcion<T>(valor: unknown, permitidos: readonly T[]): string | undefined {
    if (valor === null || valor === undefined) return MENSAJES_CATALOGO.OBLIGATORIO;
    return permitidos.includes(valor as T) ? undefined : MENSAJES_CATALOGO.OPCION_INVALIDA;
}

function validarImagenUrl(valor: unknown): string | undefined {
    if (valor === null || valor === undefined) return undefined;
    const valida = typeof valor === 'string' && /^https?:\/\//i.test(valor) && valor.length <= MAX_URL_IMAGEN;
    return valida ? undefined : MENSAJES_CATALOGO.IMAGEN_URL;
}

function erroresDePastel(cuerpo: Record<string, unknown>): ErroresPastel {
    const errores: ErroresPastel = {
        nombre: validarNombre(cuerpo.nombre),
        tamanio: validarOpcion(cuerpo.tamanio, TAMANIOS),
        niveles: validarOpcion(cuerpo.niveles, NIVELES),
        tipoPan: validarOpcion(cuerpo.tipoPan, SABORES_PAN),
        relleno: validarOpcion(cuerpo.relleno, RELLENOS),
        imagenUrl: validarImagenUrl(cuerpo.imagenUrl),
    };
    if (cuerpo.descripcion !== undefined && cuerpo.descripcion !== null && typeof cuerpo.descripcion !== 'string') errores.descripcion = MENSAJES_CATALOGO.OPCION_INVALIDA;
    else if (textoLimpio(cuerpo.descripcion).length > MAX_DESCRIPCION_PASTEL) errores.descripcion = MENSAJES_CATALOGO.DESCRIPCION_LARGA;
    if (typeof cuerpo.activo !== 'boolean') errores.activo = MENSAJES_CATALOGO.OBLIGATORIO;
    if (!errores.tamanio && !errores.niveles && (cuerpo.niveles as Niveles) > NIVELES_MAX[cuerpo.tamanio as Tamanio]) {
        errores.niveles = MENSAJES_CATALOGO.NIVELES_EXCEDIDOS;
    }
    return errores;
}

function sinVacios(errores: ErroresPastel): Record<string, string> {
    return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje)) as Record<string, string>;
}

// cuerpo de POST/PUT /admin/catalogo; responde 400 con el error de cada campo
export function validarDatosPastel(cuerpo: unknown): DatosPastel {
    if (!esObjeto(cuerpo)) throw ApiError.solicitudInvalida();
    const errores = sinVacios(erroresDePastel(cuerpo));
    if (Object.keys(errores).length) throw ApiError.solicitudInvalida(undefined, errores);
    return {
        nombre: textoLimpio(cuerpo.nombre),
        descripcion: textoLimpio(cuerpo.descripcion) || null,
        tamanio: cuerpo.tamanio as Tamanio,
        niveles: cuerpo.niveles as Niveles,
        tipoPan: cuerpo.tipoPan as SaborPanId,
        relleno: cuerpo.relleno as RellenoId,
        activo: cuerpo.activo as boolean,
        imagenUrl: (cuerpo.imagenUrl as string | null | undefined) ?? null,
    };
}
