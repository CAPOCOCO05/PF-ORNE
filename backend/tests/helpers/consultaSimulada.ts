// simula una consulta encadenada de supabase-js (from().select().eq()...): cada metodo
// devuelve la misma consulta y al esperarla (o con single/maybeSingle) resuelve `respuesta`

const METODOS_CADENA = ['select', 'insert', 'update', 'eq', 'in', 'gt', 'lte', 'order', 'range'] as const;

type MetodoCadena = typeof METODOS_CADENA[number];

export type ConsultaSimulada = Record<MetodoCadena | 'single' | 'maybeSingle', jest.Mock> & PromiseLike<unknown>;

export function consultaSimulada(respuesta: { data?: unknown; error: unknown }): ConsultaSimulada {
    const resuelta = Promise.resolve(respuesta);
    const consulta: Partial<Record<string, unknown>> = {
        then: resuelta.then.bind(resuelta),
        single: jest.fn().mockResolvedValue(respuesta),
        maybeSingle: jest.fn().mockResolvedValue(respuesta),
    };
    for (const metodo of METODOS_CADENA) {
        consulta[metodo] = jest.fn(() => consulta);
    }
    return consulta as unknown as ConsultaSimulada;
}
