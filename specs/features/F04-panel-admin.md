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

Mismo encabezado y menú lateral que el cliente (ver `01-navigation.md`), con la
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
- [ ] El admin ve los pedidos de todos los clientes (excepto borradores).
- [ ] El detalle muestra todo lo capturado en F01, F02 y F03.
- [ ] Solo se puede avanzar al siguiente estado válido.
- [ ] Un pedido a domicilio solo pasa a `en_camino` con repartidor asignado.
- [ ] Un usuario que no es admin no puede ver ni cambiar estos datos (probado
      contra la base de datos, no solo la app).

## Tareas
- [ ] Migración `007_estados_y_roles.sql` (ver `02-data-model.md`).
- [ ] `src/services/adminService.ts`: listar pedidos, obtener detalle, cambiar
      estado, listar repartidores, asignar repartidor.
- [ ] `src/constants/estados.ts`: nombres, colores y transiciones permitidas.
- [ ] `admin/_layout.tsx`, `admin/index.tsx`, `admin/pedido/[id].tsx`.
- [ ] Probar criterios de aceptación.
