import { peticionApi } from "./api";
import { DatosCliente } from "../types/pedido.types";

// datos de contacto guardados del cliente (F07 M7). La API (/perfil/datos-cliente) los lee y
// guarda para el usuario de la sesion; el nombre vive en perfiles (authService)

// sin datos guardados (cliente nuevo sin pedidos) la API responde datos vacios, no un error
export async function obtenerDatosCliente(): Promise<{datos: DatosCliente | null; error: string | null}> {
    const {data, error} = await peticionApi<{datos: DatosCliente}>('/perfil/datos-cliente');
    if (error || !data) return {datos: null, error};
    return {datos: data.datos, error: null};
}

// sin direccion la API vacia todas sus columnas
export async function guardarDatosCliente(datos: DatosCliente): Promise<{error: string | null}> {
    const {error} = await peticionApi('/perfil/datos-cliente', {metodo: 'PUT', cuerpo: datos});
    return {error};
}
