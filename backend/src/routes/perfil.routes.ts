import { Router } from 'express';
import * as perfil from '../controllers/perfil.controller';
import { requiereRol } from '../middlewares/auth.middleware';

// perfil del usuario con sesion (F00, F07 M6 y M7)
export const perfilRouter = Router();

// nombre y rol: cualquier usuario con sesion (los tres roles)
perfilRouter.get('/', requiereRol(), perfil.obtener);
perfilRouter.patch('/', requiereRol(), perfil.actualizarNombre);

// telefono y direccion guardada: solo el cliente
perfilRouter.get('/datos-cliente', requiereRol('cliente'), perfil.obtenerDatosCliente);
perfilRouter.put('/datos-cliente', requiereRol('cliente'), perfil.guardarDatosCliente);
