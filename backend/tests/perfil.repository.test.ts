import { SupabaseClient } from '@supabase/supabase-js';
import { guardarDatosCliente, obtenerDatosCliente } from '../src/repositories/perfil.repository';

// conversion entre la fila de datos_cliente (snake_case) y DatosCliente

function dbCon(respuesta: { data?: unknown; error: unknown }) {
    const consulta: Record<'select' | 'eq' | 'maybeSingle' | 'upsert', jest.Mock> = {
        select: jest.fn(() => consulta),
        eq: jest.fn(() => consulta),
        maybeSingle: jest.fn().mockResolvedValue(respuesta),
        upsert: jest.fn().mockResolvedValue(respuesta),
    };
    const db = { from: jest.fn(() => consulta) } as unknown as SupabaseClient;
    return { db, consulta };
}

describe('perfil.repository', () => {
    it('obtenerDatosCliente: coordenadas numericas y direccion completa', async () => {
        const { db } = dbCon({
            data: {
                telefono: '6461234567', calle: 'Reforma', numero_exterior: '12', numero_interior: null, colonia: 'Centro',
                direccion_referencia: null, direccion_lat: '31.8000000', direccion_lng: '-116.6000000',
            },
            error: null,
        });

        expect(await obtenerDatosCliente(db, 'c1')).toEqual({
            telefono: '6461234567',
            direccion: {
                calle: 'Reforma', numeroExterior: '12', numeroInterior: '', colonia: 'Centro', referencia: '',
                ubicacion: { latitud: 31.8, longitud: -116.6 },
            },
        });
    });

    it('obtenerDatosCliente: sin calle no hay direccion', async () => {
        const { db } = dbCon({
            data: { telefono: null, calle: null, numero_exterior: null, numero_interior: null, colonia: null, direccion_referencia: null, direccion_lat: null, direccion_lng: null },
            error: null,
        });

        expect(await obtenerDatosCliente(db, 'c1')).toEqual({ telefono: '', direccion: null });
    });

    it('guardarDatosCliente: sin direccion vacia todas sus columnas', async () => {
        const { db, consulta } = dbCon({ error: null });

        await guardarDatosCliente(db, 'c1', { telefono: '', direccion: null });

        expect(consulta.upsert).toHaveBeenCalledWith({
            usuario_id: 'c1', telefono: null, calle: null, numero_exterior: null, numero_interior: null, colonia: null,
            direccion_referencia: null, direccion_lat: null, direccion_lng: null,
        }, { onConflict: 'usuario_id' });
    });
});
