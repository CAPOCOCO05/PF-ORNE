import { Router } from 'express';
import * as repartidor from '../controllers/repartidor.controller';
import { requiereRol } from '../middlewares/auth.middleware';

// entregas del repartidor (F06, F07 M2)
export const repartidorRouter = Router();
repartidorRouter.use(requiereRol('repartidor'));

repartidorRouter.get('/entregas', repartidor.listar);
repartidorRouter.get('/entregas/:id', repartidor.obtener);
repartidorRouter.post('/entregas/:id/entregado', repartidor.marcarEntregado);
repartidorRouter.post('/entregas/:id/no-entregado', repartidor.marcarNoEntregado);
