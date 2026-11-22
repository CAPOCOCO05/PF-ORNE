import { Request, Response } from 'express';
import { MENSAJES_PEDIDO } from '../constants/pedido';
import * as pedidosService from '../services/pedidos.service';
import { validarUuid } from '../validators/comunes.validator';
import { validarBorrador, validarRutaReferencia } from '../validators/pedido.validator';

// capa HTTP de los pedidos del cliente. El usuario siempre es el de la sesion

function usuarioId(req: Request): string {
    return req.usuario!.id;   // las rutas usan requiereRol
}

function idPedido(req: Request): string {
    return validarUuid(req.params.id, MENSAJES_PEDIDO.NO_ENCONTRADO);
}

// GET /pedidos
export async function listar(req: Request, res: Response): Promise<void> {
    res.json({ pedidos: await pedidosService.listarMisPedidos(req.db, usuarioId(req)) });
}

// GET /pedidos/:id
export async function obtener(req: Request, res: Response): Promise<void> {
    res.json({ pedido: await pedidosService.obtenerPedido(req.db, idPedido(req)) });
}

// GET /pedidos/:id/borrador
export async function obtenerBorrador(req: Request, res: Response): Promise<void> {
    res.json({ pedido: await pedidosService.obtenerBorrador(req.db, idPedido(req)) });
}

// POST /pedidos (crea el borrador)
export async function crearBorrador(req: Request, res: Response): Promise<void> {
    const datos = validarBorrador(req.body);
    res.status(201).json({ id: await pedidosService.guardarBorrador(req.db, usuarioId(req), null, datos) });
}

// PATCH /pedidos/:id (actualiza el borrador)
export async function actualizarBorrador(req: Request, res: Response): Promise<void> {
    const id = idPedido(req);
    const datos = validarBorrador(req.body);
    res.json({ id: await pedidosService.guardarBorrador(req.db, usuarioId(req), id, datos) });
}

// DELETE /pedidos/:id (solo borradores)
export async function eliminarBorrador(req: Request, res: Response): Promise<void> {
    await pedidosService.eliminarBorrador(req.db, usuarioId(req), idPedido(req));
    res.status(204).end();
}

// POST /pedidos/:id/imagen (cuerpo: bytes de la imagen; Content-Type: image/...)
export async function subirImagen(req: Request, res: Response): Promise<void> {
    const id = idPedido(req);
    const mime = (req.header('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const contenido = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    res.status(201).json({ ruta: await pedidosService.subirImagen(req.db, usuarioId(req), id, mime, contenido) });
}

// DELETE /pedidos/:id/imagen
export async function quitarImagen(req: Request, res: Response): Promise<void> {
    await pedidosService.quitarImagen(req.db, usuarioId(req), idPedido(req));
    res.status(204).end();
}

// POST /pedidos/:id/confirmar
export async function confirmar(req: Request, res: Response): Promise<void> {
    res.json(await pedidosService.confirmarPedido(req.db, idPedido(req)));
}

// GET /pedidos/referencias/url?ruta=...
export async function urlReferencia(req: Request, res: Response): Promise<void> {
    const ruta = validarRutaReferencia(req.query.ruta);
    res.json({ url: await pedidosService.urlReferencia(req.db, ruta) });
}
