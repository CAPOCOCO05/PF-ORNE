# Feature F11: Arquitectura en capas (API propia)

> Pedido del profesor: separar el back del front. Hasta F10 la app consultaba Supabase
> directamente (tablas, funciones y Storage) y `backend/` solo tenía las migraciones SQL.
> Ahora la app le pide todo a una API propia en `backend/src/`, organizada en capas.
> No cambia lo que ve el usuario ni el esquema de la base (sin migraciones nuevas).

## Antes y después

| | Antes (F00–F10) | Ahora (F11) |
|---|---|---|
| Datos (tablas, RPC) | La app con `supabase-js` | La API |
| Imágenes (Storage) | La app sube y borra | La app manda los bytes a la API; la API sube y borra |
| Reglas de negocio | En la app (precio, filtros, transiciones, validaciones) y en la base | En la API y en la base; la app solo valida para ayudar al usuario |
| Inicio de sesión | Supabase Auth en la app | Igual (Supabase Auth en la app) |
| `backend/` | Migraciones SQL | API (`src/`, `tests/`) + migraciones SQL (`supabase/`) |

## Decisiones

- **D1. Capas en vez de MVC.** Las vistas ya son las pantallas de React Native en
  `frontend/`; un MVC en el backend dejaría la "V" vacía. La API separa tres
  responsabilidades, y cada capa solo llama a la de abajo:

  ```
  App ──HTTP + token──► rutas → controladores → servicios → repositorios ──► Supabase
  ```

  | Capa | Carpeta | Responsabilidad |
  |---|---|---|
  | Rutas | `src/routes/` | URL y rol que puede entrar |
  | Controladores | `src/controllers/` (+ `src/validators/`) | Leer y validar la petición, responder |
  | Servicios | `src/services/` | Reglas del negocio |
  | Repositorios | `src/repositories/` | Consultas a Supabase (tablas, RPC, Storage) |
  | Middlewares | `src/middlewares/` | Sesión, roles y formato de errores |

- **D2. Tecnología.** Node + Express 5 + TypeScript, con Jest y supertest para las
  pruebas, igual que el frontend. La API corre en la PC (`npm run dev`) y el celular la
  encuentra con `EXPO_PUBLIC_API_URL=http://<IP-de-la-PC>:3000` en la misma red Wi-Fi.

- **D3. Seguridad: el token del usuario llega hasta la base.** La app manda el token de
  su sesión de Supabase Auth (`Authorization: Bearer`). La API lo verifica, lee el rol
  de `perfiles` (`mi_rol()`) y consulta Supabase **con ese mismo token** y la llave
  `anon`. Las políticas RLS y los triggers siguen protegiendo los datos aunque la API
  tuviera un error. La API nunca usa la llave `service_role`.

- **D4. El usuario es siempre el de la sesión.** Las funciones de la app ya no reciben
  el id del usuario (`getPerfil()`, `obtenerDatosCliente()`, `guardarBorrador(pedido,
  opciones)`, `listarMisPedidos()`…): la API usa el del token y nadie puede pedir los
  datos de otra persona.

- **D5. Formato único de errores.** `{ error, codigo?, detalles? }`: `error` es el
  mensaje para el usuario, `codigo` permite a la app decidir qué hacer
  (`FECHA_NO_DISPONIBLE` al confirmar, `DESACTUALIZADO` si otro usuario ya movió el
  pedido) y `detalles` trae el error de cada campo de un formulario. Sin internet la
  app sigue mostrando los mensajes de conexión de F05 / F10 A7.

- **D6. Reglas que ahora valida el servidor** (antes solo la app): opciones del pastel
  y niveles según el tamaño, mensaje de 500 caracteres (un emoji = 1), nombre
  completo, teléfono de 10 dígitos, dirección completa dentro de la zona de entrega,
  formato de fecha y bloque de horario, transiciones de estado del admin, repartidor
  obligatorio al enviar a reparto y motivo de "no entregado". El **total del borrador
  lo calcula la API**; ya no se acepta el que mande la app.

- **D7. Imágenes por la API.** La app lee la imagen elegida y manda sus bytes
  (`Content-Type: image/jpeg|png|heic|heif`, máx. 5 MB). La API la sube a Storage y
  borra la que queda sin usar (catálogo: F07 M4 D4; referencia del pedido: F01 D9).
  La imagen privada de referencia se ve con una URL temporal que firma la API.

- **D8. Las funciones de la app no cambian de nombre ni de resultado.** Cada
  `services/*Service.ts` del frontend conserva sus funciones, pero por dentro llama a
  la API con `services/api.ts`. Hooks, contextos y pantallas casi no cambiaron.

## Endpoints

La tabla completa (método, ruta, rol y feature) está en
[`backend/README.md`](../../backend/README.md#endpoints). Resumen por módulo:

| Módulo | Rutas | Rol |
|---|---|---|
| Catálogo | `/catalogo`, `/admin/catalogo` | Cualquiera / admin |
| Perfil | `/perfil`, `/perfil/datos-cliente` | Con sesión / cliente |
| Pedidos | `/pedidos` | Cliente (la URL de la imagen, también admin) |
| Panel admin | `/admin/pedidos`, `/admin/repartidores` | Admin |
| Repartidor | `/repartidor/entregas` | Repartidor |

## Criterios de aceptación

- [x] La app no consulta tablas, funciones ni Storage de Supabase; solo usa Supabase
      Auth para la sesión.
- [x] Cada ruta exige su rol (401 sin sesión, 403 con otro rol).
- [x] Los datos inválidos se rechazan en la API con el error de cada campo.
- [x] Las pantallas se comportan igual que antes (pruebas del frontend sin cambios de
      comportamiento).
- [x] Probado en el dispositivo con los tres roles.

## Plan de implementación (checklist)

- [x] Estructura base: Express, configuración (`.env`), cliente de Supabase por
      petición, sesión y roles (`cargarSesion`, `requiereRol`), manejo de errores.
- [x] Cliente HTTP del frontend (`services/api.ts`) y `EXPO_PUBLIC_API_URL`.
- [x] Catálogo (cliente y admin, con imágenes).
- [x] Perfil y datos del cliente.
- [x] Pedidos del cliente (borrador, imagen de referencia, confirmar, mis pedidos, detalle).
- [x] Panel del admin (lista, conteos, detalle, cambio de estado, repartidores).
- [x] Repartidor (entregas, entregado, no entregado).
- [x] Pruebas de la API por módulo (supertest con la capa de datos simulada) y pruebas
      de los services del frontend contra la API simulada.
- [x] Quitar del frontend la lógica que pasó al backend (filtros del admin, conversión
      de filas, nombres de archivo de imágenes).
- [x] Documentar en `backend/README.md`, `README.md` y specs.
- [x] Probar en el dispositivo con los tres roles.
