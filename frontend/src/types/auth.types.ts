import { Session, User } from "@supabase/supabase-js";

export interface AuthUser {
    user: User | null;
    session: Session | null;
    loading: boolean;
}

export interface SignUpData {
    email: string;
    password: string;
    nombre: string;
}

export interface SignInData {
    email: string;
    password: string;
}

export type Rol = 'cliente' | 'admin' | 'repartidor';

export interface Perfil {
    id: string;
    nombre: string;
    rol: Rol;
}
