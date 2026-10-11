# Proyecto final — ORNE

## Nombre
ORNE — Aplicación de personalización y pedido de pastelería

## Problema
Los clientes de una pastelería deben acudir físicamente a la sucursal o coordinar por
teléfono/mensajes para describir un pastel personalizado. Esto es lento, confuso y
propenso a errores de comunicación (sabor, tamaño, decoración, fecha de entrega).

## Usuario objetivo
**Cliente / Comprador**: persona que necesita cotizar y encargar un pastel para un
evento o consumo personal, de forma remota, desde su celular.

Usuarios secundarios identificados pero **fuera del alcance de este sprint**:
Administrador/Cajero y Repartidor (ver sección "Fuera de alcance").

## Propuesta de solución
App móvil (Expo + React Native) donde el cliente arma su pastel paso a paso
(tamaño, niveles, sabor, relleno, decoración), programa la entrega (domicilio con
mapa o recolección en sucursal) y confirma el pedido, recibiendo un ID único de
seguimiento. Backend gestionado con Supabase (Postgres + Auth + Storage), **separado
del proyecto móvil** dentro del mismo repositorio: `frontend/` (app) y `backend/`
(migraciones SQL). Ver `backend/README.md`.

## MVP (features)
| Feature | Descripción | Estado |
|---|---|---|
| F00 | Autenticación (registro / login) | ✅ Implementado |
| F01 | Catálogo y configuración del pastel | 🔲 Por especificar → implementar |
| F02 | Logística de entrega | 🔲 Pendiente |
| F03 | Checkout y generación de ID de pedido | 🔲 Pendiente |
| F04 | Panel administrativo | ⏸ Diferido (fuera de este sprint) |
| F05 | Manejo de errores y validaciones (transversal) | 🔲 Pendiente |

## Reglas de negocio clave
- Fecha mínima de entrega: hoy + 48h (1 nivel). +7 días si tiene 2 niveles.
  3-4 niveles: evaluar caso por caso (tiempo de producción mayor).
- Precio = PrecioBase(tamaño + niveles) + CostoAdicionalRelleno (+ costo decoración
  si se integra IA de estimación; por ahora precio fijo por complejidad).
- ID de pedido: alfanumérico único (columna `folio` en tabla `pedidos`).
- Un usuario puede tener múltiples pedidos (relación 1 a muchos ya soportada por
  la FK `usuario_id` en `pedidos`).

## Fuera de alcance del MVP
- Panel de administración (F04) — se construirá como segunda fase o app separada.
- Pagos automatizados en tiempo real (solo se mostrarán datos bancarios / simulación).
- Rastreo del repartidor en tiempo real.
- Chat en tiempo real.
- Facturación automática compleja.
