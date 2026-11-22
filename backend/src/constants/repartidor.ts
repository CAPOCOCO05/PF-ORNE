// reglas del repartidor (F06, F07 M2)

export const MAX_MOTIVO_NO_ENTREGA = 200;

export const MENSAJES_REPARTIDOR = {
    NO_ENCONTRADA: 'No encontramos esta entrega',
    YA_NO_DISPONIBLE: 'Esta entrega ya no está en camino',
    SIN_MOTIVO: 'Indica por qué no se pudo entregar',
    MOTIVO_LARGO: `Máximo ${MAX_MOTIVO_NO_ENTREGA} caracteres`,
    SIN_NOMBRE: 'Sin nombre',
} as const;
