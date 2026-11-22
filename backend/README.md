# ORNE — Backend

El backend de ORNE tiene dos partes:

1. **API propia** (`src/`): Node + Express + TypeScript con **arquitectura en capas**.
   La app le pide los datos a la API y la API aplica las reglas del negocio.
2. **Supabase** (`supabase/`): Postgres + Auth + Storage. El esquema, las políticas
   de seguridad (RLS) y los triggers están versionados como migraciones SQL.

## API en capas

```
App (frontend) ──HTTP + token──► rutas → controladores → servicios → repositorios ──► Supabase
```

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Rutas | `src/routes/` | URLs y qué rol puede entrar a cada una |
| Controladores | `src/controllers/` | Capa HTTP: lee la petición, la valida (`src/validators/`) y responde |
| Servicios | `src/services/` | Reglas del negocio: paginación, imágenes, conflictos, permisos de negocio |
| Repositorios | `src/repositories/` | Capa de datos: las consultas a Supabase (tablas, RPC y Storage) |
| Middlewares | `src/middlewares/` | Sesión (`cargarSesion`, `requiereRol`) y formato único de errores |

Cada capa solo llama a la de abajo. Otras carpetas: `config/` (variables de entorno y
cliente de Supabase), `errors/` (`ApiError`), `constants/`, `types/` y `utils/`
(funciones puras).

**Seguridad.** La app manda el token de su sesión de Supabase Auth
(`Authorization: Bearer <token>`). La API verifica el token, lee el rol de `perfiles`
y consulta Supabase **con ese mismo token**, así que las políticas RLS siguen
protegiendo los datos aunque la API tuviera un error. La API usa la llave `anon`,
nunca la `service_role`.

**Errores.** Todas las respuestas de error tienen la forma
`{ "error": "mensaje para el usuario", "codigo"?: "CODIGO", "detalles"?: { "campo": "mensaje" } }`.

### Endpoints

| Método y ruta | Rol | Qué hace | Feature |
|---|---|---|---|
| `GET /salud` | — | Comprueba que la API está arriba | — |
| `GET /catalogo?pagina&precio&panes&rellenos&tamanios&niveles&orden` | Cualquiera (con o sin cuenta) | Pasteles publicados, de 10 en 10, con filtros | F01, F07 M5, F09 |
| `GET /catalogo/:id` | Cualquiera | Un pastel publicado | F01 |
| `GET /admin/catalogo?pagina` | admin | Pasteles publicados y ocultos | F07 M4 |
| `GET /admin/catalogo/:id` | admin | Un pastel (incluye `activo`) | F07 M4 |
| `POST /admin/catalogo/imagenes` | admin | Sube una imagen (cuerpo: bytes; `Content-Type: image/jpeg|png|heic|heif`, máx. 5 MB) y devuelve su URL | F07 M4 |
| `POST /admin/catalogo` | admin | Crea un pastel (409 si el nombre se repite) | F07 M4 |
| `PUT /admin/catalogo/:id` | admin | Edita un pastel; borra la imagen anterior si cambió | F07 M4 |
| `GET /perfil` | Cualquier rol con sesión | Nombre y rol del usuario de la sesión (404 si no tiene perfil) | F00 |
| `PATCH /perfil` | Cualquier rol con sesión | Cambia el nombre (nombre y al menos un apellido) | F07 M6 |
| `GET /perfil/datos-cliente` | cliente | Teléfono y dirección guardada (vacíos si no hay) | F07 M7 |
| `PUT /perfil/datos-cliente` | cliente | Guarda teléfono y dirección (completa, con pin y dentro de la zona) o la quita (`direccion: null`) | F07 M7 |
| `GET /pedidos` | cliente | Mis pedidos (incluye borradores), del más reciente al más antiguo | F01, F03 |
| `POST /pedidos` | cliente | Crea el borrador; el total lo calcula el servidor | F01 D2 |
| `PATCH /pedidos/:id` | cliente | Actualiza el borrador (el paso 4 manda también la entrega) | F01, F02 |
| `GET /pedidos/:id/borrador` | cliente | Borrador para retomarlo en el wizard | F01 D2 |
| `GET /pedidos/:id` | cliente | Pedido completo en cualquier estado | F03 |
| `DELETE /pedidos/:id` | cliente | Elimina el borrador y su imagen | F01 D2 |
| `POST /pedidos/:id/imagen` | cliente | Sube la imagen de referencia (bytes, máx. 5 MB) y borra la anterior | F01 D9 |
| `DELETE /pedidos/:id/imagen` | cliente | Quita la imagen de referencia | F01 D9 |
| `POST /pedidos/:id/confirmar` | cliente | Confirma el pedido (folio); los errores traen `codigo` (p. ej. `FECHA_NO_DISPONIBLE`) | F03 |
| `GET /pedidos/referencias/url?ruta=` | cliente, admin | URL temporal para ver una imagen de referencia (bucket privado) | F03, F04 |
| `GET /admin/pedidos?pestania&estados&pagina` | admin | Pedidos por pestaña (`activos`, `entregado`, `cancelado`) y chips de estado, de 10 en 10 | F04, F07 M3 |
| `GET /admin/pedidos/conteos` | admin | Pedidos por estado para los chips de "Activos" | F07 M3 |
| `GET /admin/pedidos/:id` | admin | Detalle con cliente, repartidor y pago | F04 |
| `PATCH /admin/pedidos/:id/estado` | admin | Cambia el estado si la transición es válida y el pedido sigue en `estadoActual` (409 `DESACTUALIZADO` si otro admin ya lo movió) | F04, F07 M2 |
| `GET /admin/repartidores` | admin | Repartidores para asignar al enviar a reparto | F04 |

### Migración a la API (en curso)

- [x] Estructura base: Express, configuración, sesión, roles y manejo de errores
- [x] Catálogo (cliente y admin)
- [x] Perfil y datos del cliente
- [x] Pedidos del cliente
- [x] Panel del admin (pedidos y repartidores)
- [ ] Repartidor

### Correr la API

```bash
cd backend
npm install
cp .env.example .env     # llena SUPABASE_URL y SUPABASE_ANON_KEY (los mismos del frontend)
npm run dev              # http://localhost:3000 (se reinicia al guardar)
npm test                 # pruebas (no se conectan a Supabase)
npm run typecheck
```

Para probar en el celular, el teléfono y la PC deben estar en la misma red Wi-Fi y
`EXPO_PUBLIC_API_URL` del frontend debe apuntar a la IP de la PC
(`http://<IP-de-tu-PC>:3000`). Si Windows pregunta, permite a Node.js en el firewall
para redes privadas.

## Supabase: qué provee
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
| `008_entrega_y_confirmacion.sql` | Dirección y teléfono de entrega, bloques de horario, `paso_actual` 1–5, funciones de fecha mínima y zona de entrega, `calcular_precio`, `confirmar_pedido` (folio + pago en `pendiente`); el cliente ya no puede confirmar con un update directo ni insertar pagos | F02, F03 |
| `009_validar_repartidor.sql` | El trigger de transiciones solo acepta como `repartidor_id` a perfiles con rol `repartidor` | F04 |
| `010_repartidor_ve_clientes.sql` | Política para que el repartidor vea el nombre del cliente de sus entregas en camino | F06 |
| `011_no_entregado.sql` | Estado `no_entregado` con `motivo_no_entrega`, trigger y política del repartidor; función `contar_pedidos_por_estado()` | F07 M2, M3 |
| `012_catalogo_admin.sql` | El admin crea y edita pasteles del catálogo (sin borrar); nombre único; trigger que calcula `precio_base`; políticas del bucket `catalogo` | F07 M4 |
| `013_datos_cliente.sql` | Tabla `datos_cliente` (teléfono y dirección guardada) solo visible para el dueño; llenado inicial desde el último pedido; trigger que la completa al confirmar | F07 M7 |
| `014_precios_relleno.sql` | Montos confirmados de los rellenos en `calcular_precio` (Cajeta $50, Mermelada $70) y recálculo del `precio_base` del catálogo | F01 D7 |
| `015_catalogo_publico.sql` | Lectura de los pasteles activos sin sesión (rol `anon`) para explorar el catálogo sin cuenta | F09 |
| `016_estado_pago.sql` | Estado del pago solo `pendiente` / `confirmado` (se quita el pago simulado); pasa a `confirmado` cuando el admin confirma el pedido | F03, F04 |

## Pruebas de permisos

En `supabase/tests/` hay scripts que se corren completos en el **SQL Editor**: simulan
a cada rol, verifican lo que puede ver y cambiar, deshacen todos los cambios y
muestran una tabla con `OK` / `FALLA` por prueba.

| Script | Qué prueba | Feature |
|---|---|---|
| `permisos_admin.sql` | Otro cliente, el dueño y un repartidor no ven ni cambian el pedido; el admin solo avanza por transiciones válidas y `en_camino` exige repartidor | F04 |
| `permisos_datos_cliente.sql` | Solo el dueño lee y edita sus datos; otro cliente, el admin y el repartidor no; la dirección no queda a medias y la fila no se borra | F07 M7 |
| `permisos_catalogo.sql` | Cliente y repartidor no crean, editan ni suben imágenes al catálogo; el admin crea, edita y oculta (no borra), el precio lo calcula la base y el nombre no se repite; sin sesión solo se leen los pasteles publicados | F07 M4, F09 |
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
4. En **Project Settings → API**, copia la URL y la llave `anon` al `.env` de la API
   (ver [`.env.example`](.env.example)) y al del frontend
   (ver [`../frontend/.env.example`](../frontend/.env.example)).

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

## Variables de entorno

| Variable | Dónde va | Dónde se obtiene |
|---|---|---|
| `SUPABASE_URL` | `backend/.env` | Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | `backend/.env` | Project Settings → API → `anon` public key |
| `PORT` | `backend/.env` | Puerto de la API (por defecto 3000) |
| `EXPO_PUBLIC_API_URL` | `frontend/.env` | `http://<IP-de-tu-PC>:3000` |
| `EXPO_PUBLIC_SUPABASE_URL` | `frontend/.env` | Project Settings → API → Project URL (inicio de sesión) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `frontend/.env` | Project Settings → API → `anon` public key |

Nunca subas la llave `service_role` al repositorio ni a la app.
