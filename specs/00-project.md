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

## Arquitectura
El frontend y el backend están **separados** dentro del mismo repositorio (F11):

```
frontend/ (app Expo) ──HTTP──► backend/src (API en capas) ──► Supabase (Postgres + Auth + Storage)
```

- `frontend/`: pantallas, navegación y estado de la app. Pide todos los datos a la API
  (`src/services/`); usa Supabase directamente solo para iniciar sesión.
- `backend/src/`: API propia (Node + Express + TypeScript) con arquitectura en capas:
  rutas → controladores → servicios → repositorios. Valida los datos y aplica las
  reglas del negocio.
- `backend/supabase/`: esquema, políticas de seguridad (RLS), triggers y funciones,
  como migraciones SQL. La API consulta la base con el token del usuario, así que RLS
  sigue protegiendo los datos.

Ver `backend/README.md` (endpoints y cómo correr la API) y F11.

## Diseño
Pantallas, paleta de colores y elementos visuales en `specs/design_2/` (paleta actual).
`specs/design/` es el diseño anterior (rojo), solo como referencia. Toda pantalla debe
seguir la paleta (`frontend/src/theme/colors.ts`):

| Uso | Color | Token |
|---|---|---|
| Fondo | `#f6f4f3` | `FONDO` |
| Títulos, letras del logo, íconos (perfil, pastel) | `#4a2c2a` | `TITULO`, `LOGO` |
| Botón principal | `#f7afbf` | `BOTON_PRINCIPAL` |
| Botón secundario y figura decorativa de atrás | `#ffdadd` | `BOTON_SECUNDARIO`, `DECORACION_CLARA` |
| Figura decorativa de enfrente | `#f9c6d3` | `DECORACION` |
| Pastilla del precio | `#c5ede7` | `PRECIO` |
| Botón de acciones que no se deshacen (salir del pedido, eliminar, cancelar) | `#ec7c9b` | `BOTON_DESTRUCTIVO` (apoyo, no está en la paleta) |

Los rosas son claros, así que se usan solo como **relleno**: el texto encima va en café
(`#4a2c2a`), nunca en blanco. Lo que antes usaba el rojo como texto, borde de lo elegido,
spinner, pin del mapa o pestaña activa usa el token de apoyo `ACENTO` (el mismo café).

## MVP (features)
| Feature | Descripción | Rol | Estado |
|---|---|---|---|
| F00 | Autenticación (login / registro) y redirección por rol | Todos | ✅ Completa |
| F01 | Catálogo y configuración del pastel | Cliente | ✅ Completa |
| F02 | Logística de entrega | Cliente | ✅ Completa |
| F03 | Checkout y generación de ID de pedido | Cliente | ✅ Completa |
| F04 | Panel administrativo (consulta y cambio de estado) | Admin | ✅ Completa |
| F05 | Manejo de errores y validaciones (transversal) | Todos | ✅ Completa |
| F06 | Entregas del repartidor | Repartidor | ✅ Completa |
| F07 | Mejoras posteriores al MVP (diálogos propios, no entregado, filtros, catálogo admin, nombre completo, perfil del cliente) | Todos | ✅ Completa |
| F08 | Barra de navegación inferior (tabs) y aviso de privacidad | Todos | ✅ Completa |
| F09 | Catálogo sin cuenta; la cuenta se pide al hacer el pedido | Visitante / Cliente | ✅ Completa |
| F10 | Ajustes para la revisión (CLABE por pedido, regreso al pedido tras registrarse, teclado, doble toque, validaciones) | Todos | ✅ Completa |
| F11 | Arquitectura en capas: API propia en `backend/` separada de la app | Todos | ✅ Completa (falta probar en dispositivo) |

**Orden de implementación:** F00 → catálogo de F01 (pantalla de inicio) → resto de
F01 → F02 → F03 → F04 → F06 → F07 → F08 → F09 → F10 → F11. F05 se aplica en cada una.

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
- Pagos automatizados en tiempo real (solo se muestran los datos bancarios para transferencia).
- Rastreo del repartidor en tiempo real.
- Chat en tiempo real.
- Facturación automática compleja.
- Recuperación de contraseña (el enlace "Olvidé mi contraseña" se quitó del login).
