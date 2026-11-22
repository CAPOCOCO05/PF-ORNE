import { NextFunction, Request, Response } from 'express';
import { ApiError, CODIGOS_PG, ErrorBaseDatos, MENSAJES_API } from '../errors/ApiError';

// respuesta de error de la API: { error: mensaje, codigo?: 'CODIGO', detalles?: { campo: mensaje } }
interface CuerpoError {
    error: string;
    codigo?: string;
    detalles?: Record<string, string>;
}

export function rutaNoEncontrada(_req: Request, _res: Response, next: NextFunction): void {
    next(ApiError.noEncontrado());
}

// errores del parser de JSON / cuerpo crudo de Express (body-parser)
function esErrorDeCuerpo(error: unknown): error is { status: number; type: string } {
    return typeof error === 'object' && error !== null && 'type' in error && 'status' in error;
}

function aApiError(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (error instanceof ErrorBaseDatos && error.codigo === CODIGOS_PG.SIN_PERMISO) return ApiError.prohibido();
    if (esErrorDeCuerpo(error) && error.status === 413) return new ApiError(413, 'El archivo es demasiado grande');
    if (esErrorDeCuerpo(error) && error.status === 400) return ApiError.solicitudInvalida();
    return new ApiError(500, MENSAJES_API.GENERICO);
}

// ultimo middleware: todo error termina aqui y se responde en un solo formato.
// Los errores inesperados se registran en la consola y el usuario ve un mensaje generico
export function manejarErrores(error: unknown, req: Request, res: Response, _next: NextFunction): void {
    const apiError = aApiError(error);
    if (apiError.status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, error);
    const cuerpo: CuerpoError = { error: apiError.message };
    if (apiError.codigo) cuerpo.codigo = apiError.codigo;
    if (apiError.detalles) cuerpo.detalles = apiError.detalles;
    res.status(apiError.status).json(cuerpo);
}
