import { RellenoId, Tamanio } from '../types/catalogo.types';
import { HoraBloque, PasoPedido, TipoEntrega } from '../types/pedido.types';

// reglas del pedido (F01 D7–D9, F02, F03)

// montos en MXN; deben coincidir con calcular_precio (014_precios_relleno.sql)
export const PRECIO_BASE: Record<Tamanio, number> = { '10': 350, '15': 500, '20': 650, '30': 900 };
export const COSTO_NIVEL_EXTRA = 250;
export const COSTO_RELLENO: Record<RellenoId, number> = {
    cajeta: 50,
    mermeladafresa: 70,
    cremapastelera: 30,
    chocolate: 40,
    mantequillademani: 50,
};

export const PASOS: PasoPedido[] = [1, 2, 3, 4, 5];
export const TIPOS_ENTREGA: TipoEntrega[] = ['domicilio', 'recoleccion'];
export const HORAS_BLOQUE: HoraBloque[] = ['10:00', '12:00', '14:00', '16:00'];

// mensaje de decoracion: se cuentan caracteres visibles (un emoji = 1) (D8)
export const MAX_MENSAJE = 500;

// imagen de referencia del cliente (D9): bucket privado, una carpeta por pedido
export const BUCKET_REFERENCIAS = 'referencias-pasteles';
export const DURACION_URL_FIRMADA = 60 * 60; // segundos

export const MENSAJES_PEDIDO = {
    NO_ENCONTRADO: 'No encontramos este pedido',
    BORRADOR_NO_DISPONIBLE: 'Este pedido ya no está disponible',
    MENSAJE_LARGO: `Máximo ${MAX_MENSAJE} caracteres`,
    FECHA: 'Fecha no válida',
    IMAGEN: 'No se pudo subir la imagen, inténtalo de nuevo',
    IMAGEN_FORMATO: 'Solo se aceptan archivos de imagen',
    IMAGEN_VACIA: 'No se recibió ninguna imagen',
    IMAGEN_NO_DISPONIBLE: 'No se pudo cargar la imagen',
} as const;

// errores que lanza confirmar_pedido (008) con el codigo en el mensaje (F03 D5)
export const ERRORES_CONFIRMACION = {
    PEDIDO_NO_ENCONTRADO: { status: 404, mensaje: 'Este pedido ya no está disponible' },
    PEDIDO_YA_CONFIRMADO: { status: 409, mensaje: 'Este pedido ya fue confirmado' },
    PEDIDO_INCOMPLETO: { status: 409, mensaje: 'Faltan datos de tu pedido' },
    FECHA_NO_DISPONIBLE: { status: 409, mensaje: 'La fecha de entrega ya no está disponible, elige otra' },
    FUERA_DE_ZONA: { status: 409, mensaje: 'Esta dirección está fuera de nuestra zona de entrega' },
} as const;

export type CodigoConfirmacion = keyof typeof ERRORES_CONFIRMACION;
