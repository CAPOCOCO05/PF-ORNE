import { SupabaseClient } from '@supabase/supabase-js';
import { ErrorBaseDatos } from '../errors/ApiError';
import { DatosCliente, Perfil } from '../types/perfil.types';

// capa de datos del perfil: tablas perfiles (004) y datos_cliente (013).
// RLS: cada quien lee y edita su perfil (solo la columna nombre) y sus datos de contacto

const COLUMNAS_DATOS = 'telefono, calle, numero_exterior, numero_interior, colonia, direccion_referencia, direccion_lat, direccion_lng';

interface FilaDatosCliente {
    telefono: string | null;
    calle: string | null;
    numero_exterior: string | null;
    numero_interior: string | null;
    colonia: string | null;
    direccion_referencia: string | null;
    direccion_lat: number | string | null;   // numeric puede llegar como texto
    direccion_lng: number | string | null;
}

function lanzarSiError(error: { message: string; code?: string } | null): void {
    if (error) throw new ErrorBaseDatos(error.message, error.code);
}

export async function obtenerPerfil(db: SupabaseClient, usuarioId: string): Promise<Perfil | null> {
    const { data, error } = await db.from('perfiles').select('id, nombre, rol').eq('id', usuarioId).maybeSingle<Perfil>();
    lanzarSiError(error);
    return data;
}

// devuelve null si no se actualizo ninguna fila (el perfil no existe)
export async function actualizarNombre(db: SupabaseClient, usuarioId: string, nombre: string): Promise<Perfil | null> {
    const { data, error } = await db.from('perfiles').update({ nombre }).eq('id', usuarioId)
        .select('id, nombre, rol').maybeSingle<Perfil>();
    lanzarSiError(error);
    return data;
}

function datosDeFila(fila: FilaDatosCliente): DatosCliente {
    const conDireccion = fila.calle !== null && fila.direccion_lat !== null && fila.direccion_lng !== null;
    return {
        telefono: fila.telefono ?? '',
        direccion: conDireccion ? {
            calle: fila.calle ?? '',
            numeroExterior: fila.numero_exterior ?? '',
            numeroInterior: fila.numero_interior ?? '',
            colonia: fila.colonia ?? '',
            referencia: fila.direccion_referencia ?? '',
            ubicacion: { latitud: Number(fila.direccion_lat), longitud: Number(fila.direccion_lng) },
        } : null,
    };
}

// sin direccion se vacian todas sus columnas (la base exige direccion completa o nada)
function filaDeDatos(usuarioId: string, { telefono, direccion }: DatosCliente) {
    return {
        usuario_id: usuarioId,
        telefono: telefono || null,
        calle: direccion?.calle ?? null,
        numero_exterior: direccion?.numeroExterior ?? null,
        numero_interior: direccion?.numeroInterior || null,
        colonia: direccion?.colonia ?? null,
        direccion_referencia: direccion?.referencia || null,
        direccion_lat: direccion?.ubicacion.latitud ?? null,
        direccion_lng: direccion?.ubicacion.longitud ?? null,
    };
}

// null si el cliente aun no tiene fila (nuevo y sin pedidos)
export async function obtenerDatosCliente(db: SupabaseClient, usuarioId: string): Promise<DatosCliente | null> {
    const { data, error } = await db.from('datos_cliente').select(COLUMNAS_DATOS).eq('usuario_id', usuarioId)
        .maybeSingle<FilaDatosCliente>();
    lanzarSiError(error);
    return data ? datosDeFila(data) : null;
}

// upsert: la fila puede no existir aun
export async function guardarDatosCliente(db: SupabaseClient, usuarioId: string, datos: DatosCliente): Promise<void> {
    const { error } = await db.from('datos_cliente').upsert(filaDeDatos(usuarioId, datos), { onConflict: 'usuario_id' });
    lanzarSiError(error);
}
