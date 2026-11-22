import request from 'supertest';
import { crearApp } from '../src/app';
import { MENSAJES_ADMIN } from '../src/constants/admin';
import { MENSAJES_PEDIDO } from '../src/constants/pedido';
import * as adminRepo from '../src/repositories/admin.repository';
import { obtenerUsuarioSesion } from '../src/repositories/auth.repository';

// API del panel admin (rutas → controlador → servicio) con la capa de datos simulada

jest.mock('../src/repositories/auth.repository');
jest.mock('../src/repositories/admin.repository');

const repo = jest.mocked(adminRepo);
const usuarioSesion = jest.mocked(obtenerUsuarioSesion);
const app = crearApp();

const PEDIDO = '22222222-2222-4222-8222-222222222222';
const REPARTIDOR = '33333333-3333-4333-8333-333333333333';

function como(rol: 'cliente' | 'admin', peticion: request.Test) {
    return peticion.set('Authorization', `Bearer token-${rol}`);
}

function resumen(i: number) {
    return { id: `p${i}`, estado: 'pendiente' as const, folio: null, total: 500, cliente: 'Ana', tipoEntrega: null, fechaEntrega: null, horaEntrega: null };
}

beforeEach(() => {
    jest.resetAllMocks();
    usuarioSesion.mockImplementation(async (_db, token) => {
        const rol = token.replace('token-', '') as 'admin';
        return ['cliente', 'admin'].includes(rol) ? { id: rol, rol } : null;
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('permisos', () => {
    it('solo el admin', async () => {
        expect((await request(app).get('/admin/pedidos')).status).toBe(401);
        expect((await como('cliente', request(app).get('/admin/pedidos'))).status).toBe(403);
        expect((await como('cliente', request(app).get('/admin/repartidores'))).status).toBe(403);
    });
});

describe('GET /admin/pedidos', () => {
    it('"Activos" sin chips: todos los activos, por entrega mas proxima, de 10 en 10', async () => {
        repo.listarPedidos.mockResolvedValue(Array.from({ length: 11 }, (_, i) => resumen(i)));

        const res = await como('admin', request(app).get('/admin/pedidos'));

        expect(res.status).toBe(200);
        expect(res.body.pedidos).toHaveLength(10);
        expect(res.body.hayMas).toBe(true);
        expect(repo.listarPedidos).toHaveBeenCalledWith(
            expect.anything(), ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'no_entregado'], true, 0, 10,
        );
    });

    it('chips marcados: solo esos estados, en el orden del ciclo (M3 D3)', async () => {
        repo.listarPedidos.mockResolvedValue([]);

        await como('admin', request(app).get('/admin/pedidos').query({ estados: 'no_entregado,pendiente', pagina: '2' }));

        expect(repo.listarPedidos).toHaveBeenCalledWith(expect.anything(), ['pendiente', 'no_entregado'], true, 20, 30);
    });

    it('pestaña de terminados: del mas reciente al mas antiguo', async () => {
        repo.listarPedidos.mockResolvedValue([]);

        await como('admin', request(app).get('/admin/pedidos').query({ pestania: 'entregado' }));

        expect(repo.listarPedidos).toHaveBeenCalledWith(expect.anything(), ['entregado'], false, 0, 10);
    });

    it('400 con filtro invalido', async () => {
        const res = await como('admin', request(app).get('/admin/pedidos').query({ estados: 'borrador' }));

        expect(res.status).toBe(400);
        expect(res.body.error).toBe(MENSAJES_ADMIN.FILTRO);
    });
});

describe('GET /admin/pedidos/conteos', () => {
    it('los estados sin pedidos quedan en 0', async () => {
        repo.contarPorEstado.mockResolvedValue([{ estado: 'pendiente', total: 3 }, { estado: 'listo', total: 1 }]);

        const res = await como('admin', request(app).get('/admin/pedidos/conteos'));

        expect(res.body.conteos).toEqual({
            pendiente: 3, confirmado: 0, en_preparacion: 0, listo: 1, en_camino: 0, entregado: 0, no_entregado: 0, cancelado: 0,
        });
    });
});

describe('GET /admin/pedidos/:id', () => {
    it('404 si no existe', async () => {
        repo.obtenerPedido.mockResolvedValue(null);

        const res = await como('admin', request(app).get(`/admin/pedidos/${PEDIDO}`));

        expect(res.status).toBe(404);
        expect(res.body.error).toBe(MENSAJES_PEDIDO.NO_ENCONTRADO);
    });
});

describe('PATCH /admin/pedidos/:id/estado', () => {
    function cambiar(cuerpo: object) {
        return como('admin', request(app).patch(`/admin/pedidos/${PEDIDO}/estado`)).send(cuerpo);
    }

    it('confirma el pedido si sigue en el estado mostrado', async () => {
        repo.cambiarEstado.mockResolvedValue(true);

        const res = await cambiar({ estadoActual: 'pendiente', destino: 'confirmado' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ resultado: 'ok' });
        expect(repo.cambiarEstado).toHaveBeenCalledWith(expect.anything(), PEDIDO, 'pendiente', { estado: 'confirmado' });
    });

    it('enviar a reparto asigna el repartidor (D7)', async () => {
        repo.cambiarEstado.mockResolvedValue(true);

        await cambiar({ estadoActual: 'listo', destino: 'en_camino', repartidorId: REPARTIDOR });

        expect(repo.cambiarEstado).toHaveBeenCalledWith(expect.anything(), PEDIDO, 'listo', { estado: 'en_camino', repartidor_id: REPARTIDOR });
    });

    it('enviar a reparto sin repartidor: 400', async () => {
        const res = await cambiar({ estadoActual: 'listo', destino: 'en_camino' });

        expect(res.status).toBe(400);
        expect(res.body.detalles).toEqual({ repartidorId: MENSAJES_ADMIN.REPARTIDOR_REQUERIDO });
        expect(repo.cambiarEstado).not.toHaveBeenCalled();
    });

    it('reprogramar una entrega fallida quita el repartidor (M2)', async () => {
        repo.cambiarEstado.mockResolvedValue(true);

        await cambiar({ estadoActual: 'no_entregado', destino: 'listo' });

        expect(repo.cambiarEstado).toHaveBeenCalledWith(expect.anything(), PEDIDO, 'no_entregado', { estado: 'listo', repartidor_id: null });
    });

    it('transicion no permitida: 409 sin tocar la base', async () => {
        const res = await cambiar({ estadoActual: 'pendiente', destino: 'entregado' });

        expect(res.status).toBe(409);
        expect(res.body.error).toBe(MENSAJES_ADMIN.TRANSICION);
        expect(repo.cambiarEstado).not.toHaveBeenCalled();
    });

    it('otro admin ya lo movio: 409 DESACTUALIZADO (D6)', async () => {
        repo.cambiarEstado.mockResolvedValue(false);

        const res = await cambiar({ estadoActual: 'pendiente', destino: 'confirmado' });

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: MENSAJES_ADMIN.DESACTUALIZADO, codigo: 'DESACTUALIZADO' });
    });

    it('400 con un estado que no existe', async () => {
        expect((await cambiar({ estadoActual: 'pendiente', destino: 'volando' })).status).toBe(400);
    });
});

describe('GET /admin/repartidores', () => {
    it('lista los repartidores', async () => {
        repo.listarRepartidores.mockResolvedValue([{ id: REPARTIDOR, nombre: 'Luis' }]);

        const res = await como('admin', request(app).get('/admin/repartidores'));

        expect(res.body).toEqual({ repartidores: [{ id: REPARTIDOR, nombre: 'Luis' }] });
    });
});
