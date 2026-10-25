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
    cancelado: {fondo: '#ebebeb', texto: '#5f5f5f'},
};

// acciones del admin sobre un pedido; deben coincidir con el trigger validar_cambio_pedido (F04 D2)
export interface AccionEstado {
    destino: EstadoPedido;
    titulo: string;                 // texto del boton
    pregunta: string;               // confirmacion; {folio} se reemplaza por el folio
    requiereRepartidor?: boolean;   // "Enviar a reparto" (D7)
    destructiva?: boolean;          // cancelar
}

export const ACCIONES: Record<'confirmar' | 'preparar' | 'listo' | 'reparto' | 'entregar' | 'cancelar', AccionEstado> = {
    confirmar: {destino: 'confirmado', titulo: 'Confirmar pedido', pregunta: '¿Confirmar el pedido {folio}?'},
    preparar: {destino: 'en_preparacion', titulo: 'Iniciar preparación', pregunta: '¿Iniciar la preparación del pedido {folio}?'},
    listo: {destino: 'listo', titulo: 'Marcar como listo', pregunta: '¿Marcar el pedido {folio} como listo?'},
    reparto: {destino: 'en_camino', titulo: 'Enviar a reparto', pregunta: '¿Enviar el pedido {folio} a reparto?', requiereRepartidor: true},
    entregar: {destino: 'entregado', titulo: 'Marcar como entregado', pregunta: '¿Marcar el pedido {folio} como entregado?'},
    cancelar: {destino: 'cancelado', titulo: 'Cancelar pedido', pregunta: '¿Cancelar el pedido {folio}? No se puede deshacer.', destructiva: true},
};

// chips de la lista del admin (F04 D3); los borradores nunca se muestran
export type FiltroAdmin = 'activos' | Exclude<EstadoPedido, 'borrador'>;

export const FILTROS_ADMIN: {valor: FiltroAdmin; texto: string}[] = [
    {valor: 'activos', texto: 'Activos'},
    {valor: 'pendiente', texto: 'Pendientes'},
    {valor: 'confirmado', texto: 'Confirmados'},
    {valor: 'en_preparacion', texto: 'En preparación'},
    {valor: 'listo', texto: 'Listos'},
    {valor: 'en_camino', texto: 'En camino'},
    {valor: 'entregado', texto: 'Entregados'},
    {valor: 'cancelado', texto: 'Cancelados'},
];

export const ESTADOS_ACTIVOS: EstadoPedido[] = ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino'];
