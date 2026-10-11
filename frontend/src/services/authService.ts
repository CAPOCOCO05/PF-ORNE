import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { SingInData, SingUpData } from "../types/auth.types";

// capa de acceso a Supabase Auth: los componentes y contextos no llaman a supabase directamente

export async function signUp({email, password, nombre}: SingUpData) {
    const {error} = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {nombre}
        },
    });
    return {error: error?.message ?? null};
}

export async function signIn({email, password}: SingInData) {
    const {error} = await supabase.auth.signInWithPassword({email, password});
    return {error: error?.message ?? null};
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
