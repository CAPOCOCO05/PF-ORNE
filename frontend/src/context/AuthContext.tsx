import { Session, User } from "@supabase/supabase-js";
import { SingInData, SingUpData } from "../types/auth.types";
import { createContext, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService";


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
        authService.getSession().then((session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // cambios en el estado de autenticacion
        return authService.onAuthChange((sesion) => {
            setSession(sesion);
            setUser(sesion?.user ?? null);
        });
    }, []);

    const singUp = (data: SingUpData) => authService.signUp(data);

    const singIn = (data: SingInData) => authService.signIn(data);

    const singOut = () => authService.signOut();

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
