// simula las respuestas de la API (fetch) en las pruebas de los services

export interface RespuestaSimulada {
    status: number;
    cuerpo?: unknown;
}

export function respuestaFetch({status, cuerpo}: RespuestaSimulada) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: () => (cuerpo === undefined ? Promise.reject(new SyntaxError('sin cuerpo')) : Promise.resolve(cuerpo)),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    };
}

// cada llamada a fetch toma la siguiente respuesta de la lista (la ultima se repite)
export function simularApi(...respuestas: RespuestaSimulada[]): jest.Mock {
    const pendientes = [...respuestas];
    const mock = jest.fn(() => Promise.resolve(respuestaFetch(pendientes.length > 1 ? pendientes.shift()! : pendientes[0])));
    globalThis.fetch = mock as unknown as typeof fetch;
    return mock;
}

export function simularSinConexion(): jest.Mock {
    const mock = jest.fn(() => Promise.reject(new TypeError('Network request failed')));
    globalThis.fetch = mock as unknown as typeof fetch;
    return mock;
}

// [url, opciones] de la llamada n a fetch
export function llamadaFetch(mock: jest.Mock, n = 0): [string, RequestInit] {
    return mock.mock.calls[n] as [string, RequestInit];
}
