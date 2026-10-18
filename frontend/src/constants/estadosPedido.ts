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
