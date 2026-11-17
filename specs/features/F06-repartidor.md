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

Mismo encabezado y barra inferior que los demás roles (F08 N1, ver `01-navigation.md`).

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
- [x] El repartidor solo ve los pedidos que tiene asignados.
- [x] La ubicación de entrega se muestra en un mapa y se puede abrir en la app de
      mapas.
- [x] Puede marcar un pedido como entregado y la lista se actualiza.
- [x] No puede cambiar el pedido a ningún otro estado ni ver pedidos ajenos
      (probado contra la base de datos con
      `backend/supabase/tests/permisos_repartidor.sql`: todo OK).

## Decisiones (supuestos v1)

### D1. Nombre del cliente (migración `010_repartidor_ve_clientes.sql`)
`perfiles` solo dejaba ver el propio perfil (y al admin todos), así que el nombre
del cliente llegaba vacío. Nueva política: el repartidor ve el perfil de los
clientes con un pedido `en_camino` asignado a él. Al entregarlo deja de verlo.

### D2. Lista sin paginar
Un repartidor tiene pocas entregas en curso a la vez; se traen todas las
`en_camino` ordenadas por fecha, hora e `id`. La lista se recarga al volver a la
pantalla y al deslizar hacia abajo.

### D3. "Cómo llegar"
iOS abre Apple Maps (`maps.apple.com/?daddr=`); Android, Google Maps
(`google.com/maps/dir/?api=1&destination=`), que abre la app si está instalada.
Sin coordenadas se usa la dirección en texto (`src/utils/mapas.ts`).

### D4. Cambios simultáneos
El update solo aplica si el pedido sigue `en_camino` (como F04 D6). Si ya no lo
está, se avisa "Esta entrega ya no está en camino" y se regresa a la lista.

### D5. "Entregados hoy"
Sección opcional; queda fuera de esta versión.

## Tareas
- [x] Políticas RLS del repartidor en `007_estados_y_roles.sql` (+ `010` para el nombre del cliente, D1).
- [x] `src/services/repartidorService.ts`: listar entregas, obtener detalle, marcar
      como entregado.
- [x] `repartidor/_layout.tsx`, `repartidor/index.tsx`,
      `repartidor/entrega/[id].tsx` (usa `react-native-maps`, ya requerido por F02).
- [x] Abrir la app de mapas con `Linking`.
- [x] Script de permisos `backend/supabase/tests/permisos_repartidor.sql`.
- [x] Probar criterios de aceptación (pruebas de la app ✅, permisos en Supabase ✅, dispositivo ✅).
