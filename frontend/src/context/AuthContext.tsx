import { Session, User } from "@supabase/supabase-js";
import { Perfil, SignInData, SignUpData } from "../types/auth.types";
import { createContext, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService";
import { MENSAJE_SIN_CONEXION } from "../services/erroresDatos";

export const ERROR_SIN_PERFIL = "No se pudo cargar tu cuenta, inicia sesión de nuevo";
export const ERROR_CONEXION = MENSAJE_SIN_CONEXION;

interface AuthContextType {
    user: User | null;
    session: Session | null;
    perfil: Perfil | null;
    loading: boolean;
    authError: string | null;
    signUp: (data: SignUpData) => Promise<{error: string | null; requiereConfirmacion: boolean}>;
    signIn: (data: SignInData) => Promise<{error: string | null}>;
    signOut: () => Promise<void>;
    reintentarPerfil: () => void;
    actualizarNombre: (nombre: string) => Promise<{error: string | null}>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined); // se mantiene undefined para que no se pueda usar fuera del provider

export function AuthProvider({children}: {children: React.ReactNode}){ // proveer el contexto de autenticacion
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [sessionLoading, setSessionLoading] = useState<boolean>(true);
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [perfilCargadoPara, setPerfilCargadoPara] = useState<string | null>(null); // id del usuario cuyo perfil ya se consulto
    const [authError, setAuthError] = useState<string | null>(null);
    const [intentoPerfil, setIntentoPerfil] = useState<number>(0);

    useEffect(() => {
        // hay sesion activa
        authService.getSession().then((session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setSessionLoading(false);
        });

        // cambios en el estado de autenticacion
        // (el perfil se carga en otro efecto: Supabase no recomienda llamar a otros
        // metodos de supabase dentro de este callback)
        return authService.onAuthChange((sesion) => {
            setSession(sesion);
            setUser(sesion?.user ?? null);
        });
    }, []);

    const userId = user?.id ?? null;

    // cargar el perfil (rol) cada vez que cambia el usuario
    useEffect(() => {
        if (!userId) {
            setPerfil(null);
            setPerfilCargadoPara(null);
            return;
        }

        let cancelado = false; // evita aplicar una respuesta vieja si el usuario cambio
        authService.getPerfil(userId).then(({perfil, error}) => {
            if (cancelado) return;
            if (error) {
                console.warn("getPerfil:", error);
                setAuthError(ERROR_CONEXION);
            } else if (!perfil) {
                // caso extremo: sesion sin perfil → se cierra la sesion (F00)
                setAuthError(ERROR_SIN_PERFIL);
                authService.signOut();
            } else {
                setAuthError(null);
            }
            setPerfil(perfil);
            setPerfilCargadoPara(userId);
        });
        return () => { cancelado = true; };
    }, [userId, intentoPerfil]);

    const signUp = async (data: SignUpData) => {
        setAuthError(null);
        return authService.signUp(data);
    };

    const signIn = async (data: SignInData) => {
        setAuthError(null);
        return authService.signIn(data);
    };

    const signOut = () => {
        setAuthError(null); // que el login no muestre un aviso viejo (p. ej. de conexion)
        return authService.signOut();
    };

    // guarda el nombre completo y lo refleja en el perfil sin volver a consultarlo (F07 M6)
    const actualizarNombre = async (nombre: string) => {
        if (!userId) return {error: ERROR_SIN_PERFIL};
        const {error} = await authService.actualizarNombre(userId, nombre);
        if (!error) setPerfil((actual) => actual ? {...actual, nombre} : actual);
        return {error};
    };

    const reintentarPerfil = () => {
        setPerfilCargadoPara(null);
        setIntentoPerfil((n) => n + 1);
    };

    // cargando mientras no se conozca la sesion o el perfil del usuario actual
    // (se deriva para no tener un render con sesion pero sin perfil)
    const loading = sessionLoading || (userId !== null && perfilCargadoPara !== userId);

    return(
        <AuthContext.Provider value={{user, session, perfil, loading, authError, signUp, signIn, signOut, reintentarPerfil, actualizarNombre}}>
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
