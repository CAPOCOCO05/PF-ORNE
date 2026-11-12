# Feature F07: Mejoras posteriores al MVP

> Agrupa siete mejoras detectadas después de cerrar F00–F06. Cada una es
> independiente y tiene sus propios criterios y tareas; se pueden entregar por
> separado. Las decisiones marcadas como **✅ Confirmado** fueron validadas con el
> equipo (2026-11-07).

| # | Mejora | Rol | Estado |
|---|---|---|---|
| M1 | Diálogos personalizados (reemplazan los `Alert` del dispositivo) | Todos | ✅ Completa |
| M2 | Pedido no entregado por el repartidor | Repartidor / Admin / Cliente | ✅ Completa |
| M3 | Filtro por estado dentro de "Activos" en el panel admin | Admin | ✅ Completa |
| M4 | Publicar y editar pasteles del catálogo desde la app | Admin | ✅ Completa |
| M5 | Filtros del catálogo del cliente (precio, sabores, relleno…) | Cliente | 🟡 Implementada (falta probar en un dispositivo) |
| M6 | Nombre completo del cliente (para el repartidor) | Cliente / Repartidor | 🟡 Implementada (falta editar el nombre en el perfil, va con M7; probar en un dispositivo) |
| M7 | Perfil del cliente con sus datos de contacto, editable | Cliente | 🔲 Pendiente |

**Orden sugerido:** M1 → M2 → M3 → M4 → M5. M1 va primero porque M2, M3 y M4 usan
sus diálogos; M4 va antes que M5 porque fija cómo se calcula `precio_base`, que es
el dato por el que filtra M5. M6 y M7 no dependen de M1–M5; M7 va después de M6
porque reutiliza su validación del nombre.

**Migraciones nuevas** (en `backend/supabase/migrations/`):

| Migración | Contenido | Mejora |
|---|---|---|
| `011_no_entregado.sql` | Estado `no_entregado`, columna `motivo_no_entrega`, política del repartidor, trigger de transiciones y función `contar_pedidos_por_estado()` | M2, M3 |
| `012_catalogo_admin.sql` | Políticas `insert`/`update` de `catalogo_pasteles` y de Storage `catalogo` para el admin; trigger que calcula `precio_base` | M4 |
| `013_datos_cliente.sql` | Tabla `datos_cliente` (teléfono y dirección guardada), RLS solo del dueño, llenado inicial desde el último pedido y actualización al confirmar | M7 |

---

## M1. Diálogos personalizados

### Objetivo
Que todas las confirmaciones y avisos sigan la identidad visual de ORNE en lugar
de usar la alerta nativa del sistema (`Alert.alert`), que se ve distinta en
Android e iOS y no respeta la paleta.

### Alcance
Hoy hay 17 llamadas a `Alert.alert` (login, registro, decoración, pago, mis
pedidos, wizard, acciones del admin y entrega del repartidor). Todas se migran.

### Diseño
- Fondo oscurecido semitransparente; tarjeta centrada con bordes redondeados,
  fondo `#f6f4f3`.
- Ícono opcional arriba (pastel para confirmaciones, alerta para errores).
- Título en `#5b0e17`, negritas; mensaje en el color de texto normal.
- Botones con el componente `Boton` existente: acción principal `#b2181d`
  (texto blanco) y "Cancelar" en `#ffdadd`. Si la acción es **destructiva**
  (cancelar pedido, eliminar borrador, marcar no entregado) el botón principal
  dice exactamente lo que hace ("Sí, cancelar") — nunca solo "Aceptar".
- Animación de entrada `fade` (la que trae `Modal`).

### Decisiones
- **D1. Sin dependencias nuevas.** Se construye con `Modal` de React Native.
- **D2. API por promesa.** Un `DialogoProvider` en `app/_layout.tsx` y un hook
  `useDialogo()` con:
  - `confirmar({titulo, mensaje?, textoConfirmar, textoCancelar?, destructiva?}): Promise<boolean>`
  - `avisar({titulo, mensaje?, tipo: 'info' | 'error', textoBoton?}): Promise<void>`
  - Así cada pantalla cambia `Alert.alert(...)` por `if (await confirmar(...))`
    sin reestructurar su lógica.
- **D3. Un diálogo a la vez.** Si se pide otro mientras hay uno abierto, se
  encola y se muestra al cerrar el primero.
- **D4. Cerrar.** El botón "atrás" de Android y tocar fuera de la tarjeta
  equivalen a "Cancelar" (en `avisar`, a cerrar). En diálogos de error no se
  cierra tocando fuera.
- **D5. Accesibilidad.** La tarjeta usa `accessibilityViewIsModal` y el título se
  anuncia al abrir.
- **D6. `Boton` no propaga promesas.** `Boton` llama a `onPress` y descarta lo que
  regresa: una acción que espera la respuesta de un diálogo no debe dejar el toque
  "pendiente" (y en Testing Library v14, `fireEvent.press` esperaría esa promesa).
- **D7. Destructiva.** El botón principal usa el vino oscuro de títulos (`#5b0e17`)
  en vez del rojo de botón principal, y la insignia muestra "!" en lugar del pastel.

### Criterios de aceptación
- [x] No queda ninguna llamada a `Alert.alert` en `app/` ni en `src/`.
- [x] Los diálogos usan la paleta de `00-project.md` y se ven igual en Android e iOS.
- [x] Las acciones destructivas se distinguen visualmente y su botón describe la acción.
- [x] El botón "atrás" de Android cierra el diálogo sin ejecutar la acción.

### Tareas
- [x] `src/components/Dialogo.tsx` (presentación) y `src/context/DialogoContext.tsx` (provider + `useDialogo`), con pruebas.
- [x] Montar `DialogoProvider` en `app/_layout.tsx`.
- [x] Migrar las 17 llamadas a `Alert.alert` y ajustar sus pruebas (las pruebas usan el provider real vía `src/test-utils/renderConDialogo.tsx` y presionan los botones del diálogo).
- [x] Probar criterios de aceptación (pruebas de la app y en dispositivo ✅).

---

## M2. Pedido no entregado (repartidor)

### Objetivo
Registrar cuando un pedido salió a reparto pero **no se pudo entregar** (nadie en
el domicilio, dirección incorrecta, el cliente lo rechazó), en lugar de forzar
"Entregado" o dejarlo en camino para siempre.

### Actor
Repartidor (lo marca), admin (decide qué sigue), cliente (lo consulta).

### Flujo principal
1. En `repartidor/entrega/[id].tsx`, debajo de "Marcar como entregado", aparece el
   botón secundario **"No se pudo entregar"**.
2. Se abre un diálogo (M1) con el motivo, obligatorio:
   - Nadie recibió el pedido
   - Dirección incorrecta o no encontrada
   - El cliente rechazó el pedido
   - Otro (campo de texto, obligatorio, máx. 200 caracteres)
3. Al confirmar, el pedido pasa de `en_camino` a `no_entregado` con su motivo y
   sale de la lista del repartidor.
4. El admin lo ve en "Activos" (requiere atención) con la etiqueta "No entregado"
   y el motivo en el detalle. Tiene dos acciones:
   - **"Reprogramar entrega"** → regresa a `listo` y se quita el repartidor, para
     volver a enviarlo a reparto (con el mismo u otro repartidor).
   - **"Cancelar pedido"** → `cancelado`.
5. El cliente ve el estado "No entregado" y el motivo en el detalle de su pedido.

### Decisiones
- **D1. Estado nuevo, no `cancelado`. ✅ Confirmado.** Se usa un estado
  `no_entregado` en vez de que el repartidor cancele directamente porque:
  - un intento fallido no siempre termina el pedido (se puede reprogramar);
  - cancelar sigue siendo decisión de la pastelería (admin), no del repartidor;
  - el motivo queda registrado para aclarar con el cliente.
  Alternativa más simple: permitir al repartidor `en_camino → cancelado` con
  motivo. Se descarta porque no permite reintentar la entrega.
- **D2. Ciclo de estados actualizado** (en `02-data-model.md`):
  ```
  … listo → en_camino ─┬─→ entregado
                       └─→ no_entregado ─┬─→ listo (reprogramar, sin repartidor)
                                         └─→ cancelado
  ```
- **D3. Migración `011_no_entregado.sql`:**
  - Agregar `no_entregado` al `check` de `pedidos.estado`.
  - Columna `motivo_no_entrega text` (null salvo en `no_entregado`; se conserva al
    reprogramar como historial del último intento).
  - Política `repartidor_entrega`: el `with check` acepta `estado = 'entregado'` o
    (`estado = 'no_entregado'` y `motivo_no_entrega` no vacío).
  - Trigger `validar_cambio_pedido`: el repartidor puede cambiar también
    `motivo_no_entrega` (hoy solo `estado`); nuevas transiciones del admin
    `no_entregado → listo` (exige `repartidor_id = null`) y
    `no_entregado → cancelado`.
- **D4. App.** `EstadoPedido` incluye `no_entregado`; etiqueta "No entregado" y color
  propio (`fondo #fde2e1`, `texto #a50e16`); entra en `ESTADOS_ACTIVOS` y en los
  chips del admin; nuevas `ACCIONES` `reprogramar` y `cancelar` para ese estado
  en `accionesDisponibles()`.
- **D5. Cambios simultáneos.** Igual que F06 D4: el update exige `estado = 'en_camino'`.

### Casos de error
- Motivo vacío → no se habilita "Confirmar" en el diálogo.
- Error de red → "No se pudo actualizar la entrega, inténtalo de nuevo"; el pedido
  sigue en la lista.

### Criterios de aceptación
- [x] El repartidor puede marcar un pedido `en_camino` como no entregado indicando el motivo.
- [x] No puede hacerlo sin motivo ni sobre pedidos que no son suyos o no están en camino (probado en SQL).
- [x] El admin ve el motivo y puede reprogramar (vuelve a `listo` sin repartidor) o cancelar.
- [x] El cliente ve el estado "No entregado" y el motivo en su pedido.

### Tareas
- [x] Migración `011_no_entregado.sql` (D3).
- [x] Actualizar `02-data-model.md` (entidad `Pedido`, diagrama y tabla de estados).
- [x] Tipos, `estadosPedido.ts` y `utils/estados.ts` (D4), con pruebas.
- [x] `repartidorService.marcarNoEntregado(id, motivo)` con pruebas.
- [x] Botón y diálogo de motivo en `repartidor/entrega/[id].tsx` (`DialogoNoEntregado`, sobre el `MarcoDialogo` de M1).
- [x] Motivo en el detalle del admin y del cliente.
- [x] Ampliar `backend/supabase/tests/permisos_repartidor.sql` y `permisos_admin.sql` (corridos en Supabase: OK).
- [x] Probar criterios de aceptación (pruebas de la app, permisos SQL y dispositivo ✅).

---

## M3. Filtro por estado dentro de "Activos" (admin)

### Objetivo
Que el admin, estando en "Activos", pueda acotar la lista a uno o varios de los
estados en curso (por ejemplo, ver solo "Pendientes" + "Listos") y sepa cuántos
pedidos hay en cada uno, sin salir de la vista de activos.

### Diseño
- Fila superior con tres pestañas: **Activos · Entregados · Cancelados**
  (reemplaza la fila única de 8 chips).
- Dentro de **Activos**, una segunda fila de chips **de selección múltiple**, uno
  por estado en curso, con su contador: `Pendientes (3)`, `Confirmados (5)`,
  `En preparación (2)`, `Listos (1)`, `En camino (4)`, `No entregados (1)`.
- Sin chips marcados = todos los activos (comportamiento actual). Enlace
  "Limpiar" cuando hay alguno marcado.
- Los chips con contador 0 se muestran atenuados pero se pueden elegir.

### Decisiones
- **D1. Interpretación. ✅ Confirmado.** "Activos" muestra todos los pedidos en
  curso mezclados; se necesita un filtro **dentro** de esa pestaña para ver, por
  ejemplo, solo "Listos" o solo "En camino" (o ambos) sin salir de Activos.
- **D2. Contadores.** Una función `contar_pedidos_por_estado()` (en `011`,
  `security invoker` para respetar RLS) devuelve `estado, total` de los pedidos no
  borradores en una sola consulta. Se recargan junto con la lista (al enfocar la
  pantalla, al deslizar hacia abajo y tras cambiar un estado).
- **D3. Consulta.** `estadosDeFiltro()` recibe la pestaña y los estados marcados y
  devuelve la lista para `.in('estado', …)`; paginación y orden de F04 D3/D4 sin
  cambios.
- **D4. Persistencia.** La selección se conserva al ir al detalle y regresar (vive
  en el hook de la lista, no se reinicia en `useFocusEffect`).
- **D5. Falla del contador.** Si `contar_pedidos_por_estado()` falla, los chips se
  muestran sin número y la lista carga normal (el conteo es secundario).

### Criterios de aceptación
- [x] En "Activos" el admin puede marcar uno o varios estados y la lista muestra solo esos.
- [x] Cada chip muestra cuántos pedidos hay en ese estado.
- [x] Al regresar del detalle se conserva la selección.
- [x] "Entregados" y "Cancelados" se siguen viendo como hoy.

### Tareas
- [x] `contar_pedidos_por_estado()` en `011` y `adminService.contarPorEstado()` con pruebas.
- [x] `FiltroAdmin` → `{pestania, estados[]}`; actualizar `estadosDeFiltro`/`ordenAscendente` (+ `alternarEstado`) y pruebas.
- [x] Componente `FiltrosEstado` con pestañas + chips múltiples con contador.
- [x] Ajustar `usePedidosAdmin` y `admin/index.tsx`; actualizar `__tests__/admin/pedidos.test.tsx`.
- [x] Probar criterios de aceptación (pruebas de la app y dispositivo ✅).

---

## M4. Publicar pasteles en el catálogo (admin)

### Objetivo
Que el admin dé de alta, edite, oculte y vuelva a publicar pasteles del catálogo
desde la app, sin entrar al Dashboard de Supabase.

### Pantallas (nuevas, ver `01-navigation.md`)
- `admin/catalogo/index.tsx` — lista de todos los pasteles (activos e inactivos),
  con etiqueta "Publicado" / "Oculto" y botón **"Nuevo pastel"**.
- `admin/catalogo/[id].tsx` — formulario; `id = 'nuevo'` para alta.
- Menú lateral del admin: **Pedidos · Catálogo · Perfil · Cerrar sesión**.

### Datos de entrada
- nombre (obligatorio, máx. 60 caracteres, único sin distinguir mayúsculas)
- descripción (opcional, máx. 200 caracteres)
- imagen (opcional; jpg, png, heic — misma validación MIME que F01 D9)
- tamaño, niveles, sabor de pan y relleno (obligatorios; mismos selectores del
  wizard: `SelectorOpciones` y `SelectorSabor`)
- publicado (interruptor; por defecto activado)

### Flujo principal
1. El admin abre "Catálogo" y presiona "Nuevo pastel" o toca uno existente.
2. Llena el formulario; ve una **vista previa** con `TarjetaPastel`, igual a como
   la verá el cliente, y el precio calculado.
3. Presiona "Publicar" (o "Guardar cambios") → diálogo de confirmación (M1).
4. Si adjuntó imagen, se sube al bucket `catalogo` y se guarda la URL pública.
5. Para retirar un pastel se usa el interruptor "Publicado" → queda oculto para
   el cliente pero no se borra.

### Decisiones
- **D1. Sin borrado.** Solo ocultar (`activo = false`). Evita perder pasteles por
  error y no requiere política `delete`.
- **D2. Precio automático. ✅ Confirmado.** `precio_base` se calcula con
  `calcular_precio(tamanio, niveles, relleno)` (de `008`) mediante un trigger
  `before insert or update` en `012`; el admin no lo escribe. Así el precio de la
  tarjeta siempre coincide con el que se cobrará y M5 puede filtrar por él con
  confianza.
- **D3. Permisos (`012_catalogo_admin.sql`).** Políticas `insert` y `update` en
  `catalogo_pasteles` solo para `mi_rol() = 'admin'`; políticas de Storage para que
  el admin suba/reemplace archivos en el bucket `catalogo`. Nombre del archivo:
  `pastel-<timestamp>-<aleatorio>.<ext>` (evita caché de imágenes viejas). Se usa
  en vez de `<id>-<timestamp>` porque la imagen se sube antes de guardar y un
  pastel nuevo aún no tiene id. ✅ Confirmado.
- **D4. Imagen anterior.** Al reemplazar la imagen se intenta borrar la anterior;
  si falla, no se bloquea el guardado (queda huérfana, se registra en consola).
- **D5. Paginación.** Lista del admin con el mismo patrón de 10 en 10 de F01 D6,
  ordenada por nombre.
- **D6. Niveles según tamaño. ✅ Confirmado.** El formulario aplica el mismo máximo
  de niveles por tamaño que el wizard (`NIVELES_MAX`), para que un pastel del
  catálogo siempre se pueda pedir tal como se publicó.
- **D7. Nombre único en la base.** Índice único sobre `lower(btrim(nombre))` en
  `012`; la app traduce el error `23505` a "Ya existe un pastel con ese nombre".

### Casos de error
- Campo obligatorio vacío o nombre repetido → mensaje junto al campo (F05).
- Falla la subida de la imagen → "No se pudo subir la imagen. Inténtalo de nuevo";
  no se guarda el resto ni se pierde lo capturado.
- Error de red al guardar → diálogo de error con "Reintentar" (F05).

### Criterios de aceptación
- [x] El admin puede crear un pastel con imagen y aparece en el catálogo del cliente.
- [x] Puede editarlo y ocultarlo; un pastel oculto no aparece al cliente.
- [x] El precio de la tarjeta coincide con el que calcula el wizard para esa configuración.
- [x] Un cliente o repartidor no puede crear ni editar pasteles (probado en SQL).

### Tareas
- [x] Migración `012_catalogo_admin.sql` (D2, D3, D7).
- [x] Actualizar `02-data-model.md` (permisos de `catalogo_pasteles` y Storage) y `01-navigation.md`.
- [x] `catalogoService`: `listarCatalogoAdmin`, `obtenerPastelAdmin`, `guardarPastel`, `subirImagenCatalogo`, con pruebas.
- [x] `admin/catalogo/index.tsx`, `admin/catalogo/[id].tsx` y opción en el menú.
- [x] Validaciones del formulario en `utils/catalogo.ts` (`validarPastel`), con pruebas.
- [x] Script `backend/supabase/tests/permisos_catalogo.sql` (cliente, repartidor y admin).
- [x] Probar criterios de aceptación.

---

## M5. Filtros del catálogo del cliente

### Objetivo
Que el cliente encuentre más rápido un pastel filtrando el catálogo por precio,
sabor de pan, relleno, tamaño y niveles.

### Diseño
- En `home.tsx`, debajo de "Crear pedido", una barra compacta con dos botones
  desplegables: **"Filtrar ▾"** (con el número de filtros activos, p. ej.
  "Filtrar (3)") y **"Ordenar: Nombre ▾"**. ✅ Confirmado (2026-11-12): en lugar
  del panel inferior (modal) se usan desplegables que se abren debajo de la barra,
  para no cubrir el catálogo.
- "Filtrar" despliega un panel con una fila de chips por sección (con
  desplazamiento horizontal para que el panel sea bajo):
  - **Precio:** Hasta $500 · $500–$800 · $800–$1,200 · Más de $1,200 (una opción).
  - **Pan:** los 6 sabores (varias opciones).
  - **Relleno:** los 5 rellenos (varias opciones).
  - **Tamaño:** 10, 15, 20, 30 personas (varias opciones).
  - **Niveles:** 1, 2, 3, 4 (varias opciones).
- "Ordenar" despliega una lista corta: Nombre (por defecto) · Precio: menor a
  mayor · Precio: mayor a menor; al elegir se aplica y se cierra.
- En el panel de filtros: "Limpiar" (enlace) y "Ver resultados" (principal). Lo
  elegido es un borrador hasta presionar "Ver resultados" (no consulta en cada toque).
- Debajo del encabezado se muestran los filtros aplicados como chips con "×" para
  quitarlos uno por uno.

### Decisiones
- **D1. Filtrado en el servidor.** `listarCatalogo(pagina, filtros)` agrega
  `.in()`, `.gte()`/`.lt()` y el `order` correspondiente; la paginación de 10 en
  10 (F01 D6) se mantiene. No se descarga todo el catálogo para filtrar en el
  teléfono.
- **D2. Rangos de precio. ✅ Confirmado (provisionales).** Se ajustarán cuando se
  definan los montos finales de F01 D7; por eso viven en
  `src/constants/filtrosCatalogo.ts` y no en el código de la pantalla. Filtran sobre `precio_base`
  (que con M4 D2 coincide con el precio real). Cada límite superior es inclusivo
  ("Hasta $500" incluye $500; "$500–$800" es más de $500 y hasta $800).
- **D3. Combinación.** Dentro de una sección las opciones se suman (O); entre
  secciones se acotan (Y). Ej.: pan Chocolate o Vainilla **y** relleno Cajeta.
- **D4. Persistencia.** Los filtros se conservan al ir al wizard y regresar; se
  reinician al cerrar sesión. No se guardan en el dispositivo.
- **D5. Orden estable.** Al ordenar por precio se agrega `nombre` e `id` como
  desempate para que la paginación no repita ni salte pasteles.
- **D6. Respuestas viejas.** Si los filtros cambian mientras carga una página, la
  respuesta anterior se descarta (`useCatalogo` lleva un contador de solicitudes).

### Casos de error
- Sin resultados → "No hay pasteles con esos filtros" + botón "Limpiar filtros"
  (distinto del catálogo vacío de F01).
- Error de red → mensaje + "Reintentar" (F05), conservando los filtros elegidos.

### Criterios de aceptación
- [ ] El cliente puede filtrar por precio, pan, relleno, tamaño y niveles, combinándolos.
- [ ] Puede ordenar por precio y la paginación sigue funcionando sin repetir pasteles.
- [ ] Ve qué filtros tiene aplicados y puede quitarlos uno por uno o todos.
- [ ] Sin resultados se muestra un mensaje distinto al del catálogo vacío.

### Tareas
- [x] `src/constants/filtrosCatalogo.ts` y tipo `FiltrosCatalogo`.
- [x] Utilidades en `utils/filtrosCatalogo.ts` (contar, chips aplicados, quitar, limpiar), con pruebas.
- [x] `listarCatalogo(pagina, filtros)` con pruebas por cada filtro y el orden.
- [x] `useCatalogo` recibe filtros y reinicia la paginación al cambiarlos.
- [x] Componentes `BarraFiltros`, `PanelFiltros`, `FiltrosAplicados` y `ChipFiltro` en `src/components/catalogo/`, integrados en `home.tsx`.
- [x] Actualizar `__tests__/cliente/home.test.tsx`.
- [ ] Probar criterios de aceptación (pruebas de la app ✅; falta probar en un dispositivo).

---

## M6. Nombre completo del cliente

### Objetivo
Que el repartidor sepa a quién entregar el pastel. Hoy el registro solo pide
"Nombre" y acepta una sola palabra ("Ana"), que es lo que el repartidor ve en
"Mis entregas" (F06 D1).

### Actor
Cliente (lo captura), repartidor y admin (lo consultan).

### Flujo principal
1. **Registro:** el campo cambia a **NOMBRE COMPLETO** con placeholder
   "Nombre y apellidos" y la ayuda "Lo usará el repartidor para entregarte tu
   pedido".
2. **Perfil del cliente:** el nombre se puede editar con la misma validación
   (pantalla de edición de M7).
3. **Cuentas existentes con nombre incompleto:** al llegar al paso de entrega
   (F02) con tipo **Domicilio**, se muestra arriba del teléfono el campo "Nombre
   completo de quien recibe", precargado con el nombre actual y con el mismo
   error si está incompleto. No se puede avanzar hasta corregirlo; al avanzar se
   guarda en el perfil.

### Validaciones
- Se aplica `trim()` y se colapsan los espacios repetidos.
- Al menos **dos palabras** de 2 o más letras cada una (nombre y apellido).
- Solo letras (incluye acentos y ñ), espacios, apóstrofo y guion.
- Máximo 80 caracteres.
- Mensajes (junto al campo, F05):
  - Vacío → "Ingresa tu nombre completo"
  - Una sola palabra → "Escribe tu nombre y al menos un apellido"
  - Caracteres no válidos → "El nombre solo puede tener letras y espacios"
  - Más de 80 caracteres → "El nombre no puede tener más de 80 caracteres" (el
    campo además limita la captura con `maxLength`)

### Decisiones
- **D1. Se guarda en `perfiles.nombre`.** No se agrega columna nueva: es el dato
  que ya consultan el admin (F04) y el repartidor (`010`). Tampoco hace falta
  migración: el cliente ya puede actualizar la columna `nombre` de su perfil
  (`004`, `grant update (nombre)`).
- **D2. Validación solo en la app.** No se agrega `check` en la base porque
  rompería el registro de cuentas con nombres cortos ya existentes y el trigger de
  alta (`004`) mostraría un error poco claro. Las cuentas antiguas se corrigen con
  el paso 3 del flujo.
- **D3. Recolección en sucursal.** El paso 3 del flujo solo aplica a domicilio;
  en sucursal el admin entrega en mostrador y ya ve el nombre y el teléfono.
- **D4. Función compartida.** `validarNombreCompleto(nombre)` en
  `utils/validaciones.ts` la usan registro, perfil y entrega.

### Criterios de aceptación
- [ ] No se puede registrar una cuenta con una sola palabra como nombre.
- [ ] El cliente puede editar su nombre desde su perfil.
- [ ] Un cliente con nombre incompleto no puede avanzar en una entrega a domicilio
      sin completarlo, y el cambio queda guardado en su perfil.
- [ ] El repartidor ve el nombre completo en "Mis entregas" y en el detalle.

### Tareas
- [x] `validarNombreCompleto()` y mensajes en `utils/validaciones.ts`, con pruebas.
- [x] Ajustar `register.tsx` (etiqueta, placeholder, ayuda, validación) y su prueba
      (`__tests__/auth/register.test.tsx`; `Input` recibe la prop `ayuda`).
- [x] `authService.actualizarNombre()` y refrescar `perfil` en `AuthContext`, con pruebas.
- [x] Campo condicional en `pedido/nuevo/entrega.tsx` y su prueba.
- [x] Actualizar F00 (datos de entrada y validaciones del registro).
- [ ] Editar el nombre desde el perfil (se hace en la pantalla de edición de M7).
- [ ] Probar criterios de aceptación.

---

## M7. Perfil del cliente con sus datos de contacto

### Objetivo
Que el cliente vea y edite en su perfil sus datos personales — nombre completo,
teléfono y dirección de entrega — y que no tenga que volver a escribirlos en cada
pedido. Si ya tiene cuenta y ya hizo pedidos, el perfil se llena solo con los
datos de su último pedido.

### Actor
Cliente.

### Pantallas (ver `01-navigation.md`)
- `(cliente)/perfil.tsx` — deja de usar la `PantallaPerfil` genérica y muestra
  secciones (admin y repartidor conservan la actual):
  - **Datos personales:** nombre completo, correo (solo lectura), teléfono.
  - **Dirección de entrega:** calle y número, número interior, colonia,
    referencias y un mapa pequeño con el pin (solo lectura). Si no hay dirección:
    "Aún no tienes una dirección guardada".
  - Botón **"Editar datos"** y, al final, "Cerrar sesión".
- `(cliente)/perfil/editar.tsx` — formulario (no aparece en el menú):
  - Nombre completo (validación de M6).
  - Teléfono (10 dígitos, misma validación de F02).
  - Dirección: reutiliza `MapaEntrega` + `FormularioDomicilio` de F02 (pin,
    búsqueda, geocodificación inversa, zona de 15 km). Botón "Quitar dirección".
  - "Guardar cambios" (principal) y "Cancelar" (secundario). Si hay cambios sin
    guardar, al salir se pregunta con un diálogo de M1.

### Flujo principal
1. El cliente abre "Perfil" y ve sus datos.
2. Si se registró antes de M7 y tiene pedidos confirmados, sus datos ya aparecen
   (llenado inicial de la migración, D3).
3. Presiona "Editar datos", cambia lo necesario y guarda.
4. En su siguiente pedido, el paso de entrega (F02) aparece **precargado** con su
   teléfono y, si elige Domicilio, con su dirección y el pin en el mapa. Puede
   cambiarlos solo para ese pedido.

### Decisiones
- **D1. Tabla aparte `datos_cliente`, no columnas en `perfiles`.** La política
  `010` deja al repartidor leer el perfil de los clientes de sus entregas; si la
  dirección guardada viviera en `perfiles`, la vería aunque no sea la del pedido.
  `datos_cliente` (1 a 1 con el usuario: `usuario_id` PK/FK, `telefono`, `calle`,
  `numero_exterior`, `numero_interior`, `colonia`, `direccion_referencia`,
  `direccion_lat`, `direccion_lng`, `updated_at`) tiene RLS **solo del dueño**
  (`select`, `insert`, `update`). El admin y el repartidor siguen usando los datos
  guardados en cada pedido.
- **D2. Los pedidos no cambian.** Editar el perfil no modifica pedidos ya
  confirmados: cada pedido conserva la dirección y el teléfono con los que se
  confirmó (es lo que ve el repartidor).
- **D3. Llenado inicial (en `013`).** Para cada cliente con pedidos no borrador se
  copian el teléfono y la dirección del **pedido más reciente a domicilio**; si
  solo tiene de recolección, solo el teléfono.
- **D4. Actualización al confirmar.** `confirmar_pedido` (de `008`) se redefine en
  `013` para guardar en `datos_cliente` el teléfono del pedido y, si es a
  domicilio, su dirección, **solo en los campos que estén vacíos**. Así el primer
  pedido llena el perfil, pero un cambio puntual (enviar a otra dirección una vez)
  no sobrescribe lo que el cliente editó a mano.
- **D5. Precarga en el wizard.** Al crear un pedido nuevo (no al continuar un
  borrador, que ya tiene sus datos) `PedidoContext` toma teléfono y dirección de
  `datos_cliente`. Si la dirección guardada quedó fuera de la zona de 15 km, se
  precarga igual y F02 muestra su error habitual.
- **D6. Correo no editable.** Cambiar el correo implica reconfirmarlo con Supabase
  Auth; queda fuera de esta mejora.

### Casos de error
- Error al cargar el perfil → mensaje + "Reintentar" (F05).
- Error al guardar → diálogo de error (M1); el formulario conserva lo capturado.
- Campo inválido → mensaje junto al campo, inmediato (F05).

### Criterios de aceptación
- [ ] Un cliente con pedidos anteriores ve en su perfil su nombre completo,
      teléfono y la dirección de su último pedido a domicilio.
- [ ] Puede editar nombre, teléfono y dirección, y los cambios se conservan al
      cerrar y abrir la app.
- [ ] Un pedido nuevo aparece con teléfono y dirección precargados, y cambiarlos
      en ese pedido no modifica el perfil.
- [ ] Editar el perfil no cambia los pedidos ya confirmados.
- [ ] Ningún otro usuario (otro cliente, admin o repartidor) puede leer
      `datos_cliente` (probado en SQL).

### Tareas
- [ ] Migración `013_datos_cliente.sql` (D1, D3, D4).
- [ ] Actualizar `02-data-model.md` (entidad `DatosCliente`, permisos) y `01-navigation.md` (`perfil/editar`).
- [ ] `src/services/perfilService.ts`: `obtenerDatosCliente`, `guardarDatosCliente` (+ nombre), con pruebas.
- [ ] Hook `useDatosCliente`.
- [ ] `(cliente)/perfil.tsx` con secciones y `(cliente)/perfil/editar.tsx`.
- [ ] Precarga en `PedidoContext` (D5), con pruebas.
- [ ] Script `backend/supabase/tests/permisos_datos_cliente.sql`.
- [ ] Probar criterios de aceptación.
