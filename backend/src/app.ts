import cors from 'cors';
import express from 'express';
import { cargarSesion } from './middlewares/auth.middleware';
import { manejarErrores, rutaNoEncontrada } from './middlewares/errores.middleware';
import { rutas } from './routes';

// aplicacion Express sin arrancar el servidor (las pruebas la usan con supertest)
export function crearApp() {
    const app = express();
    app.disable('x-powered-by');
    app.use(cors());
    app.use(express.json({ limit: '100kb' }));
    app.use(cargarSesion);
    app.use(rutas);
    app.use(rutaNoEncontrada);
    app.use(manejarErrores);
    return app;
}
