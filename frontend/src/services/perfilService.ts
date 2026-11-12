import { supabase } from "./supabase";
import { traducirErrorDatos } from "./erroresDatos";
import { DatosCliente } from "../types/pedido.types";
import { DATOS_CLIENTE_VACIOS } from "../utils/datosCliente";

// datos de contacto guardados del cliente (F07 M7, tabla datos_cliente de 013).
// RLS solo deja leer y escribir al dueño; el nombre vive en perfiles (authService)

const COLUMNAS = 'telefono, calle, numero_exterior, numero_interior, colonia, direccion_referencia, direccion_lat, direccion_lng';

interface FilaDatosCliente {
    telefono: string | null;
    calle: string | null;
    numero_exterior: string | null;
    numero_interior: string | null;
    colonia: string | null;
    direccion_referencia: string | null;
    direccion_lat: number | string | null;   // numeric llega como texto
    direccion_lng: number | string | null;
}

function desdeFila(fila: FilaDatosCliente): DatosCliente {
    const conDireccion = fila.calle !== null && fila.direccion_lat !== null && fila.direccion_lng !== null;
    return {
        telefono: fila.telefono ?? '',
        direccion: conDireccion ? {
            calle: fila.calle ?? '',
            numeroExterior: fila.numero_exterior ?? '',
            numeroInterior: fila.numero_interior ?? '',
            colonia: fila.colonia ?? '',
            referencia: fila.direccion_referencia ?? '',
            ubicacion: {latitud: Number(fila.direccion_lat), longitud: Number(fila.direccion_lng)},
        } : null,
    };
}

// sin fila (cliente nuevo sin pedidos) se devuelven datos vacios, no es un error
export async function obtenerDatosCliente(userId: string): Promise<{datos: DatosCliente | null; error: string | null}> {
    const {data, error} = await supabase
        .from('datos_cliente')
        .select(COLUMNAS)
        .eq('usuario_id', userId)
        .maybeSingle<FilaDatosCliente>();
    if (error) return {datos: null, error: traducirErrorDatos(error)};
    return {datos: data ? desdeFila(data) : DATOS_CLIENTE_VACIOS, error: null};
}

// upsert: la fila puede no existir aun. Sin direccion se vacian todas sus columnas
export async function guardarDatosCliente(userId: string, {telefono, direccion}: DatosCliente): Promise<{error: string | null}> {
    const fila = {
        usuario_id: userId,
        telefono: telefono || null,
        calle: direccion?.calle ?? null,
        numero_exterior: direccion?.numeroExterior ?? null,
        numero_interior: direccion?.numeroInterior || null,
        colonia: direccion?.colonia ?? null,
        direccion_referencia: direccion?.referencia || null,
        direccion_lat: direccion?.ubicacion.latitud ?? null,
        direccion_lng: direccion?.ubicacion.longitud ?? null,
    };
    const {error} = await supabase.from('datos_cliente').upsert(fila, {onConflict: 'usuario_id'});
    return {error: error ? traducirErrorDatos(error) : null};
}
