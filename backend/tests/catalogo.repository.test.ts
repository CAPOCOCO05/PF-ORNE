import { SupabaseClient } from '@supabase/supabase-js';
import { ErrorBaseDatos } from '../src/errors/ApiError';
import { insertar, listarPublicos, listarTodos, obtenerPublico } from '../src/repositories/catalogo.repository';
import { FiltrosCatalogo } from '../src/types/catalogo.types';
import { consultaSimulada } from './helpers/consultaSimulada';

const SIN_FILTROS: FiltrosCatalogo = { precio: null, panes: [], rellenos: [], tamanios: [], niveles: [], orden: 'nombre' };

function dbCon(respuesta: { data?: unknown; error: unknown }) {
    const consulta = consultaSimulada(respuesta);
    const db = { from: jest.fn(() => consulta) } as unknown as SupabaseClient;
    return { db, consulta };
}

describe('catalogo.repository', () => {
    it('listarPublicos: solo activos, orden por nombre e id, rango pedido y precio numerico', async () => {
        const { db, consulta } = dbCon({ data: [{ id: 'p1', precio_base: '380.00' }], error: null });

        const filas = await listarPublicos(db, SIN_FILTROS, 10, 20);

        expect(db.from).toHaveBeenCalledWith('catalogo_pasteles');
        expect(consulta.eq).toHaveBeenCalledWith('activo', true);
        expect(consulta.order).toHaveBeenNthCalledWith(1, 'nombre');
        expect(consulta.order).toHaveBeenNthCalledWith(2, 'id');
        expect(consulta.range).toHaveBeenCalledWith(10, 20);
        expect(filas[0].precio_base).toBe(380);
    });

    it('listarPublicos: traduce cada filtro a la consulta (M5 D3)', async () => {
        const { db, consulta } = dbCon({ data: [], error: null });
        const filtros: FiltrosCatalogo = {
            precio: '500a800', panes: ['vainilla', 'fresa'], rellenos: ['cajeta'], tamanios: ['15'], niveles: [1, 2], orden: 'precioDesc',
        };

        await listarPublicos(db, filtros, 0, 10);

        expect(consulta.gt).toHaveBeenCalledWith('precio_base', 500);
        expect(consulta.lte).toHaveBeenCalledWith('precio_base', 800);
        expect(consulta.in).toHaveBeenCalledWith('tipo_pan', ['vainilla', 'fresa']);
        expect(consulta.in).toHaveBeenCalledWith('relleno', ['cajeta']);
        expect(consulta.in).toHaveBeenCalledWith('tamanio', ['15']);
        expect(consulta.in).toHaveBeenCalledWith('niveles', [1, 2]);
        expect(consulta.order).toHaveBeenNthCalledWith(1, 'precio_base', { ascending: false });
    });

    it('listarPublicos: "hasta500" solo pone el limite superior', async () => {
        const { db, consulta } = dbCon({ data: [], error: null });

        await listarPublicos(db, { ...SIN_FILTROS, precio: 'hasta500' }, 0, 10);

        expect(consulta.gt).not.toHaveBeenCalled();
        expect(consulta.lte).toHaveBeenCalledWith('precio_base', 500);
    });

    it('listarTodos: incluye ocultos (no filtra activo)', async () => {
        const { db, consulta } = dbCon({ data: [], error: null });

        await listarTodos(db, 0, 10);

        expect(consulta.eq).not.toHaveBeenCalled();
        expect(consulta.select).toHaveBeenCalledWith(expect.stringContaining('activo'));
    });

    it('obtenerPublico: null si no existe', async () => {
        const { db } = dbCon({ data: null, error: null });

        expect(await obtenerPublico(db, 'x')).toBeNull();
    });

    it('lanza ErrorBaseDatos con el codigo de Postgres', async () => {
        const { db } = dbCon({ data: null, error: { message: 'duplicate key', code: '23505' } });

        await expect(insertar(db, {
            nombre: 'A', descripcion: null, tamanio: '10', niveles: 1, tipo_pan: 'vainilla', relleno: 'cajeta', activo: true, imagen_url: null,
        })).rejects.toEqual(new ErrorBaseDatos('duplicate key', '23505'));
    });
});
