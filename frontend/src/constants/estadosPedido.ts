import { EstadoPedido } from "../types/pedido.types";

// texto que ve el usuario para cada estado (ver 02-data-model.md, "Estados del pedido")
export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
    borrador: 'Borrador',
    pendiente: 'Pendiente',
    confirmado: 'Confirmado',
    en_preparacion: 'En preparación',
    listo: 'Listo',
    en_camino: 'En camino',
    entregado: 'Entregado',
    no_entregado: 'No entregado',
    cancelado: 'Cancelado',
};

// color de la etiqueta de cada estado en el panel admin (F04 D2)
export const COLOR_ESTADO: Record<EstadoPedido, {fondo: string; texto: string}> = {
    borrador: {fondo: '#ffdadd', texto: '#5b0e17'},
    pendiente: {fondo: '#fff1c7', texto: '#7a5600'},
    confirmado: {fondo: '#dceafe', texto: '#1d4f91'},
    en_preparacion: {fondo: '#ece2fb', texto: '#5b3a8c'},
    listo: {fondo: '#d8f3ea', texto: '#13684f'},
    en_camino: {fondo: '#ffe3cf', texto: '#9a4a10'},
    entregado: {fondo: '#e0f2dc', texto: '#2e6b2a'},
    no_entregado: {fondo: '#fde2e1', texto: '#a50e16'},
    cancelado: {fondo: '#ebebeb', texto: '#5f5f5f'},
};

// acciones del admin sobre un pedido; deben coincidir con el trigger validar_cambio_pedido (F04 D2)
export interface AccionEstado {
    destino: EstadoPedido;
    titulo: string;                 // texto del boton
    pregunta: string;               // confirmacion; {folio} se reemplaza por el folio
    requiereRepartidor?: boolean;   // "Enviar a reparto" (D7)
    quitaRepartidor?: boolean;      // "Reprogramar entrega" (F07 M2)
    destructiva?: boolean;          // cancelar
}

export const ACCIONES: Record<'confirmar' | 'preparar' | 'listo' | 'reparto' | 'entregar' | 'reprogramar' | 'cancelar', AccionEstado> = {
    confirmar: {destino: 'confirmado', titulo: 'Confirmar pedido', pregunta: '¿Confirmar el pedido {folio}?'},
    preparar: {destino: 'en_preparacion', titulo: 'Iniciar preparación', pregunta: '¿Iniciar la preparación del pedido {folio}?'},
    listo: {destino: 'listo', titulo: 'Marcar como listo', pregunta: '¿Marcar el pedido {folio} como listo?'},
    reparto: {destino: 'en_camino', titulo: 'Enviar a reparto', pregunta: '¿Enviar el pedido {folio} a reparto?', requiereRepartidor: true},
    entregar: {destino: 'entregado', titulo: 'Marcar como entregado', pregunta: '¿Marcar el pedido {folio} como entregado?'},
    reprogramar: {destino: 'listo', titulo: 'Reprogramar entrega', pregunta: '¿Reprogramar la entrega del pedido {folio}? Regresará a "Listo" para enviarlo de nuevo a reparto.', quitaRepartidor: true},
    cancelar: {destino: 'cancelado', titulo: 'Cancelar pedido', pregunta: '¿Cancelar el pedido {folio}? No se puede deshacer.', destructiva: true},
};

// no_entregado es activo: espera que el admin reprograme o cancele (F07 M2)
export const ESTADOS_ACTIVOS = ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'no_entregado'] as const;
export type EstadoActivo = typeof ESTADOS_ACTIVOS[number];

// lista del admin (F04 D3, F07 M3): pestaña y, dentro de "Activos", los estados
// marcados (ninguno = todos los activos); los borradores nunca se muestran
export type PestaniaAdmin = 'activos' | 'entregado' | 'cancelado';

export interface FiltroAdmin {
    pestania: PestaniaAdmin;
    estados: EstadoActivo[];
}

export const FILTRO_ADMIN_INICIAL: FiltroAdmin = {pestania: 'activos', estados: []};

export const PESTANIAS_ADMIN: {valor: PestaniaAdmin; texto: string}[] = [
    {valor: 'activos', texto: 'Activos'},
    {valor: 'entregado', texto: 'Entregados'},
    {valor: 'cancelado', texto: 'Cancelados'},
];

export const CHIPS_ACTIVOS: {valor: EstadoActivo; texto: string}[] = [
    {valor: 'pendiente', texto: 'Pendientes'},
    {valor: 'confirmado', texto: 'Confirmados'},
    {valor: 'en_preparacion', texto: 'En preparación'},
    {valor: 'listo', texto: 'Listos'},
    {valor: 'en_camino', texto: 'En camino'},
    {valor: 'no_entregado', texto: 'No entregados'},
];

// pedidos por estado para los contadores de los chips (M3 D2)
export type ConteoEstados = Record<Exclude<EstadoPedido, 'borrador'>, number>;

// motivos que elige el repartidor al no poder entregar (F07 M2); "Otro" pide escribirlo
export const MOTIVOS_NO_ENTREGA = [
    'Nadie recibió el pedido',
    'Dirección incorrecta o no encontrada',
    'El cliente rechazó el pedido',
] as const;
export const MOTIVO_OTRO = 'Otro';
export const MAX_MOTIVO_NO_ENTREGA = 200;
