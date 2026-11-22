import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from './env';

// Cliente de Supabase por peticion. Se usa la clave anon con el token del usuario:
// la base ve al usuario real (auth.uid(), mi_rol()) y las politicas RLS siguen
// protegiendo los datos aunque la API tuviera un error. Sin token, es un visitante.
export function crearClienteSupabase(token?: string): SupabaseClient {
    return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    });
}
