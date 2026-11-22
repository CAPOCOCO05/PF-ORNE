import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { traducirErrorAuth } from "./authErrors";
import { MENSAJES_DATOS } from "./erroresDatos";
import { peticionApi } from "./api";
import { Perfil, SignInData, SignUpData } from "../types/auth.types";

// sesion con Supabase Auth (registro, login, sesion) y perfil por medio de la API.
// Los componentes y contextos no llaman a supabase directamente

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

// el rol se lee de la tabla perfiles, nunca de los metadatos del usuario (F00). La API
// responde el perfil del usuario de la sesion; 404 = la sesion no tiene perfil
export async function getPerfil(): Promise<{perfil: Perfil | null; error: string | null}> {
    const {data, error, status} = await peticionApi<{perfil: Perfil}>('/perfil');
    if (status === 404) return {perfil: null, error: null};
    if (error || !data) return {perfil: null, error: error ?? MENSAJES_DATOS.GENERICO};
    return {perfil: data.perfil, error: null};
}

// el usuario solo puede actualizar el nombre de su propio perfil (004); F07 M6 D1.
// La API vuelve a validar y normalizar el nombre (validarNombreCompleto / normalizarNombre)
export async function actualizarNombre(nombre: string): Promise<{error: string | null}> {
    const {error} = await peticionApi('/perfil', {metodo: 'PATCH', cuerpo: {nombre}});
    return {error};
}
