import { useRef } from "react";
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
    // la seccion ya se estaba mostrando (p. ej. el visitante que se registra desde "Pedir")
    const yaMostrada = useRef(false);

    if (loading) {
        // mientras se carga el perfil tras iniciar sesion no se desmonta la navegacion:
        // si se desmontara, las pestañas volverian a "home" y se perderia el pedido elegido
        if (permitirInvitado && yaMostrada.current) return <>{children}</>;
        return <Cargando />;
    }
    if (!session && permitirInvitado) {
        yaMostrada.current = true;
        return <>{children}</>;
    }
    if (perfil?.rol !== rol) return <Redirect href="/" />;
    yaMostrada.current = true;
    return <>{children}</>;
}
