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
  colonia, referencias, teléfono de contacto, coordenadas del mapa
- fecha_entrega (obligatorio)
- horario_entrega (obligatorio — bloques predefinidos, ej. 10:00-12:00, 14:00-16:00)

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
- Fecha mínima: hoy + 48h si el pastel es de 1 nivel; hoy + 7 días si es de 2
  niveles; evaluar caso por caso si es de 3-4 niveles (mayor tiempo de producción).
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

## Tareas
- [ ] Instalar y configurar `react-native-maps` + `expo-location`.
- [ ] `pedido/nuevo/entrega.tsx` con mapa + formulario de dirección.
- [ ] Función de geocodificación inversa (coordenadas → texto).
- [ ] Lógica de fecha mínima según `niveles` del pedido.
- [ ] Selector de bloques de horario predefinidos.
- [ ] Probar criterios de aceptación.
