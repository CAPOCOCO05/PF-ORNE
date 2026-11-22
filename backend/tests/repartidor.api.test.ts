import request from 'supertest';
import { crearApp } from '../src/app';
import { MENSAJES_REPARTIDOR } from '../src/constants/repartidor';
import { obtenerUsuarioSesion } from '../src/repositories/auth.repository';
import * as repartidorRepo from '../src/repositories/repartidor.repository';

// API del repartidor (rutas → controlador → servicio) con la capa de datos simulada

jest.mock('../src/repositories/auth.repository');
jest.mock('../src/repositories/repartidor.repository');

const repo = jest.mocked(repartidorRepo);
const usuarioSesion = jest.mocked(obtenerUsuarioSesion);
const app = crearApp();

const PEDIDO = '22222222-2222-4222-8222-222222222222';

function como(rol: 'cliente' | 'admin' | 'repartidor', peticion: request.Test) {
    return peticion.set('Authorization', `Bearer token-${rol}`);
}

beforeEach(() => {
    jest.resetAllMocks();
    usuarioSesion.mockImplementation(async (_db, token) => {
        const rol = token.replace('token-', '') as 'repartidor';
        return ['cliente', 'admin', 'repartidor'].includes(rol) ? { id: rol, rol } : null;
    });
});

describe('permisos', () => {
    it('solo el repartidor', async () => {
        expect((await request(app).get('/repartidor/entregas')).status).toBe(401);
        expect((await como('cliente', request(app).get('/repartidor/entregas'))).status).toBe(403);
        expect((await como('admin', request(app).post(`/repartidor/entregas/${PEDIDO}/entregado`))).status).toBe(403);
    });
});

describe('GET /repartidor/entregas', () => {
    it('lista las entregas en camino', async () => {
        const entrega = { id: PEDIDO, folio: 'ORN-1', cliente: 'Ana', fechaEntrega: '2026-10-26', horaEntrega: '12:00' as const, direccion: 'Reforma 12, Centro' };
        repo.listarEnCamino.mockResolvedValue([entrega]);

        const res = await como('repartidor', request(app).get('/repartidor/entregas'));

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ entregas: [entrega] });
    });
});

describe('GET /repartidor/entregas/:id', () => {
    it('404 si no existe o no esta asignada a el', async () => {
        repo.obtenerEntrega.mockResolvedValue(null);

        const res = await como('repartidor', request(app).get(`/repartidor/entregas/${PEDIDO}`));

        expect(res.status).toBe(404);
        expect(res.body.error).toBe(MENSAJES_REPARTIDOR.NO_ENCONTRADA);
    });
});

describe('cerrar la entrega', () => {
    it('marcar entregado solo si sigue en camino', async () => {
        repo.cerrarEntrega.mockResolvedValue(true);

        const res = await como('repartidor', request(app).post(`/repartidor/entregas/${PEDIDO}/entregado`));

        expect(res.status).toBe(200);
        expect(repo.cerrarEntrega).toHaveBeenCalledWith(expect.anything(), PEDIDO, { estado: 'entregado' });
    });

    it('ya no estaba en camino: 409 DESACTUALIZADO', async () => {
        repo.cerrarEntrega.mockResolvedValue(false);

        const res = await como('repartidor', request(app).post(`/repartidor/entregas/${PEDIDO}/entregado`));

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: MENSAJES_REPARTIDOR.YA_NO_DISPONIBLE, codigo: 'DESACTUALIZADO' });
    });

    it('no entregado guarda el motivo limpio (M2)', async () => {
        repo.cerrarEntrega.mockResolvedValue(true);

        const res = await como('repartidor', request(app).post(`/repartidor/entregas/${PEDIDO}/no-entregado`)).send({ motivo: '  No había nadie ' });

        expect(res.status).toBe(200);
        expect(repo.cerrarEntrega).toHaveBeenCalledWith(expect.anything(), PEDIDO, { estado: 'no_entregado', motivo_no_entrega: 'No había nadie' });
    });

    it.each([
        ['vacio', '  ', MENSAJES_REPARTIDOR.SIN_MOTIVO],
        ['muy largo', 'x'.repeat(201), MENSAJES_REPARTIDOR.MOTIVO_LARGO],
    ])('400 con motivo %s', async (_caso, motivo, mensaje) => {
        const res = await como('repartidor', request(app).post(`/repartidor/entregas/${PEDIDO}/no-entregado`)).send({ motivo });

        expect(res.status).toBe(400);
        expect(res.body.detalles).toEqual({ motivo: mensaje });
        expect(repo.cerrarEntrega).not.toHaveBeenCalled();
    });
});
