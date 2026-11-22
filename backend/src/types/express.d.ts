import type { SupabaseClient } from '@supabase/supabase-js';
import type { UsuarioSesion } from './auth.types';

// datos que el middleware de autenticacion agrega a cada peticion
declare global {
    namespace Express {
        interface Request {
            db: SupabaseClient;          // cliente de Supabase con el token del usuario (o visitante)
            usuario?: UsuarioSesion;      // solo si mando un token valido
        }
    }
}
