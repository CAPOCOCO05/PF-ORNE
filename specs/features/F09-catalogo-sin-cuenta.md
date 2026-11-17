# Feature F09: Catálogo sin cuenta

> Las decisiones marcadas **✅ Confirmado** fueron validadas con el equipo (2026-11-17).

## Objetivo
Que cualquier persona pueda explorar el catálogo al abrir la app, sin registrarse, y
que la cuenta se pida solo cuando quiere hacer un pedido. Al terminar el registro o el
inicio de sesión sigue con el pedido que había elegido.

## Actor
Visitante (sin sesión) y cliente.

## Flujo principal
1. El visitante abre la app → ve el **Catálogo** (no el login), con filtros y orden.
2. Presiona "Pedir" en un pastel o "Crear pedido" → se abre el **registro** con el
   mensaje "Crea tu cuenta para hacer tu pedido".
3. Crea su cuenta (o elige "Inicia sesión" si ya tiene una) → se abre el wizard con
   ese pastel precargado ("Pedir") o vacío ("Crear pedido").
4. Si no quiere registrarse, "Ver catálogo sin cuenta" lo regresa al catálogo.

## Pantallas
- **Encabezado (sin sesión):** botón "Iniciar sesión" a la derecha del logo.
- **Barra inferior (sin sesión):** las 3 pestañas del cliente. "Mis pedidos" y
  "Perfil" muestran "Inicia sesión o crea tu cuenta", un mensaje según la pantalla y
  los botones "Crear cuenta" e "Iniciar sesión" (`RequiereCuenta`).
- **Login y registro:** enlace "Ver catálogo sin cuenta"; el registro muestra el
  motivo cuando viene de "Pedir".

## Decisiones
- **D1. Inicio en el catálogo. ✅ Confirmado.** `app/index.tsx` sin sesión redirige a
  `/home` en lugar de `/login`. Al cerrar sesión también se regresa al catálogo.
- **D2. Continuar el pedido. ✅ Confirmado.** "Pedir" y "Crear pedido" envían al
  registro con el parámetro `pedir` (id del pastel o `nuevo`). Login y registro lo
  conservan entre sí y, al terminar, `rutaTrasAutenticar()` (`utils/rutas.ts`) da la
  ruta del wizard; se navega con `dismissTo` para que el login no quede en el
  historial. Si inicia sesión un admin o repartidor, la guardia lo lleva a su sección.
- **D3. Tres pestañas. ✅ Confirmado.** El visitante ve Catálogo · Mis pedidos ·
  Perfil; las dos últimas invitan a crear cuenta.
- **D4. Guardias.** `GuardiaRol` recibe `permitirInvitado` (solo la sección del
  cliente): sin sesión deja pasar; con sesión sigue exigiendo el rol. Las pantallas
  con datos (`pedidos`, `perfil`, `perfil/editar`, `pedido/[id]` y el wizard
  `pedido/nuevo`) se envuelven en `RequiereCuenta`, que no las monta sin sesión: no
  consultan nada ni se ven datos de otro usuario.
- **D5. Permiso en la base (`015_catalogo_publico.sql`).** Política `select` para el
  rol `anon` en `catalogo_pasteles`, solo `activo = true`. Las imágenes ya eran
  públicas. Pedidos, perfiles, pagos y datos del cliente no cambian (solo
  `authenticated`). La seguridad real sigue en RLS; las guardias son de navegación.
- **D6. Filtros.** Los filtros del catálogo (F07 M5) funcionan igual sin sesión.

## Casos de error
- Error al cargar el catálogo sin sesión → mismo mensaje y "Reintentar" (F05).
- El pastel elegido se ocultó mientras se registraba → el wizard muestra "Este
  pastel ya no está en el catálogo" (F01, ya existente).

## Criterios de aceptación
- [x] Sin sesión, la app abre en el catálogo y se pueden ver, filtrar y ordenar los pasteles.
- [x] "Pedir" o "Crear pedido" sin sesión llevan al registro; al registrarse o iniciar sesión se abre el pedido (con el pastel elegido).
- [x] Sin sesión, "Mis pedidos" y "Perfil" invitan a crear cuenta y no consultan datos.
- [x] Un visitante solo puede leer los pasteles publicados: no ve los ocultos, no edita el catálogo ni ve pedidos (probado en SQL).
- [x] Probar en dispositivo ✅.

## Tareas
- [x] Migración `015_catalogo_publico.sql` (D5) y casos sin sesión en `tests/permisos_catalogo.sql`.
- [x] `rutaTrasAutenticar()` y `PEDIDO_NUEVO` en `utils/rutas.ts`, con pruebas.
- [x] `GuardiaRol` con `permitirInvitado` y componente `RequiereCuenta`, con pruebas.
- [x] `app/index.tsx` (D1), `home.tsx` (D2), `login.tsx` y `register.tsx` (parámetro `pedir`), con pruebas.
- [x] `Encabezado` con "Iniciar sesión" sin sesión, con prueba de navegación.
- [x] Actualizar `00-project.md`, `01-navigation.md`, `02-data-model.md`, F00 y `backend/README.md`.
- [x] Correr `015` en Supabase.
- [x] Correr `permisos_catalogo.sql` en Supabase (casos sin sesión): todo OK.
- [x] Probar criterios de aceptación en dispositivo ✅.
