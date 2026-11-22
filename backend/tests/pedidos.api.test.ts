import request from 'supertest';
import { crearApp } from '../src/app';
import { MENSAJES_CATALOGO } from '../src/constants/catalogo';
import { MENSAJES_ENTREGA } from '../src/constants/entrega';
import { ERRORES_CONFIRMACION, MENSAJES_PEDIDO } from '../src/constants/pedido';
import { ErrorBaseDatos } from '../src/errors/ApiError';
import { obtenerUsuarioSesion } from '../src/repositories/auth.repository';
import * as pedidosRepo from '../src/repositories/pedidos.repository';
import * as storageRepo from '../src/repositories/storage.repository';
import { Borrador } from '../src/types/pedido.types';

// API de pedidos del cliente (rutas → controlador → servicio) con la capa de datos simulada

jest.mock('../src/repositories/auth.repository');
jest.mock('../src/repositories/pedidos.repository', () => ({
    ...jest.requireActual('../src/repositories/pedidos.repository'),
    listarDelUsuario: jest.fn(), obtenerCompleto: jest.fn(), obtenerBorrador: jest.fn(), insertarBorrador: jest.fn(),
    actualizarBorrador: jest.fn(), guardarDetalle: jest.fn(), actualizarImagen: jest.fn(), eliminarBorrador: jest.fn(), confirmar: jest.fn(),
}));
jest.mock('../src/repositories/storage.repository');

const repo = jest.mocked(pedidosRepo);
const storage = jest.mocked(storageRepo);
const usuarioSesion = jest.mocked(obtenerUsuarioSesion);
const app = crearApp();

const CLIENTE = '11111111-1111-4111-8111-111111111111';
const PEDIDO = '22222222-2222-4222-8222-222222222222';
const CARPETA = `${CLIENTE}/${PEDIDO}`;

const ENTREGA_VACIA = {
    tipoEntrega: null, calle: '', numeroExterior: '', numeroInterior: '', colonia: '', referencia: '', telefono: '',
    ubicacion: null, fechaEntrega: null, horaEntrega: null,
};

const BORRADOR: Borrador = {
    id: PEDIDO, tamanio: '15', niveles: 2, tipoPan: 'fresa', relleno: 'cajeta', mensaje: '', imagenRuta: null,
    entrega: ENTREGA_VACIA as Borrador['entrega'], pasoActual: 2,
};

function como(rol: 'cliente' | 'admin' | 'repartidor', peticion: request.Test) {
    return peticion.set('Authorization', `Bearer token-${rol}`);
}

beforeEach(() => {
    jest.resetAllMocks();
    usuarioSesion.mockImplementation(async (_db, token) => {
        const rol = token.replace('token-', '') as 'cliente';
        return ['cliente', 'admin', 'repartidor'].includes(rol) ? { id: rol === 'cliente' ? CLIENTE : rol, rol } : null;
    });
    storage.listar.mockResolvedValue([]);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('permisos', () => {
    it('401 sin sesion y 403 para admin o repartidor', async () => {
        expect((await request(app).get('/pedidos')).status).toBe(401);
        expect((await como('admin', request(app).get('/pedidos'))).status).toBe(403);
        expect((await como('repartidor', request(app).post('/pedidos'))).status).toBe(403);
    });
});

describe('GET /pedidos', () => {
    it('lista los pedidos del usuario de la sesion', async () => {
        repo.listarDelUsuario.mockResolvedValue([]);

        const res = await como('cliente', request(app).get('/pedidos'));

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ pedidos: [] });
        expect(repo.listarDelUsuario).toHaveBeenCalledWith(expect.anything(), CLIENTE);
    });
});

describe('GET /pedidos/:id y /borrador', () => {
    it('404 si no existe', async () => {
        repo.obtenerCompleto.mockResolvedValue(null);

        const res = await como('cliente', request(app).get(`/pedidos/${PEDIDO}`));

        expect(res.status).toBe(404);
        expect(res.body.error).toBe(MENSAJES_PEDIDO.NO_ENCONTRADO);
    });

    it('devuelve el borrador para retomarlo', async () => {
        repo.obtenerBorrador.mockResolvedValue(BORRADOR);

        const res = await como('cliente', request(app).get(`/pedidos/${PEDIDO}/borrador`));

        expect(res.status).toBe(200);
        expect(res.body.pedido).toEqual(BORRADOR);
    });
});

describe('POST /pedidos y PATCH /pedidos/:id (borrador)', () => {
    it('crea el borrador con el total calculado en el servidor', async () => {
        repo.insertarBorrador.mockResolvedValue(PEDIDO);

        const res = await como('cliente', request(app).post('/pedidos'))
            .send({ pasoActual: 1, tamanio: '20', niveles: 3, tipoPan: null, relleno: 'mermeladafresa', mensaje: '  ', total: 1 });

        expect(res.status).toBe(201);
        expect(res.body).toEqual({ id: PEDIDO });
        // 650 + 250 × 2 + 70
        expect(repo.insertarBorrador).toHaveBeenCalledWith(expect.anything(), CLIENTE, { total: 1220, paso_actual: 1 });
        expect(repo.guardarDetalle).toHaveBeenCalledWith(expect.anything(), PEDIDO, {
            tamanio: '20', niveles: 3, tipo_pan: null, relleno: 'mermeladafresa', decoracion_texto: null, precio_estimado: 1220,
        });
    });

    it('el paso 4 guarda la entrega; en recoleccion se limpia la direccion (F02 D8)', async () => {
        repo.actualizarBorrador.mockResolvedValue(true);
        const entrega = {
            ...ENTREGA_VACIA, tipoEntrega: 'recoleccion', calle: 'Reforma', telefono: '646 123 4567', fechaEntrega: '2026-12-01', horaEntrega: '12:00',
        };

        const res = await como('cliente', request(app).patch(`/pedidos/${PEDIDO}`))
            .send({ pasoActual: 4, tamanio: '10', niveles: 1, tipoPan: 'vainilla', relleno: 'cajeta', mensaje: 'Feliz día', entrega });

        expect(res.status).toBe(200);
        expect(repo.actualizarBorrador).toHaveBeenCalledWith(expect.anything(), PEDIDO, expect.objectContaining({
            total: 400, paso_actual: 4, tipo_entrega: 'recoleccion', calle: null, direccion: null,
            telefono_contacto: '6461234567', fecha_entrega: '2026-12-01', hora_entrega: '12:00',
        }));
    });

    it('domicilio: arma la direccion legible', async () => {
        repo.actualizarBorrador.mockResolvedValue(true);
        const entrega = {
            ...ENTREGA_VACIA, tipoEntrega: 'domicilio', calle: 'Reforma', numeroExterior: '12', numeroInterior: '3', colonia: 'Centro',
            ubicacion: { latitud: 31.8, longitud: -116.6 },
        };

        await como('cliente', request(app).patch(`/pedidos/${PEDIDO}`)).send({ pasoActual: 4, entrega });

        expect(repo.actualizarBorrador).toHaveBeenCalledWith(expect.anything(), PEDIDO, expect.objectContaining({
            direccion: 'Reforma 12 Int 3, Centro', direccion_lat: 31.8, direccion_lng: -116.6,
        }));
    });

    it('404 si el borrador ya no existe (p. ej. ya se confirmo)', async () => {
        repo.actualizarBorrador.mockResolvedValue(false);

        const res = await como('cliente', request(app).patch(`/pedidos/${PEDIDO}`)).send({ pasoActual: 2 });

        expect(res.status).toBe(404);
        expect(repo.guardarDetalle).not.toHaveBeenCalled();
    });

    it('400 con el error de cada campo', async () => {
        const res = await como('cliente', request(app).post('/pedidos')).send({
            pasoActual: 1, tamanio: '10', niveles: 2, relleno: 'pizza', mensaje: 'x'.repeat(501),
            entrega: { ...ENTREGA_VACIA, telefono: '12', horaEntrega: '09:00', fechaEntrega: 'mañana' },
        });

        expect(res.status).toBe(400);
        expect(res.body.detalles).toEqual({
            niveles: MENSAJES_CATALOGO.NIVELES_EXCEDIDOS,
            relleno: MENSAJES_CATALOGO.OPCION_INVALIDA,
            mensaje: MENSAJES_PEDIDO.MENSAJE_LARGO,
            telefono: MENSAJES_ENTREGA.TELEFONO,
            horaEntrega: MENSAJES_CATALOGO.OPCION_INVALIDA,
            fechaEntrega: MENSAJES_PEDIDO.FECHA,
        });
        expect(repo.insertarBorrador).not.toHaveBeenCalled();
    });

    it('400 sin paso valido', async () => {
        expect((await como('cliente', request(app).post('/pedidos')).send({ pasoActual: 9 })).status).toBe(400);
    });

    it('un emoji cuenta como un caracter en el mensaje (D8)', async () => {
        repo.insertarBorrador.mockResolvedValue(PEDIDO);

        const res = await como('cliente', request(app).post('/pedidos')).send({ pasoActual: 3, mensaje: '🎂'.repeat(500) });

        expect(res.status).toBe(201);
    });
});

describe('imagen de referencia (D9)', () => {
    it('sube, borra las anteriores y guarda la ruta en el detalle', async () => {
        repo.obtenerBorrador.mockResolvedValue(BORRADOR);
        storage.listar.mockResolvedValue([`${CARPETA}/referencia.png`, `${CARPETA}/referencia.jpg`]);

        const res = await como('cliente', request(app).post(`/pedidos/${PEDIDO}/imagen`))
            .set('Content-Type', 'image/jpeg').send(Buffer.from([1, 2]));

        expect(res.status).toBe(201);
        expect(res.body).toEqual({ ruta: `${CARPETA}/referencia.jpg` });
        expect(storage.subir).toHaveBeenCalledWith(expect.anything(), 'referencias-pasteles', `${CARPETA}/referencia.jpg`, expect.any(Buffer), 'image/jpeg');
        expect(storage.borrarVarios).toHaveBeenCalledWith(expect.anything(), 'referencias-pasteles', [`${CARPETA}/referencia.png`]);
        expect(repo.actualizarImagen).toHaveBeenCalledWith(expect.anything(), PEDIDO, `${CARPETA}/referencia.jpg`);
    });

    it('si falla la subida no se borra la imagen anterior', async () => {
        repo.obtenerBorrador.mockResolvedValue(BORRADOR);
        storage.subir.mockRejectedValue(new ErrorBaseDatos('storage caido'));

        const res = await como('cliente', request(app).post(`/pedidos/${PEDIDO}/imagen`))
            .set('Content-Type', 'image/png').send(Buffer.from([1]));

        expect(res.status).toBe(502);
        expect(res.body.error).toBe(MENSAJES_PEDIDO.IMAGEN);
        expect(storage.borrarVarios).not.toHaveBeenCalled();
        expect(repo.actualizarImagen).not.toHaveBeenCalled();
    });

    it('quitar la imagen vacia la carpeta y el detalle', async () => {
        repo.obtenerBorrador.mockResolvedValue(BORRADOR);
        storage.listar.mockResolvedValue([`${CARPETA}/referencia.png`]);

        const res = await como('cliente', request(app).delete(`/pedidos/${PEDIDO}/imagen`));

        expect(res.status).toBe(204);
        expect(storage.borrarVarios).toHaveBeenCalledWith(expect.anything(), 'referencias-pasteles', [`${CARPETA}/referencia.png`]);
        expect(repo.actualizarImagen).toHaveBeenCalledWith(expect.anything(), PEDIDO, null);
    });

    it('URL firmada: el admin tambien puede verla; ruta invalida es 404', async () => {
        storage.urlFirmada.mockResolvedValue('https://firmada');

        const admin = await como('admin', request(app).get('/pedidos/referencias/url').query({ ruta: `${CARPETA}/referencia.jpg` }));
        const invalida = await como('cliente', request(app).get('/pedidos/referencias/url').query({ ruta: '../otro/archivo' }));

        expect(admin.status).toBe(200);
        expect(admin.body).toEqual({ url: 'https://firmada' });
        expect(invalida.status).toBe(404);
        expect(storage.urlFirmada).toHaveBeenCalledTimes(1);
    });
});

describe('DELETE /pedidos/:id', () => {
    it('borra la imagen y despues el borrador', async () => {
        repo.obtenerBorrador.mockResolvedValue(BORRADOR);
        repo.eliminarBorrador.mockResolvedValue(true);
        storage.listar.mockResolvedValue([`${CARPETA}/referencia.jpg`]);

        const res = await como('cliente', request(app).delete(`/pedidos/${PEDIDO}`));

        expect(res.status).toBe(204);
        expect(storage.borrarVarios).toHaveBeenCalledWith(expect.anything(), 'referencias-pasteles', [`${CARPETA}/referencia.jpg`]);
        expect(repo.eliminarBorrador).toHaveBeenCalledWith(expect.anything(), PEDIDO);
    });

    it('404 si no es un borrador', async () => {
        repo.obtenerBorrador.mockResolvedValue(null);

        expect((await como('cliente', request(app).delete(`/pedidos/${PEDIDO}`))).status).toBe(404);
        expect(repo.eliminarBorrador).not.toHaveBeenCalled();
    });
});

describe('POST /pedidos/:id/confirmar', () => {
    it('devuelve folio y total', async () => {
        repo.confirmar.mockResolvedValue({ folio: 'ORN-0001', total: 790 });

        const res = await como('cliente', request(app).post(`/pedidos/${PEDIDO}/confirmar`));

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ folio: 'ORN-0001', total: 790 });
    });

    it.each(Object.entries(ERRORES_CONFIRMACION))('%s: responde su codigo y mensaje', async (codigo, { status, mensaje }) => {
        repo.confirmar.mockRejectedValue(new ErrorBaseDatos(codigo, 'P0001'));

        const res = await como('cliente', request(app).post(`/pedidos/${PEDIDO}/confirmar`));

        expect(res.status).toBe(status);
        expect(res.body).toEqual({ error: mensaje, codigo });
    });

    it('error desconocido: 500 generico', async () => {
        repo.confirmar.mockRejectedValue(new ErrorBaseDatos('otra cosa', 'XX000'));

        expect((await como('cliente', request(app).post(`/pedidos/${PEDIDO}/confirmar`))).status).toBe(500);
    });
});
