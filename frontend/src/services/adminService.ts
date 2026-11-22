import { peticionApi } from "./api";
import { MENSAJE_SIN_CONEXION, MENSAJES_DATOS } from "./erroresDatos";
import { ConteoEstados, FiltroAdmin } from "../constants/estadosPedido";
import { EstadoPedido, PedidoAdmin, PedidoAdminResumen, Repartidor } from "../types/pedido.types";

// panel admin (F04): la API (/admin) solo deja entrar al admin; filtra, pagina y valida
// los cambios de estado. RLS y el trigger de la base lo vuelven a comprobar

export const MENSAJES_ADMIN = {
    ACTUALIZAR: 'No se pudo actualizar el pedido, inténtalo de nuevo',
    ACTUALIZADO: 'El pedido fue actualizado',
    SIN_REPARTIDORES: 'No hay repartidores disponibles',
} as const;

interface PaginaAdmin {
    pedidos: PedidoAdminResumen[];
    hayMas: boolean;
    error: string | null;
}

// pagina empieza en 0; la API decide estados y orden segun la pestaña y los chips (D3, D4)
export async function listarPedidosAdmin(filtro: FiltroAdmin, pagina: number): Promise<PaginaAdmin> {
    const {data, error} = await peticionApi<{pedidos: PedidoAdminResumen[]; hayMas: boolean}>('/admin/pedidos', {
        query: {pestania: filtro.pestania, estados: filtro.estados, pagina},
    });
    if (error || !data) return {pedidos: [], hayMas: false, error: error ?? MENSAJES_DATOS.GENERICO};
    return {pedidos: data.pedidos, hayMas: data.hayMas, error: null};
}

// pedidos por estado para los chips de "Activos" (F07 M3 D2)
export async function contarPorEstado(): Promise<{conteos: ConteoEstados | null; error: string | null}> {
    const {data, error} = await peticionApi<{conteos: ConteoEstados}>('/admin/pedidos/conteos');
    if (error || !data) return {conteos: null, error: error ?? MENSAJES_DATOS.GENERICO};
    return {conteos: data.conteos, error: null};
}

// detalle completo: pastel, entrega, cliente, pago y repartidor (D5); null si no existe
export async function obtenerPedidoAdmin(id: string): Promise<{pedido: PedidoAdmin | null; error: string | null}> {
    const {data, error, status} = await peticionApi<{pedido: PedidoAdmin}>(`/admin/pedidos/${id}`);
    if (status === 404) return {pedido: null, error: null};
    if (error || !data) return {pedido: null, error};
    return {pedido: data.pedido, error: null};
}

export type ResultadoCambio = 'ok' | 'desactualizado' | 'error';

interface CambioEstado {
    id: string;
    estadoActual: EstadoPedido;     // el que se esta mostrando (D6)
    destino: EstadoPedido;
    repartidorId?: string;          // solo al enviar a reparto (D7)
    quitarRepartidor?: boolean;     // al reprogramar una entrega fallida (F07 M2): lo decide la API
}

// la API solo aplica el cambio si el pedido sigue en el estado mostrado; si otro admin ya
// lo movio responde DESACTUALIZADO (D6)
export async function cambiarEstado({id, estadoActual, destino, repartidorId}: CambioEstado): Promise<{resultado: ResultadoCambio; error: string | null}> {
    const {error, status, codigo} = await peticionApi(`/admin/pedidos/${id}/estado`, {
        metodo: 'PATCH',
        cuerpo: {estadoActual, destino, repartidorId: repartidorId ?? null},
    });
    if (!error) return {resultado: 'ok', error: null};
    if (codigo === 'DESACTUALIZADO') return {resultado: 'desactualizado', error: MENSAJES_ADMIN.ACTUALIZADO};
    console.warn('cambiarEstado:', status, error);
    return {resultado: 'error', error: status === 0 ? MENSAJE_SIN_CONEXION : MENSAJES_ADMIN.ACTUALIZAR};
}

export async function listarRepartidores(): Promise<{repartidores: Repartidor[]; error: string | null}> {
    const {data, error} = await peticionApi<{repartidores: Repartidor[]}>('/admin/repartidores');
    if (error || !data) return {repartidores: [], error: error ?? MENSAJES_DATOS.GENERICO};
    return {repartidores: data.repartidores, error: null};
}
