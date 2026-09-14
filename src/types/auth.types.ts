import { Session, User } from "@supabase/supabase-js";

export interface AuthUser {
    user: User | null;
    session: Session | null;
    loading: boolean;
}

export interface SingUpData {
    email: string;
    password: string;
    nombre: string;
}

export interface SingInData {
    email: string;
    password: string;
}