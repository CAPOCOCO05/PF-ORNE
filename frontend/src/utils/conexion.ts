import type { NetworkState } from "expo-network";

// F10 A8: sin conexion solo cuando el sistema lo confirma (false); mientras el estado
// aun no se conoce (undefined) no se muestra el aviso para no "parpadear" al abrir la app
export function estaSinConexion(estado: NetworkState | null | undefined): boolean {
    return estado?.isConnected === false || estado?.isInternetReachable === false;
}
