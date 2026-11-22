import { SupabaseClient } from '@supabase/supabase-js';
import { EXTENSION_POR_MIME } from '../constants/catalogo';
import { BUCKET_REFERENCIAS, DURACION_URL_FIRMADA, ERRORES_CONFIRMACION, MENSAJES_PEDIDO } from '../constants/pedido';
import { ApiError, ErrorBaseDatos } from '../errors/ApiError';
import * as pedidosRepo from '../repositories/pedidos.repository';
import * as storageRepo from '../repositories/storage.repository';
import { Borrador, Confirmacion, DatosBorrador, PedidoCompleto, ResumenPedido } from '../types/pedido.types';
import { calcularPrecio, carpetaReferencia, codigoConfirmacion } from '../utils/pedido';

// capa de negocio de los pedidos del cliente (F01 D2, D9; F02 D8; F03). No conoce HTTP

export function listarMisPedidos(db: SupabaseClient, usuarioId: string): Promise<ResumenPedido[]> {
    return pedidosRepo.listarDelUsuario(db, usuarioId);
}

export async function obtenerPedido(db: SupabaseClient, id: string): Promise<PedidoCompleto> {
    const pedido = await pedidosRepo.obtenerCompleto(db, id);
    if (!pedido) throw ApiError.noEncontrado(MENSAJES_PEDIDO.NO_ENCONTRADO);
    return pedido;
}

export async function obtenerBorrador(db: SupabaseClient, id: string): Promise<Borrador> {
    const borrador = await pedidosRepo.obtenerBorrador(db, id);
    if (!borrador) throw ApiError.noEncontrado(MENSAJES_PEDIDO.BORRADOR_NO_DISPONIBLE);
    return borrador;
}

// el total lo calcula el servidor (no se confia en el que mande la app); confirmar_pedido lo recalcula
function encabezado(datos: DatosBorrador, total: number): pedidosRepo.EncabezadoBorrador {
    return {
        total,
        paso_actual: datos.pasoActual,
        ...(datos.entrega ? pedidosRepo.filaDeEntrega(datos.entrega) : {}),
    };
}

function detalle(datos: DatosBorrador, total: number): pedidosRepo.FilaDetalleBorrador {
    return {
        tamanio: datos.tamanio,
        niveles: datos.niveles,
        tipo_pan: datos.tipoPan,
        relleno: datos.relleno,
        decoracion_texto: datos.mensaje,
        precio_estimado: total,
    };
}

// crea el borrador (id null) o lo actualiza, y siempre guarda su detalle (D2). Devuelve el id
export async function guardarBorrador(db: SupabaseClient, usuarioId: string, id: string | null, datos: DatosBorrador): Promise<string> {
    const total = calcularPrecio(datos.tamanio, datos.niveles, datos.relleno);
    let pedidoId = id;
    if (pedidoId) {
        const actualizado = await pedidosRepo.actualizarBorrador(db, pedidoId, encabezado(datos, total));
        if (!actualizado) throw ApiError.noEncontrado(MENSAJES_PEDIDO.BORRADOR_NO_DISPONIBLE);
    } else {
        pedidoId = await pedidosRepo.insertarBorrador(db, usuarioId, encabezado(datos, total));
    }
    await pedidosRepo.guardarDetalle(db, pedidoId, detalle(datos, total));
    return pedidoId;
}

// borra los archivos de la carpeta del pedido excepto `conservar`
async function limpiarCarpeta(db: SupabaseClient, carpeta: string, conservar?: string): Promise<void> {
    const rutas = await storageRepo.listar(db, BUCKET_REFERENCIAS, carpeta);
    await storageRepo.borrarVarios(db, BUCKET_REFERENCIAS, rutas.filter((ruta) => ruta !== conservar));
}

// sube la imagen de referencia y borra las anteriores despues, para no quedarse sin imagen si
// falla la subida (D9). Devuelve la ruta guardada en el detalle
export async function subirImagen(db: SupabaseClient, usuarioId: string, pedidoId: string, mime: string, contenido: Buffer): Promise<string> {
    const extension = EXTENSION_POR_MIME[mime];
    if (!extension) throw ApiError.solicitudInvalida(MENSAJES_PEDIDO.IMAGEN_FORMATO);
    if (!contenido.length) throw ApiError.solicitudInvalida(MENSAJES_PEDIDO.IMAGEN_VACIA);
    await obtenerBorrador(db, pedidoId);

    const carpeta = carpetaReferencia(usuarioId, pedidoId);
    const ruta = `${carpeta}/referencia.${extension}`;
    try {
        await storageRepo.subir(db, BUCKET_REFERENCIAS, ruta, contenido, mime);
        await limpiarCarpeta(db, carpeta, ruta);
    } catch (error) {
        console.warn('subirImagen (referencia):', error instanceof Error ? error.message : error);
        throw new ApiError(502, MENSAJES_PEDIDO.IMAGEN);
    }
    await pedidosRepo.actualizarImagen(db, pedidoId, ruta);
    return ruta;
}

// quita la imagen de referencia del borrador
export async function quitarImagen(db: SupabaseClient, usuarioId: string, pedidoId: string): Promise<void> {
    await obtenerBorrador(db, pedidoId);
    await limpiarCarpeta(db, carpetaReferencia(usuarioId, pedidoId));
    await pedidosRepo.actualizarImagen(db, pedidoId, null);
}

// borra la imagen y despues el borrador; el detalle se borra en cascada (D2)
export async function eliminarBorrador(db: SupabaseClient, usuarioId: string, id: string): Promise<void> {
    await obtenerBorrador(db, id);
    await limpiarCarpeta(db, carpetaReferencia(usuarioId, id));
    const eliminado = await pedidosRepo.eliminarBorrador(db, id);
    if (!eliminado) throw ApiError.noEncontrado(MENSAJES_PEDIDO.BORRADOR_NO_DISPONIBLE);
}

// los errores de confirmar_pedido llegan con su codigo para que la app decida (F03 D5)
export async function confirmarPedido(db: SupabaseClient, id: string): Promise<Confirmacion> {
    try {
        const confirmacion = await pedidosRepo.confirmar(db, id);
        if (!confirmacion) throw new ApiError(500, 'confirmar_pedido no devolvió el folio');
        return confirmacion;
    } catch (error) {
        const codigo = error instanceof ErrorBaseDatos ? codigoConfirmacion(error.message) : null;
        if (!codigo) throw error;
        const { status, mensaje } = ERRORES_CONFIRMACION[codigo];
        throw new ApiError(status, mensaje, undefined, codigo);
    }
}

// el bucket es privado: la imagen se muestra con una URL firmada temporal. Storage (006) solo la
// firma para el dueño o el admin
export async function urlReferencia(db: SupabaseClient, ruta: string): Promise<string> {
    try {
        return await storageRepo.urlFirmada(db, BUCKET_REFERENCIAS, ruta, DURACION_URL_FIRMADA);
    } catch (error) {
        console.warn('urlReferencia:', error instanceof Error ? error.message : error);
        throw ApiError.noEncontrado(MENSAJES_PEDIDO.IMAGEN_NO_DISPONIBLE);
    }
}
