# Feature F05: Manejo de excepciones y mensajes (transversal)

No es una pantalla propia, sino un estándar que deben seguir F01, F02 y F03.

## Objetivo
Garantizar que el usuario siempre reciba retroalimentación clara ante errores de
validación o de conexión, en vez de pantallas que se quedan "congeladas" o fallan
en silencio.

## Estados que toda pantalla con datos externos debe contemplar
- Cargando (spinner).
- Datos disponibles (caso normal).
- Lista vacía (ej. catálogo sin resultados, "Mis pedidos" sin pedidos aún).
- Error de conexión (mensaje + botón "Reintentar").

## Reglas
- Errores de **validación** (campo obligatorio vacío, formato inválido) se
  muestran junto al campo, en rojo, de forma inmediata — no esperan al envío del
  formulario.
- Errores **técnicos o de red** se muestran como modal/alerta general, con opción
  de reintentar, y nunca deben perder el progreso ya capturado por el usuario.

## Criterios de aceptación
- [ ] Ningún formulario del flujo de pedido permite avanzar con campos
      obligatorios vacíos.
- [ ] Todo error de red muestra un mensaje entendible, no un crash ni pantalla
      en blanco.
- [ ] Las listas (catálogo, mis pedidos) manejan correctamente el caso "vacío".
