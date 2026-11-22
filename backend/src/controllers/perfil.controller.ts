import { Request, Response } from 'express';
import * as perfilService from '../services/perfil.service';
import { UsuarioSesion } from '../types/auth.types';
import { validarDatosCliente, validarNombre } from '../validators/perfil.validator';

// capa HTTP del perfil. Siempre trabaja con el usuario de la sesion (nunca un id del cliente)

// las rutas usan requiereRol, asi que aqui siempre hay usuario
function usuario(req: Request): UsuarioSesion {
    return req.usuario!;
}

// GET /perfil
export async function obtener(req: Request, res: Response): Promise<void> {
    res.json({ perfil: await perfilService.obtenerPerfil(req.db, usuario(req).id) });
}

// PATCH /perfil  { nombre }
export async function actualizarNombre(req: Request, res: Response): Promise<void> {
    const nombre = validarNombre(req.body);
    res.json({ perfil: await perfilService.actualizarNombre(req.db, usuario(req).id, nombre) });
}

// GET /perfil/datos-cliente
export async function obtenerDatosCliente(req: Request, res: Response): Promise<void> {
    res.json({ datos: await perfilService.obtenerDatosCliente(req.db, usuario(req).id) });
}

// PUT /perfil/datos-cliente  { telefono, direccion }
export async function guardarDatosCliente(req: Request, res: Response): Promise<void> {
    const datos = validarDatosCliente(req.body);
    res.json({ datos: await perfilService.guardarDatosCliente(req.db, usuario(req).id, datos) });
}
