# Feature F01: Catálogo y configuración del pastel

## Objetivo
Permitir que el cliente vea el catálogo base y arme su pastel paso a paso
(tamaño, niveles, sabor, relleno, decoración), pudiendo retroceder entre pasos y
guardar su progreso para terminarlo después.

## Actor
Cliente (requiere sesión iniciada — depende de F00).

## Precondiciones
Usuario autenticado.

## Datos de entrada
- tamaño (obligatorio — 10, 15, 20, 30 personas)
- niveles (obligatorio — 1, 2, 3, 4 pisos)
- sabor_pan (obligatorio — Vainilla, Chocolate, Red Velvet, Tres leches, Fresa,
  Zanahoria)
- sabor_relleno (obligatorio — Cajeta, Mermelada / Fresa, Chocolate, Crema
  pastelera, Mantequilla de maní)

Solo existen los sabores con imagen en `frontend/assets/sabores/` (ver
`02-data-model.md`, "Catálogo de sabores").
- mensaje_decoracion (opcional — texto libre, máx. 500 caracteres)
- imagen_decoracion (opcional — solo formato imagen: jpg, png, heic)

## Flujo principal
1. El usuario ve el catálogo paginado (`(cliente)/home.tsx`, ver
   `design/pantalla_principal_catalogo.png`) y presiona "Pedir" en un pastel, o
   presiona "Crear pedido".
2. Paso 1 — selecciona tamaño y niveles. Al presionar "Siguiente" se crea el pedido
   con `estado = 'borrador'` (ver D2).
3. Paso 2 — selecciona sabor de pan y relleno (cada opción se muestra resaltada al
   seleccionarse).
4. Paso 3 — escribe mensaje de decoración y/o adjunta imagen de referencia.
5. En cualquier paso puede regresar al anterior sin perder lo ya capturado.
6. En cualquier paso puede salir; el borrador queda guardado y aparece en
   "Mis pedidos" para retomarlo.
7. Al terminar el paso 3, continúa a F02 (logística de entrega).

## Validaciones
- No se puede avanzar de paso sin completar los campos obligatorios de ese paso.
- `imagen_decoracion`: rechazar archivos que no sean imagen (validar MIME type).
- `mensaje_decoracion`: máximo 500 caracteres, mostrar contador.

## Reglas de negocio
- El precio se recalcula en tiempo real: `PrecioBase(tamaño, niveles) + CostoRelleno`.
- El sabor de pan/relleno seleccionado se resalta visualmente (borde o fondo
  distinto) para confirmar la elección al usuario.
- Las imágenes de sabores provienen de assets locales (ver `02-data-model.md`,
  sección "Catálogo de sabores"), no de Storage.
- El catálogo base (`(cliente)/home.tsx`) se consulta con paginación (ej. 10 items
  por página, scroll infinito o botón "Cargar más").

## Casos de error
- Falta un campo obligatorio → resaltar en rojo: "Este campo es obligatorio".
- Imagen con formato inválido → "Solo se aceptan archivos de imagen".
- Error de conexión al guardar el borrador → modal: "Error de conexión. Tu
  progreso no se guardó, inténtalo de nuevo".

## Resultado esperado
Un registro en `pedido_detalle` vinculado al pedido en curso, con todas las
especificaciones del pastel, listo para pasar a logística de entrega.

## Criterios de aceptación
- [ ] El catálogo base carga paginado, sin traer todos los registros de golpe.
- [ ] El usuario puede retroceder a cualquier paso anterior sin perder datos.
- [ ] El usuario puede salir a medias y retomar el pedido desde "Mis pedidos".
- [ ] El sabor de pan y relleno seleccionados se ven visualmente resaltados.
- [ ] No se puede adjuntar un archivo que no sea imagen.
- [ ] El precio se actualiza en tiempo real al cambiar tamaño/niveles/relleno.

## Decisiones (supuestos v1)

> Resuelven las ambigüedades detectadas al analizar la spec. Las marcadas con
> **⚠️ Confirmar** son supuestos provisionales que debe validar el cliente/profesor;
> el resto son decisiones técnicas.

### D1. Ajustes al esquema (migración `006_ajustes_borrador.sql`)
El esquema actual no permite guardar un borrador. Se ajusta así:

| Cambio | Motivo |
|---|---|
| `pedidos.fecha_entrega`, `hora_entrega`, `tipo_entrega` → nullable | Se capturan en F02, después del borrador |
| `pedidos.folio` → nullable (sigue `unique`) | El folio se genera al confirmar (F03), no en el borrador |
| `pedidos.estado` → default `'borrador'` (el `check` de estados va en `007`, ver `02-data-model.md`) | Hoy no hay restricción y el default es `'pendiente'` |
| `pedidos.paso_actual int` (1–3, default 1) | Saber en qué paso retomar el borrador |
| `pedido_detalle.tipo_pan`, `relleno` → nullable | Se capturan en el paso 2, después de crear el detalle |
| `pedido_detalle.tamanio` (`'10'`,`'15'`,`'20'`,`'30'`) | Faltaba (ya previsto en `02-data-model.md`) |
| `check (niveles between 1 and 4)` y `check (char_length(decoracion_texto) <= 500)` | La validación no debe vivir solo en la app |
| Políticas RLS `update` y `delete` en `pedidos` y `pedido_detalle`, solo si `estado = 'borrador'` y es dueño | Hoy solo hay `select`/`insert`: no se puede actualizar ni borrar un borrador |
| Tabla `catalogo_pasteles` (ver D6) — va en `005_catalogo.sql` | F01 la usa en el paso 1 del flujo |
| Crear bucket `referencias-pasteles` (privado) con políticas por carpeta `auth.uid()` | Hoy solo existe como comentario |

Las validaciones de "pedido completo" (pan, relleno, entrega, folio no nulos) se
exigen al pasar de `borrador` a `pendiente` en F03.

### D2. Ciclo de vida del borrador
- El borrador **no** se crea al presionar "Crear pedido", sino al completar el
  paso 1 (presionar "Siguiente"). Así se evitan borradores vacíos.
- Se guarda (upsert de `pedidos` + `pedido_detalle`, y `paso_actual`) **cada vez
  que el usuario presiona "Siguiente"** y al salir del wizard. No hay autoguardado
  por tecla.
- Al retomar desde "Mis pedidos", se abre en `paso_actual` con los datos cargados
  en `PedidoContext`.
- Sin límite de borradores por usuario y sin expiración en el MVP. El usuario puede
  eliminar un borrador desde "Mis pedidos" (borra también su imagen en Storage).
- Si el mismo borrador se edita en dos dispositivos, gana la última escritura.

### D3. Navegación del wizard
- El indicador de pasos (stepper) es **solo visual**; se retrocede con el botón
  "Atrás" o el gesto/botón atrás de Android, un paso a la vez. Como cada paso
  anterior conserva sus datos, esto cumple "regresar a cualquier paso anterior".
- Botón atrás en el paso 1 → diálogo "¿Salir del pedido?". Si ya existe borrador,
  se guarda antes de salir.
- Si falla el guardado, el modal de error ofrece **"Reintentar"** y **"Salir sin
  guardar"** (el usuario decide; no se le bloquea).
- Si la app pasa a segundo plano o se cierra, se conserva lo guardado en el último
  "Siguiente"; lo capturado después se pierde (aceptable en el MVP).

### D4. Validación de campos obligatorios
El botón "Siguiente" siempre está habilitado. Al presionarlo con campos faltantes,
cada selector incompleto se resalta en rojo con "Este campo es obligatorio" y no se
avanza.

### D5. Tamaño, niveles y sabores — ⚠️ Confirmar
- **Combinaciones válidas** (los niveles no disponibles se muestran deshabilitados):

  | Tamaño (personas) | Niveles permitidos |
  |---|---|
  | 10 | 1 |
  | 15 | 1–2 |
  | 20 | 1–3 |
  | 30 | 1–4 |

  Si el usuario baja el tamaño y los niveles elegidos quedan inválidos, los niveles
  se ajustan al máximo permitido y se le avisa.
- **3–4 niveles**: se permiten; el precio se muestra con la leyenda *"Precio
  estimado, sujeto a confirmación de la pastelería"*. La fecha mínima se resuelve
  en F02.
- **Un solo sabor de pan y un solo relleno por pastel**, aunque tenga varios
  niveles. Sabor por piso queda fuera del MVP.
- **Lista de sabores alineada a los assets existentes** (en BD se guarda el `id`,
  en pantalla el `nombre`):

  | Pan (`id` → nombre) | Relleno (`id` → nombre) |
  |---|---|
  | `vainilla` → Vainilla | `cajeta` → Cajeta |
  | `chocolate` → Chocolate | `chocolate` → Chocolate |
  | `redvelvet` → Red Velvet | `cremapastelera` → Crema pastelera |
  | `tresleches` → Tres leches | `mantequillademani` → Mantequilla de maní |
  | `fresa` → Fresa | `mermeladafresa` → Mermelada / Fresa |
  | `zanahoria` → Zanahoria | |

  **Solo existen los sabores con imagen en los assets** (no hay Café ni Nutella).
  Rutas: `frontend/assets/sabores/pan/<id>.png` y
  `frontend/assets/sabores/relleno/<id>.png`.

### D6. Catálogo base
- `catalogo_pasteles` incluye, además de lo definido en `02-data-model.md`:
  `tamanio`, `niveles`, `tipo_pan`, `relleno`.
- Tocar un pastel del catálogo abre el wizard **con esos valores precargados**
  (editables). "Crear pedido" abre el wizard vacío.
- El precio final siempre sale de la fórmula de D7; el `precio_base` del catálogo es
  solo de referencia en la tarjeta.
- Paginación: 10 por página, `order by nombre`, solo `activo = true`, scroll
  infinito (`FlatList.onEndReached`). Estados: cargando, vacío ("Aún no hay pasteles
  en el catálogo"), error con "Reintentar", y fin de lista sin más peticiones.

### D7. Precio — ⚠️ Confirmar montos
- Fórmula: `PrecioBase(tamaño) + CostoNivelExtra × (niveles − 1) + CostoRelleno`.
  El sabor del pan no afecta el precio.
- Montos **provisionales** (MXN), definidos en `src/constants/precios.ts`:

  | Tamaño | Base | | Relleno | Costo |
  |---|---|---|---|---|
  | 10 | $350 | | Cajeta | $0 |
  | 15 | $500 | | Mermelada de fresa | $0 |
  | 20 | $650 | | Crema pastelera | $30 |
  | 30 | $900 | | Chocolate | $40 |
  | Nivel extra | $250 c/u | | Mantequilla de maní | $50 |

- Mientras no se elija relleno, se muestra el precio sin relleno con la leyenda
  "desde".
- Formato: `$1,250.00 MXN`, 2 decimales.
- En F01 el precio lo calcula la app y se guarda en `pedido_detalle.precio_estimado`
  y `pedidos.total`. En F03 se recalcula en el servidor (función SQL) antes de
  confirmar, para que el cliente no pueda alterar el total.

### D8. Mensaje de decoración
- Se aplica `trim()`; un texto vacío o solo con espacios se guarda como `null`.
- El contador y el límite de 500 cuentan caracteres visibles (`[...texto].length`),
  para que un emoji cuente como 1. El `TextInput` no permite pasar de 500.
- El paso 3 se puede completar sin mensaje y sin imagen (ambos opcionales).

### D9. Imagen de referencia
- Una sola imagen, solo de la galería (cámara fuera del MVP). Se puede reemplazar o
  quitar.
- MIME aceptados: `image/jpeg`, `image/png`, `image/heic`, `image/heif`. Si el picker
  no informa MIME, se valida por extensión. Tamaño máximo: **5 MB** → si se excede:
  "La imagen supera 5 MB".
- Se pide con `quality: 0.8`, lo que en iOS convierte HEIC a JPG.
- Permiso de galería denegado → mensaje "Necesitamos acceso a tu galería" con botón
  para abrir Ajustes.
- Se sube a Storage al presionar "Siguiente" en el paso 3, en
  `referencias-pasteles/{usuario_id}/{pedido_id}/referencia.<ext>` (upsert, así un
  reemplazo no deja archivos huérfanos). Se guarda la ruta en
  `imagen_referencia_url`; se muestra con URL firmada.

## Tareas
- [x] Migración `006_ajustes_borrador.sql` (D1) en `backend/supabase/migrations/`.
- [ ] Menú lateral (Drawer) en los `_layout.tsx` de cada rol según `01-navigation.md` (pendiente de F00; requiere `@react-navigation/drawer`, `react-native-gesture-handler` y `react-native-reanimated`).
- [ ] `src/constants/catalogoSabores.ts` (assets locales de sabores).
- [ ] `src/constants/precios.ts` y función `calcularPrecio()` (D7).
- [ ] `PedidoContext` para mantener el estado del wizard entre pasos.
- [ ] `(cliente)/home.tsx` con catálogo paginado (tarjetas en 2 columnas según el diseño).
- [ ] `pedido/nuevo/index.tsx` (tamaño + niveles).
- [ ] `pedido/nuevo/sabor.tsx` (selector con resaltado visual).
- [ ] `pedido/nuevo/decoracion.tsx` (texto + `expo-image-picker`).
- [ ] Función `guardarBorrador()` en `src/services/pedidosService.ts`.
- [ ] Validación de MIME type antes de subir a Storage.
- [ ] Probar criterios de aceptación.
