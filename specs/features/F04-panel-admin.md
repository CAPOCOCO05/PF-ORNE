# Feature F04: Panel administrativo

## Objetivo
Permitir que el personal de la pastelería consulte los pedidos con todo su detalle y
los avance por su ciclo de estados, asignando repartidor a los pedidos a domicilio.

## Actor
Admin (depende de F00 para el rol).

## Precondiciones
Usuario con sesión y rol `admin`.

## Pantallas
- `admin/index.tsx` — lista de pedidos.
- `admin/pedido/[id].tsx` — detalle y acciones.

Mismo encabezado y barra inferior que el cliente (F08 N1, ver `01-navigation.md`), con la
paleta de `00-project.md`.

## Flujo principal
1. El admin inicia sesión y llega a la lista de pedidos.
2. La lista muestra, por pedido: folio, nombre del cliente, fecha y hora de entrega,
   tipo de entrega, total y estado (con color distinto por estado). Ordenada por
   fecha de entrega más próxima. Los `borrador` no se muestran.
3. Puede filtrar por estado (chips arriba de la lista: Pendientes, Confirmados, En
   preparación, Listos, En camino, Entregados, Cancelados).
4. Toca un pedido y ve el detalle completo:
   - Pastel: tamaño, niveles, pan, relleno (con su imagen), mensaje de decoración e
     imagen de referencia.
   - Entrega: tipo, dirección y referencias (o "Recolección en sucursal"), fecha y
     hora.
   - Pago: método, monto y estado del pago.
   - Cliente: nombre.
5. Cambia el estado con un botón para el **siguiente estado permitido** (ej.
   "Confirmar pedido", "Iniciar preparación", "Marcar como listo").
6. Para un pedido a domicilio en `listo`, elige un repartidor de la lista y presiona
   "Enviar a reparto" → `repartidor_id` asignado y estado `en_camino`.
7. Para un pedido de recolección en `listo`, presiona "Marcar como entregado".
8. Puede cancelar un pedido en `pendiente` o `confirmado` (con diálogo de
   confirmación).

## Validaciones y reglas de negocio
- Solo se ofrecen las transiciones válidas de `02-data-model.md` ("Estados del
  pedido"); la base de datos rechaza cualquier otra.
- "Enviar a reparto" exige elegir un repartidor.
- Toda acción que cambia el estado pide confirmación ("¿Marcar el pedido <folio>
  como listo?").
- La lista se carga paginada (10 por página) y se actualiza al volver del detalle.

## Casos de error
- Error de conexión al cargar → mensaje + "Reintentar" (F05).
- Error al cambiar el estado → "No se pudo actualizar el pedido, inténtalo de
  nuevo"; el estado mostrado no cambia.
- El pedido cambió mientras se veía (otro admin lo movió) → se recarga el detalle y
  se avisa "El pedido fue actualizado".
- Sin repartidores registrados → "No hay repartidores disponibles".
- Lista vacía → "No hay pedidos en este estado".

## Resultado esperado
El pedido avanza por su ciclo de estados y, si es a domicilio, queda asignado a un
repartidor.

## Criterios de aceptación
- [x] El admin ve los pedidos de todos los clientes (excepto borradores).
- [x] El detalle muestra todo lo capturado en F01, F02 y F03.
- [x] Solo se puede avanzar al siguiente estado válido.
- [x] Un pedido a domicilio solo pasa a `en_camino` con repartidor asignado.
- [x] Un usuario que no es admin no puede ver ni cambiar estos datos (probado
      contra la base de datos, no solo la app).

## Decisiones (supuestos v1)

> Aceptadas el 2026-10-24.

### D1. Validar el repartidor (migración `009_validar_repartidor.sql`)
El trigger `validar_cambio_pedido` de `007` aceptaba como `repartidor_id` cualquier
perfil. Se redefine para exigir que el perfil asignado tenga `rol = 'repartidor'`
(también desde el Dashboard).

### D2. Estados en `src/constants/estadosPedido.ts`
En lugar de un `estados.ts` nuevo se amplía el archivo existente con el color de cada
estado, las acciones del admin (texto del botón y pregunta de confirmación) y los
filtros de la lista. La lógica (`accionesDisponibles`, `estadosDeFiltro`) va en
`src/utils/estados.ts` con pruebas y debe coincidir con el trigger.

| Estado actual | Acciones |
|---|---|
| `pendiente` | "Confirmar pedido", "Cancelar pedido" |
| `confirmado` | "Iniciar preparación", "Cancelar pedido" |
| `en_preparacion` | "Marcar como listo" |
| `listo` (domicilio) | "Enviar a reparto" (exige repartidor) |
| `listo` (recolección) | "Marcar como entregado" |

### D3. Filtros de la lista
Chip **"Activos"** por defecto (`pendiente` a `en_camino`) más los chips del flujo.
Los activos y cada estado en curso se ordenan por la entrega más próxima (fecha y
hora); **Entregados** y **Cancelados**, del más reciente al más antiguo.

### D4. Paginación
10 por página con scroll infinito (mismo patrón que el catálogo, `range` pidiendo un
registro de más). La primera página se recarga al volver a la pantalla
(`useFocusEffect`) y al cambiar de filtro.

### D5. Detalle
Reutiliza `ResumenPedido` (pastel, sabores con su imagen, decoración, entrega) y
agrega **Cliente** (nombre y teléfono de contacto), **Pago** (método, monto, estado
del pago), el repartidor asignado si lo hay y **Acciones**.

### D6. Cambios simultáneos
El cambio de estado se envía con la condición `estado = <estado mostrado>`. Si no se
actualiza ninguna fila (otro admin ya lo movió), se recarga el detalle y se avisa
"El pedido fue actualizado".

### D7. Repartidor
Para "Enviar a reparto" se elige un repartidor de una lista de opciones (perfiles con
`rol = 'repartidor'`); el botón no se habilita hasta elegir uno.

### D8. Prueba de permisos contra la base
`backend/supabase/tests/permisos_admin.sql` se corre en el SQL Editor: simula a otro
cliente, al dueño, a un repartidor y al admin, verifica lo que cada uno puede ver y
cambiar, y deshace todo al final (`rollback`).

## Tareas
- [x] Migración `007_estados_y_roles.sql` (ver `02-data-model.md`).
- [x] Migración `009_validar_repartidor.sql` (D1).
- [x] `src/services/adminService.ts`: listar pedidos, obtener detalle, cambiar
      estado, listar repartidores, asignar repartidor.
- [x] `src/constants/estadosPedido.ts` y `src/utils/estados.ts`: colores, acciones
      y filtros (D2, D3).
- [x] `admin/_layout.tsx`, `admin/index.tsx`, `admin/pedido/[id].tsx`.
- [x] Script de permisos `backend/supabase/tests/permisos_admin.sql` (D8).
- [x] Probar criterios de aceptación.
