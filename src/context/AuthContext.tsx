import { Session, User } from "@supabase/supabase-js";
import { SingInData, SingUpData } from "../types/auth.types";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";


interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    singUp: (data: SingUpData) => Promise<{error: string | null}>;
    singIn: (data: SingInData) => Promise<{error: string | null}>;
    singOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined); // se mantiene undefined para que no se pueda usar fuera del provider

export function AuthProvider({children}: {children: React.ReactNode}){ // proveer el contexto de autenticacion
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        // hay sesion activa
        supabase.auth.getSession().then(({data: {session}}) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // cambios en el estado de autenticacion
        const {data: {subscription}} = supabase.auth.onAuthStateChange((event, sesion) => {
        setSession(sesion);
        setUser(sesion?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const singUp = async({email, password, nombre}: SingUpData) => {
        const {error} = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {nombre}
            },
        });
        return {error: error?.message ?? null};
    };

    const singIn = async({email, password}: SingInData) => {
        const {error} = await supabase.auth.signInWithPassword({email, password});
        return {error: error?.message ?? null};
    };

    const singOut = async() => {
        await supabase.auth.signOut();
    };

    return(
        <AuthContext.Provider value={{user, session, loading, singUp, singIn, singOut}}>
            {children} 
        </AuthContext.Provider>
    );
    
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth debe ser usado dentro de un AuthProvider");
    }
    return context;
}
