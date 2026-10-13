import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { traducirErrorAuth } from "./authErrors";
import { Perfil, SignInData, SignUpData } from "../types/auth.types";

// capa de acceso a Supabase Auth: los componentes y contextos no llaman a supabase directamente

// requiereConfirmacion: true si Supabase tiene activada la confirmacion de correo
// (la cuenta se crea, pero no hay sesion hasta confirmar)
export async function signUp({email, password, nombre}: SignUpData): Promise<{error: string | null; requiereConfirmacion: boolean}> {
    const {data, error} = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {nombre}
        },
    });
    if (error) {
        return {error: traducirErrorAuth(error), requiereConfirmacion: false};
    }
    return {error: null, requiereConfirmacion: data.session === null};
}

export async function signIn({email, password}: SignInData) {
    const {error} = await supabase.auth.signInWithPassword({email, password});
    return {error: error ? traducirErrorAuth(error) : null};
}

export async function signOut() {
    await supabase.auth.signOut();
}

export async function getSession() {
    const {data: {session}} = await supabase.auth.getSession();
    return session;
}

export function onAuthChange(callback: (session: Session | null) => void) {
    const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session);
    });
    return () => subscription.unsubscribe();
}

// el rol se lee de la tabla perfiles, nunca de los metadatos del usuario (F00)
export async function getPerfil(userId: string): Promise<{perfil: Perfil | null; error: string | null}> {
    const {data, error} = await supabase
        .from('perfiles')
        .select('id, nombre, rol')
        .eq('id', userId)
        .maybeSingle<Perfil>();
    if (error) {
        return {perfil: null, error: error.message};
    }
    return {perfil: data, error: null};
}
