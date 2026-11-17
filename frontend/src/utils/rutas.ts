import { Rol } from "../types/auth.types";

// pantalla de inicio de cada rol (ver specs/01-navigation.md, "Redirección inicial")
export const RUTA_POR_ROL = {
    cliente: '/home',
    admin: '/admin',
    repartidor: '/repartidor',
} as const satisfies Record<Rol, string>;

export function rutaPorRol(rol: Rol) {
    return RUTA_POR_ROL[rol];
}

// F09: pedido que un visitante quiso hacer antes de tener cuenta. Viaja como parametro
// `pedir` por login y registro: el id del pastel ("Pedir") o 'nuevo' ("Crear pedido")
export const PEDIDO_NUEVO = 'nuevo';

export type DestinoPedido =
    | '/pedido/nuevo'
    | {pathname: '/pedido/nuevo'; params: {pastel: string}};

// a donde ir al terminar login o registro: al wizard si venia de "Pedir", si no a /
export function rutaTrasAutenticar(pedir?: string): DestinoPedido | '/' {
    const valor = pedir?.trim();
    if (!valor) return '/';
    if (valor === PEDIDO_NUEVO) return '/pedido/nuevo';
    return {pathname: '/pedido/nuevo', params: {pastel: valor}};
}
