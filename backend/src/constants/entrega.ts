// reglas de entrega (F02 D5, D6; F10 A6). Las mismas usa la base (008, 013)

export interface Coordenadas {
    latitud: number;
    longitud: number;
}

// sucursal unica; las mismas coordenadas usa distancia_sucursal_km() en la migracion 008
export const SUCURSAL_COORDENADAS: Coordenadas = { latitud: 31.782259, longitud: -116.5956174 };

// entrega a domicilio gratis dentro de este radio
export const RADIO_ENTREGA_KM = 15;

export const MAX_CAMPO_DIRECCION = 100;     // calle, colonia
export const MAX_NUMERO = 20;               // numero exterior e interior
export const MAX_REFERENCIA = 200;

export const MENSAJES_ENTREGA = {
    OBLIGATORIO: 'Este campo es obligatorio',
    TELEFONO: 'Ingresa un teléfono de 10 dígitos',
    NUMERO_EXTERIOR: 'Escribe un número válido (ej. 123 o 123-B) o S/N',
    UBICACION: 'Fija tu ubicación en el mapa',
    FUERA_DE_ZONA: 'Esta dirección está fuera de nuestra zona de entrega; puedes elegir recolección en sucursal',
    TEXTO_LARGO: 'El texto es demasiado largo',
} as const;
