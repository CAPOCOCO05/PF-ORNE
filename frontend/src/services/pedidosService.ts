import { supabase } from "./supabase";
import { esErrorDeConexion, MENSAJES_DATOS, traducirErrorDatos } from "./erroresDatos";
import { calcularPrecio } from "../constants/precios";
import { extensionImagen, MENSAJES_PEDIDO, mimeImagen, normalizarMensaje } from "../utils/pedido";
import { armarDireccion, normalizarTelefono } from "../utils/entrega";
import {
    DatosEntrega, EstadoPedido, HoraBloque, Niveles, PasoPedido, PedidoCompleto, PedidoEnCurso, RellenoId,
    ResumenPedido, SaborPanId, Tamanio, TipoEntrega,
} from "../types/pedido.types";

// pedidos del cliente: borradores de F01 y lista de "Mis pedidos"

export const BUCKET_REFERENCIAS = 'referencias-pasteles';
const DURACION_URL_FIRMADA = 60 * 60; // segundos

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
    pedido_detalle: FilaDetalle | FilaDetalle[] | null;
}

// columnas de entrega de pedidos (F02 D1)
interface FilaEntrega {
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

const COLUMNAS_ENTREGA = 'tipo_entrega, calle, numero_exterior, numero_interior, colonia, direccion, direccion_referencia, '
    + 'direccion_lat, direccion_lng, telefono_contacto, fecha_entrega, hora_entrega';

function textoONulo(texto: string): string | null {
    const limpio = texto.trim();
    return limpio === '' ? null : limpio;
}

// en recoleccion se limpian la direccion y las coordenadas (D8)
export function filaEntrega(entrega: DatosEntrega): FilaEntrega {
    const domicilio = entrega.tipoEntrega === 'domicilio';
    return {
        tipo_entrega: entrega.tipoEntrega,
        calle: domicilio ? textoONulo(entrega.calle) : null,
        numero_exterior: domicilio ? textoONulo(entrega.numeroExterior) : null,
        numero_interior: domicilio ? textoONulo(entrega.numeroInterior) : null,
        colonia: domicilio ? textoONulo(entrega.colonia) : null,
        direccion: domicilio ? armarDireccion(entrega) : null,
        direccion_referencia: domicilio ? textoONulo(entrega.referencia) : null,
        direccion_lat: domicilio ? entrega.ubicacion?.latitud ?? null : null,
        direccion_lng: domicilio ? entrega.ubicacion?.longitud ?? null : null,
        telefono_contacto: textoONulo(normalizarTelefono(entrega.telefono)),
        fecha_entrega: entrega.fechaEntrega,
        hora_entrega: entrega.horaEntrega,
    };
}

// las columnas que falten (borrador de F01) quedan como en ENTREGA_VACIA
function entregaDeFila(fila: Partial<FilaEntrega>): DatosEntrega {
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

// PostgREST devuelve el detalle como objeto (relacion 1 a 1) o como arreglo
function detalleDe(fila: FilaPedido): FilaDetalle | null {
    const detalle = fila.pedido_detalle;
    return Array.isArray(detalle) ? detalle[0] ?? null : detalle;
}

interface ResultadoGuardar {
    id: string | null;          // id del borrador (aunque falle el detalle, para reintentar)
    imagenRuta: string | null;  // ruta de la imagen guardada en Storage
    error: string | null;
}

interface OpcionesGuardar {
    pasoActual: PasoPedido;      // paso en el que se retomara el borrador
    sincronizarImagen?: boolean; // solo el paso 3 sube o quita la imagen
    guardarEntrega?: boolean;    // solo el paso 4 escribe los datos de entrega (F02 D8)
}

// crea el borrador (paso 1) o lo actualiza; siempre hace upsert del detalle (D2)
export async function guardarBorrador(pedido: PedidoEnCurso, usuarioId: string, opciones: OpcionesGuardar): Promise<ResultadoGuardar> {
    const total = calcularPrecio(pedido) ?? 0;
    const encabezado = {
        total,
        paso_actual: opciones.pasoActual,
        ...(opciones.guardarEntrega ? filaEntrega(pedido.entrega) : {}),
    };
    const {id, error} = await guardarEncabezado(pedido.id, usuarioId, encabezado);
    if (error || !id) {
        return {id, imagenRuta: pedido.imagenRuta, error: error ?? MENSAJES_DATOS.GENERICO};
    }

    let imagenRuta = pedido.imagenRuta;
    if (opciones.sincronizarImagen) {
        const imagen = await sincronizarReferencia(pedido, usuarioId, id);
        if (imagen.error) return {id, imagenRuta, error: imagen.error};
        imagenRuta = imagen.ruta;
    }

    const {error: errorDetalle} = await supabase.from('pedido_detalle').upsert({
        pedido_id: id,
        tamanio: pedido.tamanio,
        niveles: pedido.niveles,
        tipo_pan: pedido.tipoPan,
        relleno: pedido.relleno,
        decoracion_texto: normalizarMensaje(pedido.mensaje),
        imagen_referencia_url: imagenRuta,
        precio_estimado: total,
    }, {onConflict: 'pedido_id'});
    if (errorDetalle) {
        return {id, imagenRuta, error: traducirErrorDatos(errorDetalle, MENSAJES_DATOS.GUARDAR_CONEXION)};
    }
    return {id, imagenRuta, error: null};
}

type Encabezado = {total: number; paso_actual: PasoPedido} & Partial<FilaEntrega>;

async function guardarEncabezado(id: string | null, usuarioId: string, encabezado: Encabezado): Promise<{id: string | null; error: string | null}> {
    if (id) {
        const {error} = await supabase.from('pedidos').update(encabezado).eq('id', id);
        return {id, error: error ? traducirErrorDatos(error, MENSAJES_DATOS.GUARDAR_CONEXION) : null};
    }
    const {data, error} = await supabase
        .from('pedidos')
        .insert({usuario_id: usuarioId, estado: 'borrador', ...encabezado})
        .select('id')
        .single<{id: string}>();
    if (error) {
        return {id: null, error: traducirErrorDatos(error, MENSAJES_DATOS.GUARDAR_CONEXION)};
    }
    return {id: data.id, error: null};
}

// sube la imagen nueva (si hay) y borra las anteriores de la carpeta del pedido (D9)
async function sincronizarReferencia(pedido: PedidoEnCurso, usuarioId: string, pedidoId: string): Promise<{ruta: string | null; error: string | null}> {
    const carpeta = `${usuarioId}/${pedidoId}`;
    if (!pedido.imagenLocal) {
        if (pedido.imagenRuta) return {ruta: pedido.imagenRuta, error: null};
        return {ruta: null, error: await limpiarCarpeta(carpeta)};
    }

    const mime = mimeImagen(pedido.imagenLocal);
    if (!mime) return {ruta: null, error: MENSAJES_PEDIDO.IMAGEN_FORMATO};

    const ruta = `${carpeta}/referencia.${extensionImagen(mime)}`;
    const error = await subirArchivo(pedido.imagenLocal.uri, ruta, mime);
    if (error) return {ruta: null, error};
    // se borra lo anterior despues de subir, para no quedarse sin imagen si falla la subida
    return {ruta, error: await limpiarCarpeta(carpeta, ruta)};
}

async function subirArchivo(uri: string, ruta: string, mime: string): Promise<string | null> {
    try {
        const respuesta = await fetch(uri);
        const contenido = await respuesta.arrayBuffer();
        const {error} = await supabase.storage
            .from(BUCKET_REFERENCIAS)
            .upload(ruta, contenido, {contentType: mime, upsert: true});
        return error ? traducirErrorDatos(error, MENSAJES_DATOS.IMAGEN) : null;
    } catch (e) {
        console.warn('subirArchivo:', e);
        return MENSAJES_DATOS.IMAGEN;
    }
}

// borra los archivos de la carpeta excepto `conservar`
async function limpiarCarpeta(carpeta: string, conservar?: string): Promise<string | null> {
    const bucket = supabase.storage.from(BUCKET_REFERENCIAS);
    const {data, error} = await bucket.list(carpeta);
    if (error) return traducirErrorDatos(error);

    const rutas = (data ?? []).map((archivo) => `${carpeta}/${archivo.name}`).filter((ruta) => ruta !== conservar);
    if (rutas.length === 0) return null;
    const {error: errorBorrar} = await bucket.remove(rutas);
    return errorBorrar ? traducirErrorDatos(errorBorrar) : null;
}

// carga un borrador para retomarlo desde "Mis pedidos" (D2)
export async function obtenerBorrador(id: string): Promise<{pedido: PedidoEnCurso | null; error: string | null}> {
    const {data, error} = await supabase
        .from('pedidos')
        .select(`id, estado, folio, total, paso_actual, created_at, ${COLUMNAS_ENTREGA}, pedido_detalle(tamanio, niveles, tipo_pan, relleno, decoracion_texto, imagen_referencia_url)`)
        .eq('id', id)
        .eq('estado', 'borrador')
        .maybeSingle<FilaPedido & Partial<FilaEntrega>>();
    if (error) return {pedido: null, error: traducirErrorDatos(error)};
    if (!data) return {pedido: null, error: null};

    const detalle = detalleDe(data);
    return {
        pedido: {
            id: data.id,
            tamanio: detalle?.tamanio ?? null,
            niveles: detalle?.niveles ?? null,
            tipoPan: detalle?.tipo_pan ?? null,
            relleno: detalle?.relleno ?? null,
            mensaje: detalle?.decoracion_texto ?? '',
            imagenLocal: null,
            imagenRuta: detalle?.imagen_referencia_url ?? null,
            entrega: entregaDeFila(data),
            pasoActual: data.paso_actual,
        },
        error: null,
    };
}

// pedido con su detalle y entrega, en cualquier estado; RLS solo deja ver los del usuario (F03)
export async function obtenerPedido(id: string): Promise<{pedido: PedidoCompleto | null; error: string | null}> {
    const {data, error} = await supabase
        .from('pedidos')
        .select(`id, estado, folio, total, paso_actual, created_at, ${COLUMNAS_ENTREGA}, pedido_detalle(tamanio, niveles, tipo_pan, relleno, decoracion_texto, imagen_referencia_url)`)
        .eq('id', id)
        .maybeSingle<FilaPedido & Partial<FilaEntrega>>();
    if (error) return {pedido: null, error: traducirErrorDatos(error)};
    if (!data) return {pedido: null, error: null};

    const detalle = detalleDe(data);
    return {
        pedido: {
            id: data.id,
            estado: data.estado,
            folio: data.folio,
            total: Number(data.total),
            creadoEn: data.created_at,
            tamanio: detalle?.tamanio ?? null,
            niveles: detalle?.niveles ?? null,
            tipoPan: detalle?.tipo_pan ?? null,
            relleno: detalle?.relleno ?? null,
            mensaje: detalle?.decoracion_texto ?? '',
            imagenRuta: detalle?.imagen_referencia_url ?? null,
            entrega: entregaDeFila(data),
        },
        error: null,
    };
}

// errores de confirmar_pedido (migracion 008): la funcion los lanza con un codigo en el mensaje (F03 D5)
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

function codigoDeError(error: {message?: string; code?: string}): CodigoConfirmacion {
    if (esErrorDeConexion(error)) return 'CONEXION';
    const codigo = CODIGOS_CONFIRMACION.find((c) => error.message?.includes(c));
    if (!codigo) console.warn('Error al confirmar sin traducir:', error.code, error.message);
    return codigo ?? 'GENERICO';
}

// pasa el borrador a 'pendiente' en el servidor: recalcula el precio, genera el folio y el pago simulado (F03 D1)
export async function confirmarPedido(id: string): Promise<ResultadoConfirmar> {
    const {data, error} = await supabase.rpc('confirmar_pedido', {p_pedido_id: id});
    if (error) {
        const codigo = codigoDeError(error);
        return {folio: null, total: null, error: {codigo, mensaje: MENSAJES_CONFIRMACION[codigo]}};
    }
    // la funcion devuelve una tabla de un renglon
    const fila = (Array.isArray(data) ? data[0] : data) as {folio: string; total: number | string} | undefined;
    if (!fila) return {folio: null, total: null, error: {codigo: 'GENERICO', mensaje: MENSAJES_CONFIRMACION.GENERICO}};
    return {folio: fila.folio, total: Number(fila.total), error: null};
}

// todos los pedidos del cliente, incluidos borradores, del mas reciente al mas antiguo
export async function listarMisPedidos(usuarioId: string): Promise<{pedidos: ResumenPedido[]; error: string | null}> {
    const {data, error} = await supabase
        .from('pedidos')
        .select('id, estado, folio, total, paso_actual, created_at, pedido_detalle(tamanio, niveles, tipo_pan, relleno)')
        .eq('usuario_id', usuarioId)
        .order('created_at', {ascending: false});
    if (error) return {pedidos: [], error: traducirErrorDatos(error)};

    const pedidos = ((data ?? []) as FilaPedido[]).map((fila): ResumenPedido => {
        const detalle = detalleDe(fila);
        return {
            id: fila.id,
            estado: fila.estado,
            folio: fila.folio,
            total: Number(fila.total),
            pasoActual: fila.paso_actual,
            creadoEn: fila.created_at,
            tamanio: detalle?.tamanio ?? null,
            niveles: detalle?.niveles ?? null,
            tipoPan: detalle?.tipo_pan ?? null,
            relleno: detalle?.relleno ?? null,
        };
    });
    return {pedidos, error: null};
}

// borra el borrador y su imagen; el detalle se borra en cascada (D2)
export async function eliminarBorrador(id: string, usuarioId: string): Promise<{error: string | null}> {
    const errorImagen = await limpiarCarpeta(`${usuarioId}/${id}`);
    if (errorImagen) return {error: errorImagen};

    const {error} = await supabase.from('pedidos').delete().eq('id', id).eq('estado', 'borrador');
    return {error: error ? traducirErrorDatos(error) : null};
}

// el bucket es privado: la imagen se muestra con una URL firmada temporal
export async function urlReferencia(ruta: string): Promise<{url: string | null; error: string | null}> {
    const {data, error} = await supabase.storage.from(BUCKET_REFERENCIAS).createSignedUrl(ruta, DURACION_URL_FIRMADA);
    if (error) return {url: null, error: traducirErrorDatos(error)};
    return {url: data.signedUrl, error: null};
}
