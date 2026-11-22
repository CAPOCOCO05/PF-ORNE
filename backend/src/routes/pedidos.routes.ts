import express, { Router } from 'express';
import { MAX_BYTES_IMAGEN } from '../constants/catalogo';
import * as pedidos from '../controllers/pedidos.controller';
import { requiereRol } from '../middlewares/auth.middleware';

// pedidos del cliente (F01–F03)
export const pedidosRouter = Router();

// la imagen de referencia la ven el dueño y el admin (resumen y detalle del pedido)
pedidosRouter.get('/referencias/url', requiereRol('cliente', 'admin'), pedidos.urlReferencia);

pedidosRouter.use(requiereRol('cliente'));
pedidosRouter.get('/', pedidos.listar);
pedidosRouter.post('/', pedidos.crearBorrador);
pedidosRouter.get('/:id', pedidos.obtener);
pedidosRouter.patch('/:id', pedidos.actualizarBorrador);
pedidosRouter.delete('/:id', pedidos.eliminarBorrador);
pedidosRouter.get('/:id/borrador', pedidos.obtenerBorrador);
pedidosRouter.post('/:id/imagen', express.raw({ type: 'image/*', limit: MAX_BYTES_IMAGEN }), pedidos.subirImagen);
pedidosRouter.delete('/:id/imagen', pedidos.quitarImagen);
pedidosRouter.post('/:id/confirmar', pedidos.confirmar);
