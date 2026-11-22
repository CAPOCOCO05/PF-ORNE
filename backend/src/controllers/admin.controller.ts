import { Request, Response } from 'express';
import { MENSAJES_PEDIDO } from '../constants/pedido';
import * as adminService from '../services/admin.service';
import { validarCambioEstado, validarFiltroAdmin } from '../validators/admin.validator';
import { validarPagina, validarUuid } from '../validators/comunes.validator';

// capa HTTP del panel admin (F04)

// GET /admin/pedidos?pestania&estados&pagina
export async function listarPedidos(req: Request, res: Response): Promise<void> {
    const filtro = validarFiltroAdmin(req.query);
    const pagina = validarPagina(req.query.pagina);
    res.json(await adminService.listarPedidos(req.db, filtro, pagina));
}

// GET /admin/pedidos/conteos
export async function contarPorEstado(req: Request, res: Response): Promise<void> {
    res.json({ conteos: await adminService.contarPorEstado(req.db) });
}

// GET /admin/pedidos/:id
export async function obtenerPedido(req: Request, res: Response): Promise<void> {
    const id = validarUuid(req.params.id, MENSAJES_PEDIDO.NO_ENCONTRADO);
    res.json({ pedido: await adminService.obtenerPedido(req.db, id) });
}

// PATCH /admin/pedidos/:id/estado
export async function cambiarEstado(req: Request, res: Response): Promise<void> {
    const id = validarUuid(req.params.id, MENSAJES_PEDIDO.NO_ENCONTRADO);
    await adminService.cambiarEstado(req.db, id, validarCambioEstado(req.body));
    res.json({ resultado: 'ok' });
}

// GET /admin/repartidores
export async function listarRepartidores(req: Request, res: Response): Promise<void> {
    res.json({ repartidores: await adminService.listarRepartidores(req.db) });
}
