import { ApiError } from '../errors/ApiError';

// validaciones que comparten todos los modulos de la API

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// un id con otro formato no puede existir: se responde 404 sin consultar la base
export function validarUuid(valor: unknown, mensajeNoEncontrado?: string): string {
    if (typeof valor !== 'string' || !PATRON_UUID.test(valor)) throw ApiError.noEncontrado(mensajeNoEncontrado);
    return valor.toLowerCase();
}

// numero de pagina (empieza en 0); sin valor es la primera
export function validarPagina(valor: unknown): number {
    if (valor === undefined || valor === '') return 0;
    const pagina = Number(valor);
    if (typeof valor !== 'string' || !Number.isInteger(pagina) || pagina < 0) {
        throw ApiError.solicitudInvalida('La página debe ser un número entero mayor o igual a 0');
    }
    return pagina;
}

// lista de un query string: "a,b" o ?x=a&x=b
export function listaDeQuery(valor: unknown): string[] {
    const partes = Array.isArray(valor) ? valor : [valor];
    return partes
        .filter((parte): parte is string => typeof parte === 'string')
        .flatMap((parte) => parte.split(','))
        .map((parte) => parte.trim())
        .filter(Boolean);
}

export function esObjeto(valor: unknown): valor is Record<string, unknown> {
    return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}
