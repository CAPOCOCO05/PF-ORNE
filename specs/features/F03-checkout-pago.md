# Feature F03: Checkout, pago y generación de pedido

## Objetivo
Mostrar el resumen completo del pedido, procesar el método de pago (tarjeta) y
generar un ID único como comprobante.

## Actor
Cliente.

## Precondiciones
Pedido con detalle (F01) y logística de entrega (F02) completos.

## Datos de entrada
- metodo_pago (obligatorio — único valor soportado: "tarjeta")

## Flujo principal
1. El usuario ve el resumen: ingredientes/especificaciones, imagen adjunta,
   dirección/fecha/hora de entrega y costo final.
2. Selecciona "Pago con tarjeta".
3. Se muestran los datos bancarios para realizar el pago (simulación del flujo,
   sin procesar pagos reales en el MVP).
4. El usuario presiona "Confirmar pedido".
5. El sistema genera un `folio` único (letras + dígitos aleatorios) y cambia el
   `estado` del pedido de `borrador` a `pendiente`.
6. Se muestra la pantalla de confirmación con el folio y el resumen como
   comprobante digital.

## Validaciones
- No se puede confirmar sin haber completado F01 y F02.
- El folio generado debe ser único (verificar contra la tabla antes de guardar,
  o usar un formato con suficiente entropía para evitar colisiones).

## Casos de error
- Error de conexión al confirmar → modal: "Error de conexión. Tu pedido no se ha
  enviado. Inténtalo de nuevo." (el borrador no se pierde, sigue disponible).
- Folio duplicado (caso extremo) → regenerar automáticamente, sin mostrar error
  al usuario.

## Resultado esperado
Pedido con `estado = 'pendiente'`, folio único asignado, registro en la tabla
`pagos` con `estado_pago = 'simulado'`.

## Criterios de aceptación
- [ ] El resumen muestra todos los datos capturados en F01 y F02 sin omitir nada.
- [ ] Al confirmar, se genera un folio único visible en pantalla.
- [ ] El pedido cambia correctamente de "borrador" a "pendiente".
- [ ] Si falla la conexión, el usuario puede reintentar sin perder su progreso.

## Tareas
- [ ] `pedido/nuevo/pago.tsx` con selección de método de pago.
- [ ] `pedido/nuevo/confirmacion.tsx` con resumen + folio.
- [ ] Función `generarFolio()` en `src/utils/`.
- [ ] Función `confirmarPedido()` en `src/services/pedidosService.ts`.
- [ ] Registrar fila en tabla `pagos`.
- [ ] Probar criterios de aceptación.
