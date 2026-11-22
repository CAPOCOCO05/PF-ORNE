import { Router } from 'express';
import { adminCatalogoRouter, catalogoRouter } from './catalogo.routes';
import { pedidosRouter } from './pedidos.routes';
import { perfilRouter } from './perfil.routes';

// todas las rutas de la API
export const rutas = Router();

rutas.get('/salud', (_req, res) => {
    res.json({ estado: 'ok' });
});

rutas.use('/catalogo', catalogoRouter);
rutas.use('/admin/catalogo', adminCatalogoRouter);
rutas.use('/perfil', perfilRouter);
rutas.use('/pedidos', pedidosRouter);
