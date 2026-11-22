import { Request, Response } from 'express';
import { MENSAJES_REPARTIDOR } from '../constants/repartidor';
import * as repartidorService from '../services/repartidor.service';
import { validarUuid } from '../validators/comunes.validator';
import { validarMotivo } from '../validators/repartidor.validator';

// capa HTTP del repartidor (F06, F07 M2)

function idEntrega(req: Request): string {
    return validarUuid(req.params.id, MENSAJES_REPARTIDOR.NO_ENCONTRADA);
}

// GET /repartidor/entregas
export async function listar(req: Request, res: Response): Promise<void> {
    res.json({ entregas: await repartidorService.listarEntregas(req.db) });
}

// GET /repartidor/entregas/:id
export async function obtener(req: Request, res: Response): Promise<void> {
    res.json({ entrega: await repartidorService.obtenerEntrega(req.db, idEntrega(req)) });
}

// POST /repartidor/entregas/:id/entregado
export async function marcarEntregado(req: Request, res: Response): Promise<void> {
    await repartidorService.marcarEntregado(req.db, idEntrega(req));
    res.json({ resultado: 'ok' });
}

// POST /repartidor/entregas/:id/no-entregado  { motivo }
export async function marcarNoEntregado(req: Request, res: Response): Promise<void> {
    const id = idEntrega(req);
    await repartidorService.marcarNoEntregado(req.db, id, validarMotivo(req.body));
    res.json({ resultado: 'ok' });
}
