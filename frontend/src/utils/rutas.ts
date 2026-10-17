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
