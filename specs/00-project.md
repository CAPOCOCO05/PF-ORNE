# Proyecto final — ORNE

## Nombre
ORNE — Aplicación de personalización y pedido de pastelería

## Problema
Los clientes de una pastelería deben acudir físicamente a la sucursal o coordinar por
teléfono/mensajes para describir un pastel personalizado. Esto es lento, confuso y
propenso a errores de comunicación (sabor, tamaño, decoración, fecha de entrega).

## Usuarios (roles)
Una sola app; lo que ve cada usuario depende de su **rol** (tabla `perfiles`, ver
`02-data-model.md`).

| Rol | Quién es | Qué hace |
|---|---|---|
| `cliente` | Persona que encarga un pastel desde su celular | Arma su pastel, programa la entrega, confirma el pedido y consulta sus pedidos |
| `admin` | Personal de la pastelería (administrador/cajero) | Consulta todos los pedidos con su detalle, cambia su estado y asigna repartidor |
| `repartidor` | Persona que entrega los pedidos a domicilio | Consulta sus entregas asignadas y la ubicación, y marca el pedido como entregado |

Todo usuario que se registra desde la app es `cliente`. Los roles `admin` y
`repartidor` se asignan manualmente en la base de datos.

## Propuesta de solución
App móvil (Expo + React Native) donde el cliente arma su pastel paso a paso
(tamaño, niveles, sabor, relleno, decoración), programa la entrega (domicilio con
mapa o recolección en sucursal) y confirma el pedido, recibiendo un ID único de
seguimiento. El admin da seguimiento al pedido y el repartidor lo entrega.

Backend gestionado con Supabase (Postgres + Auth + Storage), **separado del proyecto
móvil** dentro del mismo repositorio: `frontend/` (app) y `backend/` (migraciones
SQL). Ver `backend/README.md`.

## Diseño
Pantallas, paleta de colores y elementos visuales en `specs/design/`. Toda pantalla
debe seguir la paleta:

| Uso | Color |
|---|---|
| Fondo | `#f6f4f3` |
| Letras del logo | `#a50e16` |
| Títulos | `#5b0e17` |
| Figuras decorativas | `#88131d` |
| Botón principal | `#b2181d` |
| Botón secundario | `#ffdadd` |

## MVP (features)
| Feature | Descripción | Rol | Estado |
|---|---|---|---|
| F00 | Autenticación (login / registro) y redirección por rol | Todos | ✅ Completa |
| F01 | Catálogo y configuración del pastel | Cliente | ✅ Completa |
| F02 | Logística de entrega | Cliente | ✅ Completa |
| F03 | Checkout y generación de ID de pedido | Cliente | ✅ Completa |
| F04 | Panel administrativo (consulta y cambio de estado) | Admin | ✅ Completa |
| F05 | Manejo de errores y validaciones (transversal) | Todos | 🔲 Pendiente |
| F06 | Entregas del repartidor | Repartidor | ✅ Completa (falta probar en un dispositivo) |

**Orden de implementación:** F00 → catálogo de F01 (pantalla de inicio) → resto de
F01 → F02 → F03 → F04 → F06. F05 se aplica en cada una.

## Reglas de negocio clave
- Fecha mínima de entrega: hoy + 2 días (1 nivel), +7 días (2 niveles), +10 días
  (3-4 niveles), en hora de Ensenada (`America/Tijuana`). Ver F02, D3.
- Sucursal única: Calle Primera, C.P. 22785, Ensenada, B.C. Entrega a domicilio en
  un radio de 15 km, gratis.
- Precio = PrecioBase(tamaño + niveles) + CostoAdicionalRelleno (+ costo decoración
  si se integra IA de estimación; por ahora precio fijo por complejidad).
- ID de pedido: alfanumérico único (columna `folio` en tabla `pedidos`).
- Un usuario puede tener múltiples pedidos (relación 1 a muchos ya soportada por
  la FK `usuario_id` en `pedidos`).
- El ciclo de estados del pedido y quién puede cambiar cada uno está en
  `02-data-model.md` ("Estados del pedido").

## Fuera de alcance del MVP
- Asignar o cambiar roles desde la app (se hace en la base de datos).
- Pagos automatizados en tiempo real (solo se mostrarán datos bancarios / simulación).
- Rastreo del repartidor en tiempo real.
- Chat en tiempo real.
- Facturación automática compleja.
- Recuperación de contraseña ("Olvidé mi contraseña" se muestra, pero aún no
  funciona; ver F00).
