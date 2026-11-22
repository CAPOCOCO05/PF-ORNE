import { SupabaseClient } from '@supabase/supabase-js';
import { ErrorBaseDatos } from '../errors/ApiError';

// capa de datos de Supabase Storage (buckets de imagenes). Las politicas de 003, 006 y 012
// deciden quien puede subir, ver o borrar en cada bucket

// sube un archivo y devuelve su URL publica
export async function subirPublico(db: SupabaseClient, bucket: string, ruta: string, contenido: Buffer, mime: string): Promise<string> {
    const almacen = db.storage.from(bucket);
    const { error } = await almacen.upload(ruta, contenido, { contentType: mime });
    if (error) throw new ErrorBaseDatos(error.message);
    return almacen.getPublicUrl(ruta).data.publicUrl;
}

// sube (o reemplaza) un archivo de un bucket privado
export async function subir(db: SupabaseClient, bucket: string, ruta: string, contenido: Buffer, mime: string): Promise<void> {
    const { error } = await db.storage.from(bucket).upload(ruta, contenido, { contentType: mime, upsert: true });
    if (error) throw new ErrorBaseDatos(error.message);
}

export async function borrar(db: SupabaseClient, bucket: string, ruta: string): Promise<void> {
    await borrarVarios(db, bucket, [ruta]);
}

export async function borrarVarios(db: SupabaseClient, bucket: string, rutas: string[]): Promise<void> {
    if (rutas.length === 0) return;
    const { error } = await db.storage.from(bucket).remove(rutas);
    if (error) throw new ErrorBaseDatos(error.message);
}

// rutas completas de los archivos de una carpeta
export async function listar(db: SupabaseClient, bucket: string, carpeta: string): Promise<string[]> {
    const { data, error } = await db.storage.from(bucket).list(carpeta);
    if (error) throw new ErrorBaseDatos(error.message);
    return (data ?? []).map((archivo) => `${carpeta}/${archivo.name}`);
}

// URL temporal para ver un archivo de un bucket privado
export async function urlFirmada(db: SupabaseClient, bucket: string, ruta: string, segundos: number): Promise<string> {
    const { data, error } = await db.storage.from(bucket).createSignedUrl(ruta, segundos);
    if (error || !data) throw new ErrorBaseDatos(error?.message ?? 'sin URL firmada');
    return data.signedUrl;
}
