import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { Rol } from "../types/auth.types";
import Cargando from "./Cargando";

interface GuardiaRolProps {
    rol: Rol;
    permitirInvitado?: boolean; // F09: la seccion del cliente se puede explorar sin sesion
    children: React.ReactNode;
}

// guardia de navegacion de cada seccion: si el usuario no tiene el rol lo regresa a /
// (la seguridad real esta en las politicas RLS, ver specs/01-navigation.md)
export default function GuardiaRol({rol, permitirInvitado = false, children}: GuardiaRolProps) {
    const {session, perfil, loading} = useAuth();

    if (loading) return <Cargando />;
    if (!session && permitirInvitado) return <>{children}</>;
    if (perfil?.rol !== rol) return <Redirect href="/" />;
    return <>{children}</>;
}
