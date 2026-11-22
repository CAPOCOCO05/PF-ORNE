import { NextFunction, Request, Response } from 'express';
import { crearClienteSupabase } from '../config/supabase';
import { ApiError, MENSAJES_API } from '../errors/ApiError';
import { obtenerUsuarioSesion } from '../repositories/auth.repository';
import { Rol } from '../types/auth.types';

// token de "Authorization: Bearer <token>"; undefined si no viene
export function tokenDeCabecera(cabecera: string | undefined): string | undefined {
    const coincidencia = cabecera?.match(/^Bearer\s+(.+)$/i);
    return coincidencia?.[1]?.trim() || undefined;
}

// Lee la sesion si viene un token. Sin token la peticion sigue como visitante
// (p. ej. el catalogo se puede ver sin cuenta, F09). Con un token invalido responde 401.
export async function cargarSesion(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const token = tokenDeCabecera(req.header('authorization'));
    req.db = crearClienteSupabase(token);
    if (!token) return next();

    const usuario = await obtenerUsuarioSesion(req.db, token);
    if (!usuario) throw ApiError.noAutenticado(MENSAJES_API.SESION_EXPIRADA);
    req.usuario = usuario;
    next();
}

// exige sesion y, si se indican, uno de los roles permitidos
export function requiereRol(...roles: Rol[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.usuario) throw ApiError.noAutenticado();
        if (roles.length && (!req.usuario.rol || !roles.includes(req.usuario.rol))) throw ApiError.prohibido();
        next();
    };
}
