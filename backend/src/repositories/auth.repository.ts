import { SupabaseClient } from '@supabase/supabase-js';
import { ErrorBaseDatos } from '../errors/ApiError';
import { Rol, UsuarioSesion } from '../types/auth.types';

// usuario dueño del token y su rol (tabla perfiles, nunca los metadatos del usuario, F00).
// null si el token no es valido o expiro
export async function obtenerUsuarioSesion(db: SupabaseClient, token: string): Promise<UsuarioSesion | null> {
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) return null;

    const { data: rol, error: errorRol } = await db.rpc('mi_rol');
    if (errorRol) throw new ErrorBaseDatos(errorRol.message, errorRol.code);
    return { id: data.user.id, rol: (rol as Rol | null) ?? null };
}
