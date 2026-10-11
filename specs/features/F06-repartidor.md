# Feature F06: Entregas del repartidor

## Objetivo
Permitir que el repartidor vea los pedidos que le asignaron, encuentre la ubicación
de entrega y marque el pedido como entregado.

## Actor
Repartidor (depende de F00 para el rol y de F04 para la asignación).

## Precondiciones
Usuario con sesión y rol `repartidor`. El admin le asignó pedidos (estado
`en_camino`).

## Pantallas
- `repartidor/index.tsx` — mis entregas.
- `repartidor/entrega/[id].tsx` — ubicación y acción.

Mismo encabezado y menú lateral que los demás roles (ver `01-navigation.md`).

## Flujo principal
1. El repartidor inicia sesión y llega a "Mis entregas".
2. Ve sus pedidos `en_camino`, ordenados por fecha y hora de entrega: folio, nombre
   del cliente, hora de entrega y dirección resumida.
3. Toca una entrega y ve:
   - Mapa con un pin en `direccion_lat` / `direccion_lng`.
   - Dirección completa y referencias ("casa azul, portón negro").
   - Fecha y hora de entrega, y folio.
   - Resumen del pastel (tamaño y niveles), para saber qué lleva.
4. Botón "Cómo llegar" → abre la app de mapas del teléfono (Google Maps / Apple
   Maps) con la ruta a esas coordenadas.
5. Al entregar, presiona "Marcar como entregado" → diálogo de confirmación → estado
   `entregado`. El pedido desaparece de su lista.

## Validaciones y reglas de negocio
- Solo ve los pedidos con `repartidor_id` igual a su usuario y estado `en_camino`.
- Solo puede cambiar `en_camino → entregado`; la base de datos rechaza cualquier
  otro cambio.
- No ve precios ni datos de pago.
- Sección opcional "Entregados hoy" para consultar lo ya entregado (solo lectura).

## Casos de error
- Error de conexión al cargar → mensaje + "Reintentar" (F05).
- Error al marcar como entregado → "No se pudo actualizar la entrega, inténtalo de
  nuevo"; el pedido sigue en la lista.
- Pedido sin coordenadas (caso extremo) → se muestra solo la dirección en texto y
  "Cómo llegar" busca por la dirección.
- Lista vacía → "No tienes entregas asignadas".

## Resultado esperado
El pedido queda en estado `entregado` y deja de aparecer en las entregas pendientes
del repartidor.

## Criterios de aceptación
- [ ] El repartidor solo ve los pedidos que tiene asignados.
- [ ] La ubicación de entrega se muestra en un mapa y se puede abrir en la app de
      mapas.
- [ ] Puede marcar un pedido como entregado y la lista se actualiza.
- [ ] No puede cambiar el pedido a ningún otro estado ni ver pedidos ajenos
      (probado contra la base de datos, no solo la app).

## Tareas
- [ ] Políticas RLS del repartidor en `007_estados_y_roles.sql`.
- [ ] `src/services/repartidorService.ts`: listar entregas, obtener detalle, marcar
      como entregado.
- [ ] `repartidor/_layout.tsx`, `repartidor/index.tsx`,
      `repartidor/entrega/[id].tsx` (usa `react-native-maps`, ya requerido por F02).
- [ ] Abrir la app de mapas con `Linking`.
- [ ] Probar criterios de aceptación.
