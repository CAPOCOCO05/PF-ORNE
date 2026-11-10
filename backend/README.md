# ORNE — Backend (Supabase)

El backend de ORNE usa **Supabase** (backend-as-a-service): Postgres + Auth +
Storage. No hay un servidor propio; el backend lo componen el **esquema de la
base de datos, las políticas de seguridad (RLS) y la configuración de Storage**,
versionados como migraciones SQL en esta carpeta.

## Qué provee
| Servicio | Uso en ORNE |
|---|---|
| Auth | Registro e inicio de sesión con correo y contraseña (F00) |
| Postgres | Tablas `perfiles`, `catalogo_pasteles`, `pedidos`, `pedido_detalle`, `pagos` |
| RLS + triggers | Permisos por rol (cliente, admin, repartidor) y validación del ciclo de estados |
| Storage | Bucket privado `referencias-pasteles` (imágenes del cliente) y público `catalogo` |

## Migraciones

Se aplican **en orden**:

| Archivo | Contenido | Feature |
|---|---|---|
| `001_tablas_iniciales.sql` | Tablas `pedidos`, `pedido_detalle`, `pagos` | — |
| `002_rls_policies.sql` | Activa RLS y crea políticas por usuario | — |
| `003_storage_bucket.sql` | Nota del bucket creado a mano (lo formaliza `006`) | — |
| `004_perfiles_roles.sql` | Tabla `perfiles`, trigger que crea el perfil `cliente` al registrarse, función `mi_rol()` | F00 |
| `005_catalogo.sql` | Tabla `catalogo_pasteles`, 12 pasteles de prueba, bucket público `catalogo` | F01 |
| `006_ajustes_borrador.sql` | Columnas nullable para borradores, `paso_actual`, `tamanio`, RLS de edición de borradores, bucket `referencias-pasteles` con políticas | F01 |
| `007_estados_y_roles.sql` | `repartidor_id`, `check` de estados, RLS de admin y repartidor, trigger que valida las transiciones de estado | F04, F06 |
| `008_entrega_y_confirmacion.sql` | Dirección y teléfono de entrega, bloques de horario, `paso_actual` 1–5, funciones de fecha mínima y zona de entrega, `calcular_precio`, `confirmar_pedido` (folio + pago simulado); el cliente ya no puede confirmar con un update directo ni insertar pagos | F02, F03 |
| `009_validar_repartidor.sql` | El trigger de transiciones solo acepta como `repartidor_id` a perfiles con rol `repartidor` | F04 |
| `010_repartidor_ve_clientes.sql` | Política para que el repartidor vea el nombre del cliente de sus entregas en camino | F06 |
| `011_no_entregado.sql` | Estado `no_entregado` con `motivo_no_entrega`, trigger y política del repartidor; función `contar_pedidos_por_estado()` | F07 M2, M3 |

## Pruebas de permisos

En `supabase/tests/` hay scripts que se corren completos en el **SQL Editor**: simulan
a cada rol, verifican lo que puede ver y cambiar, deshacen todos los cambios y
muestran una tabla con `OK` / `FALLA` por prueba.

| Script | Qué prueba | Feature |
|---|---|---|
| `permisos_admin.sql` | Otro cliente, el dueño y un repartidor no ven ni cambian el pedido; el admin solo avanza por transiciones válidas y `en_camino` exige repartidor | F04 |
| `permisos_repartidor.sql` | El repartidor ve solo su entrega (detalle y nombre del cliente, sin pagos), no ve ni cambia pedidos ajenos y solo puede pasar `en_camino → entregado` | F06 |

El modelo completo, el ciclo de estados y los permisos por rol están en
[`../specs/02-data-model.md`](../specs/02-data-model.md).

## Cómo montar el backend

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Abre **SQL Editor** y ejecuta cada migración en el orden de la tabla.
   - Alternativa con la CLI: `supabase link --project-ref <ref>` y luego
     `supabase db push`.
3. En **Authentication → Sign In / Providers → Email**, desactiva *Confirm email*
   mientras desarrollas (así el registro inicia sesión de inmediato).
4. En **Project Settings → API**, copia la URL y la llave `anon` al `.env` del
   frontend (ver [`../frontend/.env.example`](../frontend/.env.example)).

## Asignar roles

Todo usuario que se registra desde la app es `cliente`. Para crear un admin o un
repartidor, regístralo normalmente y luego, en el **SQL Editor**:

```sql
update perfiles set rol = 'admin'
where id = (select id from auth.users where email = 'admin@ejemplo.com');

update perfiles set rol = 'repartidor'
where id = (select id from auth.users where email = 'repartidor@ejemplo.com');
```

Desde la app nadie puede cambiar su propio rol (la columna `rol` no tiene permiso de
escritura para los usuarios).

## Variables que necesita el frontend

| Variable | Dónde se obtiene |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → `anon` public key |

Nunca subas la llave `service_role` al repositorio ni a la app.
