import { peticionApi } from "./api";
import { MENSAJES_DATOS, mensajeDeExcepcion } from "./erroresDatos";
import { MENSAJES_PEDIDO, mimeImagen } from "../utils/pedido";
import {
    DatosEntrega, EstadoPedido, HoraBloque, ImagenLocal, Niveles, PasoPedido, PedidoCompleto, PedidoEnCurso, RellenoId,
    ResumenPedido, SaborPanId, Tamanio, TipoEntrega,
} from "../types/pedido.types";

// pedidos del cliente: borradores de F01, "Mis pedidos", detalle y confirmacion (F03).
// Los datos los guarda la API (backend/src/.../pedidos), que calcula el total y maneja las imagenes

interface ResultadoGuardar {
    id: string | null;          // id del borrador (aunque falle la imagen, para reintentar)
    imagenRuta: string | null;  // ruta de la imagen guardada en Storage
    error: string | null;
}

interface OpcionesGuardar {
    pasoActual: PasoPedido;      // paso en el que se retomara el borrador
    sincronizarImagen?: boolean; // solo el paso 3 sube o quita la imagen
    guardarEntrega?: boolean;    // solo el paso 4 escribe los datos de entrega (F02 D8)
}

function cuerpoBorrador(pedido: PedidoEnCurso, opciones: OpcionesGuardar) {
    return {
        pasoActual: opciones.pasoActual,
        tamanio: pedido.tamanio,
        niveles: pedido.niveles,
        tipoPan: pedido.tipoPan,
        relleno: pedido.relleno,
        mensaje: pedido.mensaje,
        entrega: opciones.guardarEntrega ? pedido.entrega : null,
    };
}

// crea el borrador (paso 1) o lo actualiza; la API siempre guarda tambien el detalle (D2)
export async function guardarBorrador(pedido: PedidoEnCurso, opciones: OpcionesGuardar): Promise<ResultadoGuardar> {
    const {data, error} = await peticionApi<{id: string}>(pedido.id ? `/pedidos/${pedido.id}` : '/pedidos', {
        metodo: pedido.id ? 'PATCH' : 'POST',
        cuerpo: cuerpoBorrador(pedido, opciones),
        mensajeConexion: MENSAJES_DATOS.GUARDAR_CONEXION,
    });
    if (error || !data) return {id: pedido.id, imagenRuta: pedido.imagenRuta, error: error ?? MENSAJES_DATOS.GENERICO};
    if (!opciones.sincronizarImagen) return {id: data.id, imagenRuta: pedido.imagenRuta, error: null};

    const imagen = await sincronizarReferencia(pedido, data.id);
    return {id: data.id, imagenRuta: imagen.error ? pedido.imagenRuta : imagen.ruta, error: imagen.error};
}

// imagen nueva: se sube; sin imagen nueva ni guardada: se quita; si no, se conserva (D9)
async function sincronizarReferencia(pedido: PedidoEnCurso, pedidoId: string): Promise<{ruta: string | null; error: string | null}> {
    if (pedido.imagenLocal) return subirReferencia(pedido.imagenLocal, pedidoId);
    if (pedido.imagenRuta) return {ruta: pedido.imagenRuta, error: null};
    const {error} = await peticionApi(`/pedidos/${pedidoId}/imagen`, {metodo: 'DELETE'});
    return {ruta: null, error};
}

async function subirReferencia(imagen: ImagenLocal, pedidoId: string): Promise<{ruta: string | null; error: string | null}> {
    const mime = mimeImagen(imagen);
    if (!mime) return {ruta: null, error: MENSAJES_PEDIDO.IMAGEN_FORMATO};
    let contenido: ArrayBuffer;
    try {
        contenido = await (await fetch(imagen.uri)).arrayBuffer();
    } catch (e) {
        console.warn('subirReferencia: no se pudo leer la imagen', e);
        return {ruta: null, error: mensajeDeExcepcion(e, MENSAJES_DATOS.IMAGEN)};
    }
    const {data, error} = await peticionApi<{ruta: string}>(`/pedidos/${pedidoId}/imagen`, {metodo: 'POST', archivo: {contenido, mime}});
    if (error || !data) return {ruta: null, error: error ?? MENSAJES_DATOS.IMAGEN};
    return {ruta: data.ruta, error: null};
}

// carga un borrador para retomarlo desde "Mis pedidos" (D2); null si ya no existe
export async function obtenerBorrador(id: string): Promise<{pedido: PedidoEnCurso | null; error: string | null}> {
    const {data, error, status} = await peticionApi<{pedido: Omit<PedidoEnCurso, 'imagenLocal'>}>(`/pedidos/${id}/borrador`);
    if (status === 404) return {pedido: null, error: null};
    if (error || !data) return {pedido: null, error};
    return {pedido: {...data.pedido, imagenLocal: null}, error: null};
}

// pedido con su detalle y entrega, en cualquier estado; null si no existe o no es del usuario (F03)
export async function obtenerPedido(id: string): Promise<{pedido: PedidoCompleto | null; error: string | null}> {
    const {data, error, status} = await peticionApi<{pedido: PedidoCompleto}>(`/pedidos/${id}`);
    if (status === 404) return {pedido: null, error: null};
    if (error || !data) return {pedido: null, error};
    return {pedido: data.pedido, error: null};
}

// errores de confirmar_pedido (migracion 008): la API los manda con su codigo (F03 D5)
const CODIGOS_CONFIRMACION = ['PEDIDO_NO_ENCONTRADO', 'PEDIDO_YA_CONFIRMADO', 'PEDIDO_INCOMPLETO', 'FECHA_NO_DISPONIBLE', 'FUERA_DE_ZONA'] as const;

export type CodigoConfirmacion = typeof CODIGOS_CONFIRMACION[number] | 'CONEXION' | 'GENERICO';

export const MENSAJES_CONFIRMACION: Record<CodigoConfirmacion, string> = {
    CONEXION: 'Error de conexión. Tu pedido no se ha enviado. Inténtalo de nuevo.',
    FECHA_NO_DISPONIBLE: 'La fecha de entrega ya no está disponible, elige otra',
    PEDIDO_INCOMPLETO: 'Faltan datos de tu pedido',
    FUERA_DE_ZONA: 'Esta dirección está fuera de nuestra zona de entrega',
    PEDIDO_YA_CONFIRMADO: 'Este pedido ya fue confirmado',
    PEDIDO_NO_ENCONTRADO: 'Este pedido ya no está disponible',
    GENERICO: MENSAJES_DATOS.GENERICO,
};

interface ResultadoConfirmar {
    folio: string | null;
    total: number | null;
    error: {codigo: CodigoConfirmacion; mensaje: string} | null;
}

function codigoDe(status: number, codigo: string | undefined): CodigoConfirmacion {
    if (status === 0) return 'CONEXION';
    return CODIGOS_CONFIRMACION.find((c) => c === codigo) ?? 'GENERICO';
}

// pasa el borrador a 'pendiente' en el servidor: recalcula el precio, genera el folio y el pago en 'pendiente' (F03 D1)
export async function confirmarPedido(id: string): Promise<ResultadoConfirmar> {
    const {data, error, status, codigo} = await peticionApi<{folio: string; total: number}>(`/pedidos/${id}/confirmar`, {metodo: 'POST'});
    if (error || !data) {
        const codigoError = codigoDe(status, codigo);
        return {folio: null, total: null, error: {codigo: codigoError, mensaje: MENSAJES_CONFIRMACION[codigoError]}};
    }
    return {folio: data.folio, total: data.total, error: null};
}

// todos los pedidos del cliente, incluidos borradores, del mas reciente al mas antiguo
export async function listarMisPedidos(): Promise<{pedidos: ResumenPedido[]; error: string | null}> {
    const {data, error} = await peticionApi<{pedidos: ResumenPedido[]}>('/pedidos');
    if (error || !data) return {pedidos: [], error: error ?? MENSAJES_DATOS.GENERICO};
    return {pedidos: data.pedidos, error: null};
}

// borra el borrador y su imagen (D2)
export async function eliminarBorrador(id: string): Promise<{error: string | null}> {
    const {error} = await peticionApi(`/pedidos/${id}`, {metodo: 'DELETE'});
    return {error};
}

// el bucket es privado: la API devuelve una URL firmada temporal
export async function urlReferencia(ruta: string): Promise<{url: string | null; error: string | null}> {
    const {data, error} = await peticionApi<{url: string}>('/pedidos/referencias/url', {query: {ruta}});
    if (error || !data) return {url: null, error};
    return {url: data.url, error: null};
}

// ---------------------------------------------------------------------------
// TEMPORAL: conversion de filas que aun usan adminService y repartidorService mientras
// consultan Supabase directamente. Se quita al migrar esos modulos a la API

interface FilaDetalle {
    tamanio: Tamanio | null;
    niveles: Niveles | null;
    tipo_pan: SaborPanId | null;
    relleno: RellenoId | null;
    decoracion_texto?: string | null;
    imagen_referencia_url?: string | null;
}

interface FilaPedido {
    id: string;
    estado: EstadoPedido;
    folio: string | null;
    total: number;
    paso_actual: PasoPedido;
    created_at: string;
    motivo_no_entrega?: string | null;
    pedido_detalle: FilaDetalle | FilaDetalle[] | null;
}

export interface FilaEntrega {
    tipo_entrega: TipoEntrega | null;
    calle: string | null;
    numero_exterior: string | null;
    numero_interior: string | null;
    colonia: string | null;
    direccion: string | null;
    direccion_referencia: string | null;
    direccion_lat: number | string | null;
    direccion_lng: number | string | null;
    telefono_contacto: string | null;
    fecha_entrega: string | null;
    hora_entrega: string | null;   // tipo time: llega como '10:00:00'
}

export const COLUMNAS_ENTREGA ='tipo_entrega, calle, numero_exterior, numero_interior, colonia, direccion, direccion_referencia, '
    + 'direccion_lat, direccion_lng, telefono_contacto, fecha_entrega, hora_entrega';

export function entregaDeFila(fila: Partial<FilaEntrega>): DatosEntrega {
    const tieneUbicacion = fila.direccion_lat != null && fila.direccion_lng != null;
    return {
        tipoEntrega: fila.tipo_entrega ?? null,
        calle: fila.calle ?? '',
        numeroExterior: fila.numero_exterior ?? '',
        numeroInterior: fila.numero_interior ?? '',
        colonia: fila.colonia ?? '',
        referencia: fila.direccion_referencia ?? '',
        telefono: fila.telefono_contacto ?? '',
        ubicacion: tieneUbicacion ? {latitud: Number(fila.direccion_lat), longitud: Number(fila.direccion_lng)} : null,
        fechaEntrega: fila.fecha_entrega ?? null,
        horaEntrega: fila.hora_entrega ? fila.hora_entrega.slice(0, 5) as HoraBloque : null,
    };
}

export const COLUMNAS_PEDIDO_COMPLETO = `id, estado, folio, total, paso_actual, created_at, motivo_no_entrega, ${COLUMNAS_ENTREGA}, `
    + 'pedido_detalle(tamanio, niveles, tipo_pan, relleno, decoracion_texto, imagen_referencia_url)';

export type FilaPedidoCompleto = FilaPedido & Partial<FilaEntrega>;

export function pedidoCompletoDeFila(fila: FilaPedidoCompleto): PedidoCompleto {
    const detalle = Array.isArray(fila.pedido_detalle) ? fila.pedido_detalle[0] ?? null : fila.pedido_detalle;
    return {
        id: fila.id,
        estado: fila.estado,
        folio: fila.folio,
        total: Number(fila.total),
        creadoEn: fila.created_at,
        tamanio: detalle?.tamanio ?? null,
        niveles: detalle?.niveles ?? null,
        tipoPan: detalle?.tipo_pan ?? null,
        relleno: detalle?.relleno ?? null,
        mensaje: detalle?.decoracion_texto ?? '',
        imagenRuta: detalle?.imagen_referencia_url ?? null,
        entrega: entregaDeFila(fila),
        motivoNoEntrega: fila.motivo_no_entrega ?? null,
    };
}
