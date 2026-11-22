import { Router } from 'express';
import * as admin from '../controllers/admin.controller';
import { requiereRol } from '../middlewares/auth.middleware';

// panel admin: pedidos y repartidores (F04, F07 M2 y M3). El catalogo del admin esta en catalogo.routes
export const adminRouter = Router();
adminRouter.use(requiereRol('admin'));

adminRouter.get('/pedidos', admin.listarPedidos);
adminRouter.get('/pedidos/conteos', admin.contarPorEstado);
adminRouter.get('/pedidos/:id', admin.obtenerPedido);
adminRouter.patch('/pedidos/:id/estado', admin.cambiarEstado);
adminRouter.get('/repartidores', admin.listarRepartidores);
