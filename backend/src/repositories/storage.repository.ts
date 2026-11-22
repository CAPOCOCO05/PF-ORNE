import { SupabaseClient } from '@supabase/supabase-js';
import { ErrorBaseDatos } from '../errors/ApiError';

// capa de datos de Supabase Storage (buckets de imagenes). Las politicas de 003 y 012
// deciden quien puede subir o borrar en cada bucket

// sube un archivo y devuelve su URL publica
export async function subirPublico(db: SupabaseClient, bucket: string, ruta: string, contenido: Buffer, mime: string): Promise<string> {
    const almacen = db.storage.from(bucket);
    const { error } = await almacen.upload(ruta, contenido, { contentType: mime });
    if (error) throw new ErrorBaseDatos(error.message);
    return almacen.getPublicUrl(ruta).data.publicUrl;
}

export async function borrar(db: SupabaseClient, bucket: string, ruta: string): Promise<void> {
    const { error } = await db.storage.from(bucket).remove([ruta]);
    if (error) throw new ErrorBaseDatos(error.message);
}
