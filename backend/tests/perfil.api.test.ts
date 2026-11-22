import request from 'supertest';
import { crearApp } from '../src/app';
import { MENSAJES_ENTREGA } from '../src/constants/entrega';
import { MENSAJES_PERFIL } from '../src/constants/perfil';
import { ErrorBaseDatos } from '../src/errors/ApiError';
import { obtenerUsuarioSesion } from '../src/repositories/auth.repository';
import * as perfilRepo from '../src/repositories/perfil.repository';

// API de perfil (rutas → controlador → servicio) con la capa de datos simulada

jest.mock('../src/repositories/auth.repository');
jest.mock('../src/repositories/perfil.repository');

const repo = jest.mocked(perfilRepo);
const usuarioSesion = jest.mocked(obtenerUsuarioSesion);
const app = crearApp();

const PERFIL = { id: 'c1', nombre: 'Ana López', rol: 'cliente' as const };
const EN_ZONA = { latitud: 31.8, longitud: -116.6 };            // a ~2 km de la sucursal
const FUERA_DE_ZONA = { latitud: 32.5, longitud: -117.0 };     // Tijuana

const DIRECCION = {
    calle: ' Av. Reforma ', numeroExterior: '123-B', numeroInterior: '', colonia: 'Centro', referencia: '', ubicacion: EN_ZONA,
};

function como(rol: 'cliente' | 'admin' | 'repartidor', peticion: request.Test) {
    return peticion.set('Authorization', `Bearer token-${rol}`);
}

beforeEach(() => {
    jest.resetAllMocks();
    usuarioSesion.mockImplementation(async (_db, token) => {
        const rol = token.replace('token-', '');
        return ['cliente', 'admin', 'repartidor'].includes(rol) ? { id: rol === 'cliente' ? 'c1' : rol, rol: rol as 'cliente' } : null;
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('GET /perfil', () => {
    it('401 sin sesion', async () => {
        expect((await request(app).get('/perfil')).status).toBe(401);
    });

    it('devuelve el perfil del usuario de la sesion (cualquier rol)', async () => {
        repo.obtenerPerfil.mockResolvedValue({ id: 'admin', nombre: 'Admin', rol: 'admin' });

        const res = await como('admin', request(app).get('/perfil'));

        expect(res.status).toBe(200);
        expect(res.body.perfil.rol).toBe('admin');
        expect(repo.obtenerPerfil).toHaveBeenCalledWith(expect.anything(), 'admin');
    });

    it('404 si la sesion no tiene perfil', async () => {
        repo.obtenerPerfil.mockResolvedValue(null);

        const res = await como('cliente', request(app).get('/perfil'));

        expect(res.status).toBe(404);
        expect(res.body.error).toBe(MENSAJES_PERFIL.NO_ENCONTRADO);
    });
});

describe('PATCH /perfil', () => {
    it('guarda el nombre normalizado', async () => {
        repo.actualizarNombre.mockResolvedValue({ ...PERFIL, nombre: 'Ana María López' });

        const res = await como('cliente', request(app).patch('/perfil')).send({ nombre: '  Ana   María López ' });

        expect(res.status).toBe(200);
        expect(repo.actualizarNombre).toHaveBeenCalledWith(expect.anything(), 'c1', 'Ana María López');
        expect(res.body.perfil.nombre).toBe('Ana María López');
    });

    it.each([
        ['vacio', '  ', MENSAJES_PERFIL.NOMBRE_VACIO],
        ['sin apellido', 'Ana', MENSAJES_PERFIL.NOMBRE_INCOMPLETO],
        ['con numeros', 'Ana L0pez', MENSAJES_PERFIL.NOMBRE_CARACTERES],
    ])('400 con nombre %s', async (_caso, nombre, mensaje) => {
        const res = await como('cliente', request(app).patch('/perfil')).send({ nombre });

        expect(res.status).toBe(400);
        expect(res.body.detalles).toEqual({ nombre: mensaje });
        expect(repo.actualizarNombre).not.toHaveBeenCalled();
    });
});

describe('/perfil/datos-cliente', () => {
    it('solo el cliente', async () => {
        const res = await como('repartidor', request(app).get('/perfil/datos-cliente'));

        expect(res.status).toBe(403);
    });

    it('cliente sin fila: datos vacios', async () => {
        repo.obtenerDatosCliente.mockResolvedValue(null);

        const res = await como('cliente', request(app).get('/perfil/datos-cliente'));

        expect(res.status).toBe(200);
        expect(res.body.datos).toEqual({ telefono: '', direccion: null });
    });

    it('guarda telefono y direccion limpios', async () => {
        const res = await como('cliente', request(app).put('/perfil/datos-cliente'))
            .send({ telefono: '646 123-4567', direccion: DIRECCION });

        expect(res.status).toBe(200);
        const esperado = { telefono: '6461234567', direccion: { ...DIRECCION, calle: 'Av. Reforma' } };
        expect(repo.guardarDatosCliente).toHaveBeenCalledWith(expect.anything(), 'c1', esperado);
        expect(res.body.datos).toEqual(esperado);
    });

    it('sin direccion ni telefono es valido (quitar direccion)', async () => {
        const res = await como('cliente', request(app).put('/perfil/datos-cliente')).send({ telefono: '', direccion: null });

        expect(res.status).toBe(200);
        expect(repo.guardarDatosCliente).toHaveBeenCalledWith(expect.anything(), 'c1', { telefono: '', direccion: null });
    });

    it('400 con el error de cada campo', async () => {
        const res = await como('cliente', request(app).put('/perfil/datos-cliente'))
            .send({ telefono: '123', direccion: { ...DIRECCION, calle: '', numeroExterior: 'abc', ubicacion: FUERA_DE_ZONA } });

        expect(res.status).toBe(400);
        expect(res.body.detalles).toEqual({
            telefono: MENSAJES_ENTREGA.TELEFONO,
            calle: MENSAJES_ENTREGA.OBLIGATORIO,
            numeroExterior: MENSAJES_ENTREGA.NUMERO_EXTERIOR,
            ubicacion: MENSAJES_ENTREGA.FUERA_DE_ZONA,
        });
        expect(repo.guardarDatosCliente).not.toHaveBeenCalled();
    });

    it('400 si falta el pin del mapa', async () => {
        const res = await como('cliente', request(app).put('/perfil/datos-cliente'))
            .send({ telefono: '', direccion: { ...DIRECCION, ubicacion: null } });

        expect(res.body.detalles).toEqual({ ubicacion: MENSAJES_ENTREGA.UBICACION });
    });

    it('RLS rechaza: 403', async () => {
        repo.guardarDatosCliente.mockRejectedValue(new ErrorBaseDatos('permission denied', '42501'));

        const res = await como('cliente', request(app).put('/perfil/datos-cliente')).send({ telefono: '', direccion: null });

        expect(res.status).toBe(403);
    });
});
