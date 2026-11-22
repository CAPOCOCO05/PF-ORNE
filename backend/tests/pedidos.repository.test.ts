import { entregaDeFila, filaDeEntrega, FilaPedido, pedidoCompletoDeFila } from '../src/repositories/pedidos.repository';
import { DatosEntrega } from '../src/types/pedido.types';
import { codigoConfirmacion, esRutaReferencia } from '../src/utils/pedido';

// conversion entre filas de pedidos y los objetos de la API

const DOMICILIO: DatosEntrega = {
    tipoEntrega: 'domicilio', calle: ' Calle Primera ', numeroExterior: '123', numeroInterior: '', colonia: 'Centro',
    referencia: '  ', telefono: '6461234567', ubicacion: { latitud: 31.78, longitud: -116.59 },
    fechaEntrega: '2026-10-26', horaEntrega: '12:00',
};

describe('filaDeEntrega', () => {
    it('domicilio: limpia los textos y arma la direccion', () => {
        expect(filaDeEntrega(DOMICILIO)).toEqual({
            tipo_entrega: 'domicilio', calle: 'Calle Primera', numero_exterior: '123', numero_interior: null, colonia: 'Centro',
            direccion: 'Calle Primera 123, Centro', direccion_referencia: null, direccion_lat: 31.78, direccion_lng: -116.59,
            telefono_contacto: '6461234567', fecha_entrega: '2026-10-26', hora_entrega: '12:00',
        });
    });

    it('recoleccion: quita la direccion y las coordenadas aunque se hubieran capturado', () => {
        expect(filaDeEntrega({ ...DOMICILIO, tipoEntrega: 'recoleccion' })).toEqual(expect.objectContaining({
            tipo_entrega: 'recoleccion', calle: null, numero_exterior: null, colonia: null, direccion: null,
            direccion_lat: null, direccion_lng: null, telefono_contacto: '6461234567',
        }));
    });
});

describe('entregaDeFila y pedidoCompletoDeFila', () => {
    it('hora sin segundos y coordenadas numericas', () => {
        expect(entregaDeFila({ hora_entrega: '14:00:00', direccion_lat: '31.7800000', direccion_lng: '-116.5900000' }))
            .toEqual(expect.objectContaining({ horaEntrega: '14:00', ubicacion: { latitud: 31.78, longitud: -116.59 } }));
    });

    it('borrador de F01 sin entrega: campos vacios', () => {
        expect(entregaDeFila({})).toEqual({
            tipoEntrega: null, calle: '', numeroExterior: '', numeroInterior: '', colonia: '', referencia: '', telefono: '',
            ubicacion: null, fechaEntrega: null, horaEntrega: null,
        });
    });

    it('acepta el detalle como objeto o como arreglo', () => {
        const fila: FilaPedido = {
            id: 'p1', estado: 'pendiente', folio: 'ORN-1', total: '790.00', paso_actual: 5, created_at: '2026-10-01',
            pedido_detalle: [{ tamanio: '15', niveles: 2, tipo_pan: 'fresa', relleno: 'cajeta', decoracion_texto: null }],
        };

        const pedido = pedidoCompletoDeFila(fila);

        expect(pedido.total).toBe(790);
        expect(pedido.tamanio).toBe('15');
        expect(pedido.mensaje).toBe('');
        expect(pedido.motivoNoEntrega).toBeNull();
    });
});

describe('utils de pedido', () => {
    it('codigoConfirmacion encuentra el codigo dentro del mensaje de Postgres', () => {
        expect(codigoConfirmacion('FECHA_NO_DISPONIBLE')).toBe('FECHA_NO_DISPONIBLE');
        expect(codigoConfirmacion('ERROR: PEDIDO_INCOMPLETO (SQLSTATE P0001)')).toBe('PEDIDO_INCOMPLETO');
        expect(codigoConfirmacion('otra cosa')).toBeNull();
    });

    it('esRutaReferencia solo acepta <uuid>/<uuid>/referencia.<ext>', () => {
        const uuid = '11111111-1111-4111-8111-111111111111';
        expect(esRutaReferencia(`${uuid}/${uuid}/referencia.jpg`)).toBe(true);
        expect(esRutaReferencia(`${uuid}/../referencia.jpg`)).toBe(false);
        expect(esRutaReferencia('catalogo/pastel.png')).toBe(false);
    });
});
