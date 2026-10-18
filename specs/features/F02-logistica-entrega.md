# Feature F02: Logística de entrega

## Objetivo
Capturar cómo y cuándo el cliente recibirá su pedido: domicilio (con ubicación
por mapa) o recolección en sucursal, junto con fecha y horario.

## Actor
Cliente.

## Precondiciones
El pedido ya tiene su `pedido_detalle` completo (depende de F01).

## Datos de entrada
- tipo_entrega (obligatorio — "Domicilio" o "Sucursal")
- Si domicilio: calle, número exterior (obligatorio), número interior (opcional),
  colonia, referencias, coordenadas del mapa
- teléfono de contacto (obligatorio en ambos tipos, ver D4)
- fecha_entrega (obligatorio)
- horario_entrega (obligatorio — bloques predefinidos, ver D2)

## Flujo principal
1. El usuario elige "Domicilio" o "Sucursal".
2. Si es domicilio: se abre un mapa interactivo; el usuario mueve un pin o busca
   su dirección.
3. Al fijar el pin, se autocompletan los campos Calle, Número exterior y Colonia
   mediante geocodificación inversa; el usuario puede corregirlos manualmente y
   debe completar el Número interior solo si aplica.
4. Si es sucursal: se muestra la dirección fija de la sucursal (no editable).
5. El usuario elige fecha y horario de entrega, respetando la anticipación mínima.
6. Continúa a F03 (checkout).

## Validaciones y reglas de negocio
- Fecha mínima según niveles (ver D3).
- El calendario debe deshabilitar visualmente los días no disponibles.
- Calle, número exterior y colonia son obligatorios si `tipo_entrega = 'domicilio'`;
  número interior es opcional.
- Las coordenadas (`direccion_lat`, `direccion_lng`) son obligatorias si es domicilio.

## Casos de error
- Fecha con menos de la anticipación requerida → mensaje: "Los pedidos requieren
  al menos [X] de anticipación".
- Permiso de ubicación denegado → permitir buscar dirección por texto como
  alternativa, sin bloquear el flujo.
- Error de conexión al geocodificar → permitir llenar los campos manualmente.

## Resultado esperado
El pedido queda con todos los datos de entrega completos y válidos, listo para
checkout.

## Criterios de aceptación
- [ ] El usuario puede fijar su ubicación en un mapa y ver los campos de
      dirección autocompletados.
- [ ] El calendario bloquea fechas no permitidas según el número de niveles.
- [ ] No se puede avanzar sin dirección completa si eligió domicilio.
- [ ] La opción "Sucursal" muestra la dirección fija sin pedir mapa.

## Decisiones (supuestos v1)

> Los supuestos de negocio (marcados **✔️ Aceptado**) se aceptaron el 2026-10-17 como
> valores del MVP; el resto son decisiones técnicas.

### D1. Ajustes al esquema (migración `008_entrega_y_confirmacion.sql`, compartida con F03)

| Cambio | Motivo |
|---|---|
| `pedidos.calle`, `numero_exterior`, `numero_interior`, `colonia` (text) | Los campos del formulario no existían; `direccion` queda como texto legible armado con ellos (lo usa el repartidor en F06) |
| `pedidos.telefono_contacto` (text, `check` 10 dígitos) | La pastelería necesita contactar al cliente (D4) |
| `check (hora_entrega in ('10:00','12:00','14:00','16:00'))` | `hora_entrega` guarda el **inicio** del bloque de 2 h (D2); no se cambia el tipo de columna |
| `paso_actual` → `check between 1 and 5` | Hoy llega a 3; el borrador debe poder retomarse en entrega (4) y pago (5) |
| Función SQL `fecha_minima_entrega(niveles)` | La misma regla de D3 se valida en el servidor al confirmar (F03) |

`tipo_entrega = 'recoleccion'` deja calle/número/colonia/coordenadas en `null`.

### D2. Horario de entrega — ✔️ Aceptado
- Bloques de 2 h: **10:00–12:00, 12:00–14:00, 14:00–16:00, 16:00–18:00**.
- Mismos bloques para domicilio y recolección.
- Sin límite de pedidos por bloque en el MVP (la pastelería ajusta en F04).

### D3. Fecha mínima y días disponibles — ✔️ Aceptado
| Niveles | Anticipación mínima |
|---|---|
| 1 | 2 días (hoy + 2) |
| 2 | 7 días |
| 3–4 | **10 días** (la regla original decía "caso por caso") |

- Se cuentan días de calendario en la zona horaria de la sucursal, `America/Tijuana`
  (Ensenada, B.C.), tanto en la app como en el servidor; "48 h" se
  interpreta como "a partir del día de pasado mañana", sin importar la hora.
- Días de entrega: **lunes a sábado** (domingo deshabilitado).
- Fecha máxima: hoy + 60 días.
- Mensaje de error: "Los pedidos de N niveles requieren al menos X días de
  anticipación".

### D4. Datos de contacto y dirección
- Teléfono: 10 dígitos (México), obligatorio en domicilio **y** en recolección.
- Calle, número exterior y colonia: obligatorios en domicilio, `trim()`, máx. 100
  caracteres. Número interior y referencias: opcionales (referencias máx. 200).
- `direccion` (texto) se arma: `Calle NumExt [Int NumInt], Colonia`.

### D5. Mapa y geocodificación
- `react-native-maps` + `expo-location` (ambos funcionan en Expo Go).
- Región inicial: ubicación del usuario si da permiso; si no, la de la sucursal.
- El usuario fija el pin tocando el mapa o arrastrándolo.
- Geocodificación inversa y búsqueda por texto con `Location.reverseGeocodeAsync` /
  `Location.geocodeAsync` (geocodificador del dispositivo, sin API key ni costo).
- Si falla (sin conexión o sin resultados): aviso "No pudimos obtener la dirección,
  llénala manualmente"; las coordenadas del pin se conservan.
- **Zona de entrega — ✔️ Aceptado:** radio de **15 km** desde la sucursal. Fuera de
  ella: "Esta dirección está fuera de nuestra zona de entrega; puedes elegir
  recolección en sucursal".
- **Costo de envío — ✔️ Aceptado:** gratis en el MVP (no cambia el precio).

### D6. Sucursal — ✔️ Aceptado
- Una sola sucursal, en `src/constants/sucursal.ts`:
  - Nombre: Pastelería ORNE.
  - Dirección: Calle Primera, C.P. 22785, Ensenada, B.C. (ubicación de referencia
    para el MVP, elegida por el equipo).
  - Coordenadas: `31.782259, -116.5956174`.
  - Horario de recolección: los mismos bloques de D2, lunes a sábado.

### D7. Calendario
- Componente propio (`src/components/pedido/Calendario.tsx`), sin dependencia nueva:
  vista mensual, días fuera de rango o domingos en gris y no seleccionables,
  flechas para cambiar de mes.

### D8. Guardado del borrador
- "Siguiente" en el paso 4 valida y guarda los datos de entrega (update de
  `pedidos`) con `paso_actual = 5`, igual que los pasos de F01.
- Cambiar de domicilio a sucursal limpia los campos de dirección al guardar.

## Cambios en F01
- El paso 3 deja de llevar a "Mis pedidos": "Siguiente" avanza a `entrega.tsx`.
- El indicador de pasos pasa a 5: Pastel · Sabor · Decoración · Entrega · Pago.
- `PasoPedido` pasa a `1 | 2 | 3 | 4 | 5`.

## Tareas
- [ ] Migración `008_entrega_y_confirmacion.sql` (D1, compartida con F03).
- [ ] Instalar y configurar `react-native-maps` + `expo-location`.
- [ ] `src/constants/sucursal.ts` y `src/constants/horarios.ts`.
- [ ] Funciones de fecha mínima, días disponibles y zona de entrega en `src/utils/` (con pruebas).
- [ ] `Calendario.tsx` y selector de bloques de horario.
- [ ] `pedido/nuevo/entrega.tsx` con mapa + formulario de dirección.
- [ ] Geocodificación inversa y búsqueda por texto (`src/services/ubicacionService.ts`).
- [ ] `guardarBorrador()` guarda los datos de entrega.
- [ ] Ajustes de F01 (paso 3 → entrega, indicador de 5 pasos).
- [ ] Probar criterios de aceptación.
