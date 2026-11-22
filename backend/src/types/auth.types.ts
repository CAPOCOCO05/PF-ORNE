// roles de la tabla perfiles (004, 007)
export type Rol = 'cliente' | 'admin' | 'repartidor';

export interface UsuarioSesion {
    id: string;
    rol: Rol | null;
}
