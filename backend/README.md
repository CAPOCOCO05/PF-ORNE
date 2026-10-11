# ORNE — Backend (Supabase)

El backend de ORNE usa **Supabase** (backend-as-a-service): Postgres + Auth +
Storage. No hay un servidor propio; el backend lo componen el **esquema de la
base de datos, las políticas de seguridad (RLS) y la configuración de Storage**,
versionados como migraciones SQL en esta carpeta.

## Qué provee
| Servicio | Uso en ORNE |
|---|---|
| Auth | Registro e inicio de sesión con correo y contraseña (F00) |
| Postgres | Tablas `pedidos`, `pedido_detalle`, `pagos` |
| RLS | Cada usuario solo ve y crea sus propios pedidos, detalles y pagos |
| Storage | Bucket `referencias-pasteles` para imágenes de referencia |

## Migraciones

Se aplican **en orden**:

| Archivo | Contenido |
|---|---|
| `supabase/migrations/001_tablas_iniciales.sql` | Tablas `pedidos`, `pedido_detalle`, `pagos` |
| `supabase/migrations/002_rls_policies.sql` | Activa RLS y crea políticas por usuario |
| `supabase/migrations/003_storage_bucket.sql` | Bucket `referencias-pasteles` (por ahora creado a mano desde el Dashboard) |

## Cómo montar el backend

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Abre **SQL Editor** y ejecuta cada migración en el orden de la tabla.
   - Alternativa con la CLI: `supabase link --project-ref <ref>` y luego
     `supabase db push`.
3. En **Storage**, crea el bucket `referencias-pasteles` (ver `003`).
4. En **Project Settings → API**, copia la URL y la llave `anon` al `.env` del
   frontend (ver [`../frontend/.env.example`](../frontend/.env.example)).

## Variables que necesita el frontend

| Variable | Dónde se obtiene |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → `anon` public key |

Nunca subas la llave `service_role` al repositorio ni a la app.

## Documentación relacionada
- Modelo de datos: [`../specs/02-data-model.md`](../specs/02-data-model.md)
