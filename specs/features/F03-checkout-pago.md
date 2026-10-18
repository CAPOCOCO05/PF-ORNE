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

## Decisiones (supuestos v1)

> Los supuestos de negocio (marcados **✔️ Aceptado**) se aceptaron el 2026-10-17 como
> valores del MVP; el resto son decisiones técnicas.

### D1. Confirmación en el servidor (migración `008_entrega_y_confirmacion.sql`)
Toda la confirmación ocurre en **una función SQL** `confirmar_pedido(pedido_id)`
(`security definer`, una sola transacción), que la app llama con `supabase.rpc`:

1. Verifica que el pedido sea del usuario y esté en `borrador`.
2. Verifica que esté completo (detalle F01 + entrega F02) y que la fecha siga
   cumpliendo la anticipación mínima (`fecha_minima_entrega`, F02 D3).
3. **Recalcula el precio** con la fórmula de F01 D7 (función
   `calcular_precio(tamanio, niveles, relleno)`) y actualiza `total` y
   `precio_estimado`. Así el cliente no puede alterar el total.
4. Genera el folio (D2).
5. Inserta el pago en `pagos` (`metodo_pago = 'tarjeta'`, `monto = total`,
   `estado_pago = 'simulado'`).
6. Cambia el estado a `pendiente` (el trigger de `007` valida la transición).
7. Devuelve `folio` y `total`.

Si cualquier paso falla, no se guarda nada y el pedido sigue como borrador.
Se elimina la política que permitía al cliente insertar en `pagos` directamente:
solo la función crea pagos.

> Los montos de `calcular_precio` deben coincidir con `src/constants/precios.ts`.
> La app muestra el precio calculado localmente; el de la función es el definitivo.

### D2. Folio
- Formato `ORN-` + 6 caracteres de un alfabeto sin caracteres ambiguos
  (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`, sin 0/O/1/I/L) → ej. `ORN-7K2QXM`.
- Se genera en la función SQL (no en la app); si choca con uno existente
  (`unique`), se regenera en un ciclo, sin mostrar error.

### D3. Pago simulado — ✔️ Aceptado
- Único método: **"Tarjeta (transferencia o depósito)"**, ya seleccionado.
- La app **no captura números de tarjeta** (evita manejar datos sensibles).
- En la confirmación se muestran datos bancarios **de ejemplo** con el folio como
  referencia: banco, titular "Pastelería ORNE", CLABE de 18 dígitos y la leyenda
  "Pago simulado: no se realizará ningún cargo". Los datos son **ficticios**.

### D4. Pantallas
- **Paso 5 — `pago.tsx`:** resumen completo (pastel, sabores, decoración con
  miniatura de la imagen, entrega, fecha y horario, total), método de pago y
  botón **"Confirmar pedido"**. Cada sección tiene "Editar", que regresa al paso
  correspondiente.
- **Paso 6 — `confirmacion.tsx`:** folio grande, resumen como comprobante y datos
  bancarios. Reemplaza el historial: "Atrás" ya no regresa al wizard; botones
  "Ver mis pedidos" y "Volver al catálogo".
- **`(cliente)/pedido/[id].tsx`:** al tocar un pedido confirmado en "Mis pedidos"
  se abre el mismo comprobante (solo consulta).

### D5. Errores al confirmar
| Causa | Mensaje |
|---|---|
| Sin conexión | "Error de conexión. Tu pedido no se ha enviado. Inténtalo de nuevo." (con "Reintentar") |
| Fecha ya no válida (pasaron días) | "La fecha de entrega ya no está disponible, elige otra" → regresa al paso 4 |
| Pedido incompleto | "Faltan datos de tu pedido" → regresa al primer paso incompleto |
| Ya no es borrador | "Este pedido ya fue confirmado" → abre su comprobante |

La función identifica cada caso con un código de error propio y la app lo traduce.

## Tareas
- [ ] Migración `008` (D1, D2): `calcular_precio`, `confirmar_pedido`, políticas de `pagos`.
- [ ] `confirmarPedido()` en `src/services/pedidosService.ts` (llama al RPC) con traducción de errores (D5).
- [ ] `obtenerPedido(id)` para el resumen y el comprobante.
- [ ] Componente `ResumenPedido` (compartido por pago, confirmación y detalle).
- [ ] `pedido/nuevo/pago.tsx` (paso 5).
- [ ] `pedido/nuevo/confirmacion.tsx` (paso 6) con folio y datos bancarios.
- [ ] `(cliente)/pedido/[id].tsx` y enlace desde "Mis pedidos".
- [ ] Probar criterios de aceptación.
