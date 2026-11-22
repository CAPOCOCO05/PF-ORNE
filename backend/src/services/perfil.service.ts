import { SupabaseClient } from '@supabase/supabase-js';
import { MENSAJES_PERFIL } from '../constants/perfil';
import { ApiError } from '../errors/ApiError';
import * as perfilRepo from '../repositories/perfil.repository';
import { DatosCliente, Perfil } from '../types/perfil.types';

// capa de negocio del perfil (F00, F07 M6 y M7)

export const DATOS_CLIENTE_VACIOS: DatosCliente = { telefono: '', direccion: null };

// el rol se lee de la tabla perfiles, nunca de los metadatos del usuario (F00)
export async function obtenerPerfil(db: SupabaseClient, usuarioId: string): Promise<Perfil> {
    const perfil = await perfilRepo.obtenerPerfil(db, usuarioId);
    if (!perfil) throw ApiError.noEncontrado(MENSAJES_PERFIL.NO_ENCONTRADO);
    return perfil;
}

// se espera el nombre ya validado y normalizado (perfil.validator)
export async function actualizarNombre(db: SupabaseClient, usuarioId: string, nombre: string): Promise<Perfil> {
    const perfil = await perfilRepo.actualizarNombre(db, usuarioId, nombre);
    if (!perfil) throw ApiError.noEncontrado(MENSAJES_PERFIL.NO_ENCONTRADO);
    return perfil;
}

// sin fila (cliente nuevo sin pedidos) se devuelven datos vacios, no es un error
export async function obtenerDatosCliente(db: SupabaseClient, usuarioId: string): Promise<DatosCliente> {
    return (await perfilRepo.obtenerDatosCliente(db, usuarioId)) ?? DATOS_CLIENTE_VACIOS;
}

export async function guardarDatosCliente(db: SupabaseClient, usuarioId: string, datos: DatosCliente): Promise<DatosCliente> {
    await perfilRepo.guardarDatosCliente(db, usuarioId, datos);
    return datos;
}
