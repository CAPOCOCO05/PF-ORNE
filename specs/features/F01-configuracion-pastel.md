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
- sabor_pan (obligatorio — Vainilla, Chocolate, Red Velvet, Café, Tres leches,
  Fresa, Zanahoria)
- sabor_relleno (obligatorio — Cajeta, Fresa, Nutella, Crema pastelera,
  Mantequilla de maní)
- mensaje_decoracion (opcional — texto libre, máx. 500 caracteres)
- imagen_decoracion (opcional — solo formato imagen: jpg, png, heic)

## Flujo principal
1. El usuario ve el catálogo paginado (`(tabs)/home.tsx`) o presiona "Crear pedido".
2. Se crea un pedido con `estado = 'borrador'`.
3. Paso 1 — selecciona tamaño y niveles.
4. Paso 2 — selecciona sabor de pan y relleno (cada opción se muestra resaltada al
   seleccionarse).
5. Paso 3 — escribe mensaje de decoración y/o adjunta imagen de referencia.
6. En cualquier paso puede regresar al anterior sin perder lo ya capturado.
7. En cualquier paso puede salir; el borrador queda guardado y aparece en
   "Mis pedidos" para retomarlo.
8. Al terminar el paso 3, continúa a F02 (logística de entrega).

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
- El catálogo base (`(tabs)/home.tsx`) se consulta con paginación (ej. 10 items
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

## Tareas
- [ ] `src/constants/catalogoSabores.ts` (assets locales de sabores).
- [ ] `PedidoContext` para mantener el estado del wizard entre pasos.
- [ ] `(tabs)/home.tsx` con catálogo paginado.
- [ ] `pedido/nuevo/index.tsx` (tamaño + niveles).
- [ ] `pedido/nuevo/sabor.tsx` (selector con resaltado visual).
- [ ] `pedido/nuevo/decoracion.tsx` (texto + `expo-image-picker`).
- [ ] Función `guardarBorrador()` en `src/services/pedidosService.ts`.
- [ ] Validación de MIME type antes de subir a Storage.
- [ ] Probar criterios de aceptación.
