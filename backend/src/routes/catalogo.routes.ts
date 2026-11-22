import express, { Router } from 'express';
import { MAX_BYTES_IMAGEN } from '../constants/catalogo';
import * as catalogo from '../controllers/catalogo.controller';
import { requiereRol } from '../middlewares/auth.middleware';

// catalogo publico: se puede ver con o sin cuenta (F01, F09)
export const catalogoRouter = Router();
catalogoRouter.get('/', catalogo.listar);
catalogoRouter.get('/:id', catalogo.obtener);

// catalogo del admin (F07 M4): todos los pasteles, alta, edicion e imagenes
export const adminCatalogoRouter = Router();
adminCatalogoRouter.use(requiereRol('admin'));
adminCatalogoRouter.get('/', catalogo.listarAdmin);
adminCatalogoRouter.post('/imagenes', express.raw({ type: 'image/*', limit: MAX_BYTES_IMAGEN }), catalogo.subirImagen);
adminCatalogoRouter.get('/:id', catalogo.obtenerAdmin);
adminCatalogoRouter.post('/', catalogo.crear);
adminCatalogoRouter.put('/:id', catalogo.actualizar);
