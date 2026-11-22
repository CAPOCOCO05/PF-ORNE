import 'dotenv/config';

// variables de entorno de la API; si falta una obligatoria la API no arranca

function obligatoria(nombre: string): string {
    const valor = process.env[nombre];
    if (!valor) {
        throw new Error(`Falta la variable de entorno ${nombre}. Copia backend/.env.example como backend/.env y llénala`);
    }
    return valor;
}

export const ENV = {
    SUPABASE_URL: obligatoria('SUPABASE_URL'),
    SUPABASE_ANON_KEY: obligatoria('SUPABASE_ANON_KEY'),
    PORT: Number(process.env.PORT ?? 3000),
} as const;
