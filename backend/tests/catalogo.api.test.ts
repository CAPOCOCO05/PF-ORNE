import request from 'supertest';
import { crearApp } from '../src/app';
import { MENSAJES_CATALOGO } from '../src/constants/catalogo';
import { ErrorBaseDatos, MENSAJES_API } from '../src/errors/ApiError';
import { obtenerUsuarioSesion } from '../src/repositories/auth.repository';
import * as catalogoRepo from '../src/repositories/catalogo.repository';
import * as storageRepo from '../src/repositories/storage.repository';

// prueba la API completa (rutas → controlador → servicio) con la capa de datos simulada

jest.mock('../src/repositories/auth.repository');
jest.mock('../src/repositories/catalogo.repository');
jest.mock('../src/repositories/storage.repository');

const repo = jest.mocked(catalogoRepo);
const storage = jest.mocked(storageRepo);
const usuarioSesion = jest.mocked(obtenerUsuarioSesion);

const app = crearApp();
const ID = '0b6f2a4e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';
const URL_IMAGEN = 'https://x.supabase.co/storage/v1/object/public/catalogo/pastel-1.png';
const URL_NUEVA = 'https://x.supabase.co/storage/v1/object/public/catalogo/pastel-2.png';

const PASTEL = {
    id: ID, nombre: 'Clásico', descripcion: null, imagen_url: URL_IMAGEN, precio_base: 380,
    tamanio: '10' as const, niveles: 1 as const, tipo_pan: 'vainilla' as const, relleno: 'cajeta' as const,
};

const FORMULARIO = {
    nombre: '  Pastel   de fresa ', descripcion: '', tamanio: '15', niveles: 2, tipoPan: 'fresa', relleno: 'cajeta',
    activo: true, imagenUrl: URL_IMAGEN,
};

function pasteles(cantidad: number) {
    return Array.from({ length: cantidad }, (_, i) => ({ ...PASTEL, id: `p${i}` }));
}

function comoAdmin(peticion: request.Test) {
    return peticion.set('Authorization', 'Bearer token-admin');
}

beforeEach(() => {
    jest.resetAllMocks();
    usuarioSesion.mockImplementation(async (_db, token) => {
        if (token === 'token-admin') return { id: 'a1', rol: 'admin' };
        if (token === 'token-cliente') return { id: 'c1', rol: 'cliente' };
        return null;
    });
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('GET /catalogo (con o sin cuenta)', () => {
    it('primera pagina sin filtros: 10 pasteles y hayMas', async () => {
        repo.listarPublicos.mockResolvedValue(pasteles(11));

        const res = await request(app).get('/catalogo');

        expect(res.status).toBe(200);
        expect(res.body.pasteles).toHaveLength(10);
        expect(res.body.hayMas).toBe(true);
        expect(repo.listarPublicos).toHaveBeenCalledWith(expect.anything(), {
            precio: null, panes: [], rellenos: [], tamanios: [], niveles: [], orden: 'nombre',
        }, 0, 10);
    });

    it('lee pagina y filtros del query string', async () => {
        repo.listarPublicos.mockResolvedValue([]);

        const res = await request(app).get('/catalogo')
            .query({ pagina: '1', precio: 'hasta500', panes: 'vainilla,fresa', niveles: '1,2', orden: 'precioAsc' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ pasteles: [], hayMas: false });
        expect(repo.listarPublicos).toHaveBeenCalledWith(expect.anything(), {
            precio: 'hasta500', panes: ['vainilla', 'fresa'], rellenos: [], tamanios: [], niveles: [1, 2], orden: 'precioAsc',
        }, 10, 20);
    });

    it.each([
        ['un sabor que no existe', { panes: 'pizza' }],
        ['un rango de precio que no existe', { precio: 'gratis' }],
        ['una pagina negativa', { pagina: '-1' }],
    ])('400 con %s', async (_caso, query) => {
        const res = await request(app).get('/catalogo').query(query);

        expect(res.status).toBe(400);
        expect(res.body.error).toEqual(expect.any(String));
        expect(repo.listarPublicos).not.toHaveBeenCalled();
    });

    it('error de la base: 500 con mensaje generico', async () => {
        repo.listarPublicos.mockRejectedValue(new ErrorBaseDatos('fallo', 'XX000'));

        const res = await request(app).get('/catalogo');

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: MENSAJES_API.GENERICO });
    });

    it('token invalido: 401 aunque la ruta sea publica', async () => {
        const res = await request(app).get('/catalogo').set('Authorization', 'Bearer vencido');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe(MENSAJES_API.SESION_EXPIRADA);
    });
});

describe('GET /catalogo/:id', () => {
    it('devuelve el pastel', async () => {
        repo.obtenerPublico.mockResolvedValue(PASTEL);

        const res = await request(app).get(`/catalogo/${ID}`);

        expect(res.status).toBe(200);
        expect(res.body.pastel).toEqual(PASTEL);
    });

    it('404 si no existe o el id no es valido', async () => {
        repo.obtenerPublico.mockResolvedValue(null);

        const noExiste = await request(app).get(`/catalogo/${ID}`);
        const idInvalido = await request(app).get('/catalogo/abc');

        expect(noExiste.status).toBe(404);
        expect(noExiste.body.error).toBe(MENSAJES_CATALOGO.NO_ENCONTRADO);
        expect(idInvalido.status).toBe(404);
        expect(repo.obtenerPublico).toHaveBeenCalledTimes(1);
    });
});

describe('/admin/catalogo: permisos', () => {
    it('401 sin sesion y 403 si no es admin', async () => {
        const sinSesion = await request(app).get('/admin/catalogo');
        const cliente = await request(app).get('/admin/catalogo').set('Authorization', 'Bearer token-cliente');

        expect(sinSesion.status).toBe(401);
        expect(cliente.status).toBe(403);
        expect(repo.listarTodos).not.toHaveBeenCalled();
    });

    it('el admin ve todos los pasteles', async () => {
        repo.listarTodos.mockResolvedValue(pasteles(3).map((p) => ({ ...p, activo: false })));

        const res = await comoAdmin(request(app).get('/admin/catalogo?pagina=0'));

        expect(res.status).toBe(200);
        expect(res.body.pasteles).toHaveLength(3);
        expect(repo.listarTodos).toHaveBeenCalledWith(expect.anything(), 0, 10);
    });
});

describe('POST /admin/catalogo', () => {
    it('crea el pastel con los datos normalizados', async () => {
        repo.insertar.mockResolvedValue(ID);

        const res = await comoAdmin(request(app).post('/admin/catalogo')).send(FORMULARIO);

        expect(res.status).toBe(201);
        expect(res.body).toEqual({ id: ID });
        expect(repo.insertar).toHaveBeenCalledWith(expect.anything(), {
            nombre: 'Pastel de fresa', descripcion: null, tamanio: '15', niveles: 2, tipo_pan: 'fresa', relleno: 'cajeta',
            activo: true, imagen_url: URL_IMAGEN,
        });
        expect(storage.borrar).not.toHaveBeenCalled();
    });

    it('400 con el error de cada campo', async () => {
        const res = await comoAdmin(request(app).post('/admin/catalogo'))
            .send({ ...FORMULARIO, nombre: ' ', tamanio: '10', niveles: 3, relleno: 'pizza' });

        expect(res.status).toBe(400);
        expect(res.body.detalles).toEqual({
            nombre: MENSAJES_CATALOGO.NOMBRE_VACIO,
            niveles: MENSAJES_CATALOGO.NIVELES_EXCEDIDOS,
            relleno: MENSAJES_CATALOGO.OPCION_INVALIDA,
        });
        expect(repo.insertar).not.toHaveBeenCalled();
    });

    it('nombre repetido: 409 junto al campo y borra la imagen recien subida', async () => {
        repo.insertar.mockRejectedValue(new ErrorBaseDatos('duplicate key', '23505'));

        const res = await comoAdmin(request(app).post('/admin/catalogo')).send(FORMULARIO);

        expect(res.status).toBe(409);
        expect(res.body.detalles).toEqual({ nombre: MENSAJES_CATALOGO.NOMBRE_REPETIDO });
        expect(storage.borrar).toHaveBeenCalledWith(expect.anything(), 'catalogo', 'pastel-1.png');
    });
});

describe('PUT /admin/catalogo/:id', () => {
    it('al cambiar la imagen borra la anterior', async () => {
        repo.obtenerAdmin.mockResolvedValue({ ...PASTEL, activo: true });
        repo.actualizar.mockResolvedValue(ID);

        const res = await comoAdmin(request(app).put(`/admin/catalogo/${ID}`)).send({ ...FORMULARIO, imagenUrl: URL_NUEVA });

        expect(res.status).toBe(200);
        expect(repo.actualizar).toHaveBeenCalledWith(expect.anything(), ID, expect.objectContaining({ imagen_url: URL_NUEVA }));
        expect(storage.borrar).toHaveBeenCalledWith(expect.anything(), 'catalogo', 'pastel-1.png');
    });

    it('si borrar la imagen falla, el guardado no falla (M4 D4)', async () => {
        repo.obtenerAdmin.mockResolvedValue({ ...PASTEL, activo: true });
        repo.actualizar.mockResolvedValue(ID);
        storage.borrar.mockRejectedValue(new ErrorBaseDatos('storage caido'));

        const res = await comoAdmin(request(app).put(`/admin/catalogo/${ID}`)).send({ ...FORMULARIO, imagenUrl: URL_NUEVA });

        expect(res.status).toBe(200);
    });

    it('404 si el pastel no existe', async () => {
        repo.obtenerAdmin.mockResolvedValue(null);

        const res = await comoAdmin(request(app).put(`/admin/catalogo/${ID}`)).send(FORMULARIO);

        expect(res.status).toBe(404);
        expect(repo.actualizar).not.toHaveBeenCalled();
    });
});

describe('POST /admin/catalogo/imagenes', () => {
    it('sube la imagen y devuelve su URL publica', async () => {
        storage.subirPublico.mockResolvedValue(URL_NUEVA);

        const res = await comoAdmin(request(app).post('/admin/catalogo/imagenes'))
            .set('Content-Type', 'image/png').send(Buffer.from([1, 2, 3]));

        expect(res.status).toBe(201);
        expect(res.body).toEqual({ url: URL_NUEVA });
        expect(storage.subirPublico).toHaveBeenCalledWith(
            expect.anything(), 'catalogo', expect.stringMatching(/^pastel-.*\.png$/), expect.any(Buffer), 'image/png',
        );
    });

    it('400 si no es un formato aceptado', async () => {
        const res = await comoAdmin(request(app).post('/admin/catalogo/imagenes'))
            .set('Content-Type', 'image/gif').send(Buffer.from([1]));

        expect(res.status).toBe(400);
        expect(res.body.error).toBe(MENSAJES_CATALOGO.IMAGEN_FORMATO);
    });

    it('502 si Storage falla', async () => {
        storage.subirPublico.mockRejectedValue(new ErrorBaseDatos('bucket caido'));

        const res = await comoAdmin(request(app).post('/admin/catalogo/imagenes'))
            .set('Content-Type', 'image/jpeg').send(Buffer.from([1]));

        expect(res.status).toBe(502);
        expect(res.body.error).toBe(MENSAJES_CATALOGO.IMAGEN);
    });
});

describe('rutas desconocidas', () => {
    it('404', async () => {
        const res = await request(app).get('/no-existe');

        expect(res.status).toBe(404);
        expect(res.body.error).toBe(MENSAJES_API.RUTA_NO_ENCONTRADA);
    });
});
