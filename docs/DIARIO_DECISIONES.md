# Diario de decisiones — ORNE

Decisiones técnicas importantes del proyecto, del 23 de octubre al 21 de noviembre de 2026. Cada entrada explica el contexto, las opciones que se consideraron y por qué se eligió una.

La mayoría de estas decisiones salió de las conversaciones con la IA registradas en [BITACORA_IA.md](BITACORA_IA.md). El detalle técnico de cada una está en la spec indicada, dentro de [specs/](../specs/).

| # | Decisión | Spec |
|---|---|---|
| 1 | Desarrollo guiado por specs con criterios de aceptación | [00-project.md](../specs/00-project.md) |
| 2 | Supabase (Postgres + RLS) como base de datos y autenticación | [02-data-model.md](../specs/02-data-model.md) |
| 3 | Diálogos propios en lugar de las alertas del sistema | F07 (M1) |
| 4 | Estado `no_entregado` con motivo | F07 (M2) |
| 5 | Barra de pestañas inferior en lugar de menú lateral | F08 |
| 6 | Catálogo visible sin cuenta | F09 |
| 7 | CLABE ficticia calculada a partir del id del pedido | F10 |
| 8 | Pago solo `pendiente` o `confirmado` | [02-data-model.md](../specs/02-data-model.md) |
| 9 | Arquitectura en capas con API propia | F11 |

---

### Decisión #1 — Desarrollo guiado por specs con criterios de aceptación
**Fecha:** desde el inicio del proyecto (septiembre 2026)

**Contexto:** El proyecto se desarrolló en muchas sesiones con un asistente de IA, que no recuerda lo que se hizo en sesiones anteriores. Hacía falta una forma de retomar el trabajo y de saber cuándo una función estaba terminada.

**Opciones consideradas:**
- Programar sin plan escrito y revisar el código en cada sesión.
- Specs por feature (F00–F11) con decisiones, criterios de aceptación y checklist. ✅

**Decisión:** Cada feature tiene su archivo en `specs/features/`. La IA presenta un plan y espera confirmación antes de escribir código (regla de `AGENTS.md`). Una feature solo se marca completa cuando sus criterios se prueban en el celular y, si aplica, en Supabase.

**Consecuencias:** Cada sesión puede empezar con "analiza en qué nos quedamos". Quedó un historial claro de qué se decidió y por qué. Requiere mantener las specs actualizadas.

---

### Decisión #2 — Supabase (Postgres + RLS) como base de datos y autenticación
**Fecha:** 06/09/2026

**Contexto:** La app necesitaba usuarios con tres roles (cliente, admin y repartidor), base de datos y almacenamiento de imágenes.

**Opciones consideradas:**
- Montar y administrar una base de datos propia.
- Supabase: Postgres, autenticación y Storage ya integrados. ✅

**Decisión:** Supabase, con las tablas y permisos definidos en migraciones SQL (`backend/supabase/migrations/`). Los permisos por rol se controlan con Row Level Security (RLS) y se verifican con scripts de prueba (`backend/supabase/tests/`).

**Consecuencias:** La seguridad vive en la base de datos y no depende solo de la app. Cada pantalla nueva puede necesitar políticas nuevas; por ejemplo, la migración 010 permitió al repartidor ver el nombre del cliente. Las migraciones se aplican a mano en el SQL Editor.

---

### Decisión #3 — Diálogos propios en lugar de las alertas del sistema
**Fecha:** 05/11/2026

**Contexto:** Las confirmaciones y errores usaban `Alert.alert`, que se ve distinto en Android e iOS y no sigue el estilo de ORNE.

**Opciones consideradas:**
- Mantener `Alert.alert`.
- Instalar una librería de diálogos.
- Un diálogo propio con el `Modal` de React Native y un hook `useDialogo()`. ✅

**Decisión:** Diálogo propio con la paleta de la app. Las pantallas lo usan con `await confirmar(...)`, así que no fue necesario reestructurar su lógica. Se reemplazaron las 17 llamadas a `Alert.alert`.

**Consecuencias:** Aspecto uniforme en ambos sistemas y sin dependencias nuevas. Las demás mejoras de F07 reutilizan este diálogo.

---

### Decisión #4 — Estado `no_entregado` con motivo
**Fecha:** 05/11/2026

**Contexto:** El repartidor podía llevar un pedido y no entregarlo (nadie lo recibe, dirección incorrecta, el cliente lo rechaza). Solo existía la opción de marcarlo como entregado.

**Opciones consideradas:**
- Usar el estado "cancelado" directamente.
- Un estado nuevo `no_entregado`, con motivo obligatorio, para que el admin decida qué hacer. ✅

**Decisión:** El repartidor marca "No se pudo entregar" y elige un motivo (o escribe uno de máximo 200 caracteres). El admin decide si se reprograma (regresa a "listo") o se cancela. Migración 011.

**Consecuencias:** No se pierde un pedido que podía reprogramarse, y queda registrado por qué falló la entrega.

---

### Decisión #5 — Barra de pestañas inferior en lugar de menú lateral
**Fecha:** 17/11/2026

**Contexto:** La navegación usaba un menú lateral, poco visible y menos común en apps móviles actuales.

**Opciones consideradas:**
- Mantener el menú lateral.
- Pestañas inferiores por rol, visibles todo el tiempo. ✅

**Decisión:** Cada rol tiene sus pestañas (Cliente: Catálogo · Mis pedidos · Perfil; Admin: Pedidos · Catálogo · Perfil; Repartidor: Mis entregas · Perfil). La barra se ve también dentro del pedido y en los detalles. "Cerrar sesión" pasó a Perfil.

**Consecuencias:** Navegación más directa. La implementación inicial ocultaba pantallas con `href: null` y rompió la apertura del pedido; se detectó al probar en el celular y se corrigió (ver bitácora, interacción #6).

---

### Decisión #6 — Catálogo visible sin cuenta
**Fecha:** 17/11/2026

**Contexto:** La app pedía iniciar sesión antes de mostrar cualquier cosa, así que un visitante no podía ver los pasteles sin registrarse.

**Opciones consideradas:**
- Exigir login desde el inicio.
- Mostrar el catálogo sin cuenta y pedir la cuenta solo al hacer un pedido. ✅

**Decisión:** La app abre en el catálogo. Al tocar "Pedir" pide registrarse y, al terminar, abre el pedido con el pastel elegido. La migración 015 permite leer sin sesión solo los pasteles publicados; pedidos, perfiles y pagos siguen requiriendo cuenta.

**Consecuencias:** Menos fricción para nuevos clientes sin abrir datos privados. Los permisos del visitante se verificaron con `permisos_catalogo.sql`.

---

### Decisión #7 — CLABE ficticia calculada a partir del id del pedido
**Fecha:** 20/11/2026

**Contexto:** El comprobante de pago mostraba una CLABE fija en ceros, poco realista.

**Opciones consideradas:**
- Dejar la CLABE fija.
- Generar una aleatoria y guardarla en la base (requiere migración).
- Calcularla a partir del id del pedido en la app. ✅

**Decisión:** `generarClabe(pedidoId)` obtiene 17 dígitos del id y calcula el dígito verificador como en una CLABE real (18 dígitos).

**Consecuencias:** Cada pedido tiene una CLABE distinta y siempre muestra la misma, sin cambios en Supabase.

---

### Decisión #8 — Pago solo `pendiente` o `confirmado`
**Fecha:** 20/11/2026

**Contexto:** El pago tenía estados de prueba (`simulado`, `fallido`, `pagado`) y la app mencionaba "pago simulado", lo que no correspondía a un flujo real con transferencia.

**Opciones consideradas:**
- Mantener el pago simulado.
- Dejar solo dos estados: `pendiente` y `confirmado`. ✅

**Decisión:** Migración 016: los pagos existentes se convirtieron a los dos estados nuevos, la base solo acepta esos valores y el pago pasa automáticamente a `confirmado` cuando el admin confirma el pedido. Esta última regla la propuso la IA y la acepté.

**Consecuencias:** Estados más claros para el cliente y el admin. Se quitaron las menciones a "simulado" y "ficticia" en la app.

---

### Decisión #9 — Arquitectura en capas con API propia
**Fecha:** 21/11/2026

**Contexto:** El profesor pidió separar backend y frontend. Hasta entonces la app consultaba Supabase directamente y `backend/` solo tenía migraciones SQL. Había un día para hacerlo.

**Opciones consideradas:**
- MVC: la "V" ya son las pantallas de React Native, así que en el backend quedaría vacía o forzada.
- Seguir con la app hablando directo con Supabase: no separa realmente el backend.
- Capas (Rutas/Controladores → Servicios → Repositorios) con Express. ✅

**Decisión:** API en Express con capas, migrada módulo por módulo (catálogo, perfil, pedidos, admin y repartidor), con un commit por módulo. Se documentó en la spec F11.

**Consecuencias:** La app ya no consulta tablas ni Storage; todo pasa por la API, y el servidor valida los datos y calcula los totales. Desde la app, Supabase solo se usa para iniciar sesión. Ahora la app depende de que la API esté corriendo y sea accesible.
