# Navegación (Expo Router)

## Árbol de rutas

Las rutas viven en `frontend/app/`. Cada rol tiene su propia sección, protegida por
su `_layout.tsx`.

```
app/
├── _layout.tsx                # AuthProvider global (Stack raíz)
├── index.tsx                  # Redirección según sesión y rol (ver abajo)
│
├── (auth)/                    # Sin sesión
│   ├── login.tsx              # F00
│   └── register.tsx           # F00
│
├── (cliente)/                 # Rol cliente — URLs sin prefijo (/home, /pedidos…)
│   ├── _layout.tsx            # Guardia de rol + Drawer con encabezado ORNE
│   ├── home.tsx               # F01 Catálogo base (paginado) — pantalla de inicio
│   ├── pedidos.tsx            # Mis pedidos (incluye borradores)
│   ├── perfil.tsx             # F07 M7 Datos personales, dirección guardada, cerrar sesión
│   ├── perfil/
│   │   └── editar.tsx         # F07 M7 Editar nombre, teléfono y dirección (no está en el menú)
│   └── pedido/
│       ├── nuevo/
│       │   ├── _layout.tsx        # Stack + PedidoProvider (estado del wizard)
│       │   ├── index.tsx          # Paso 1: tamaño + niveles (F01)
│       │   ├── sabor.tsx          # Paso 2: sabor de pan + relleno (F01)
│       │   ├── decoracion.tsx     # Paso 3: mensaje + imagen de referencia (F01)
│       │   ├── entrega.tsx        # Paso 4: domicilio/sucursal + mapa + fecha (F02)
│       │   ├── pago.tsx           # Paso 5: método de pago (F03)
│       │   └── confirmacion.tsx   # Paso 6: resumen + folio generado (F03)
│       └── [id].tsx               # Detalle de un pedido ya existente (solo consulta)
│
├── admin/                     # Rol admin — URLs /admin/...
│   ├── _layout.tsx            # Guardia de rol + Drawer
│   ├── index.tsx              # F04 Lista de todos los pedidos (filtro por estado)
│   ├── pedido/[id].tsx        # F04 Detalle + cambiar estado + asignar repartidor
│   ├── catalogo/
│   │   ├── index.tsx          # F07 M4 Pasteles publicados y ocultos + "Nuevo pastel"
│   │   └── [id].tsx           # F07 M4 Alta ('nuevo') o edición, con vista previa
│   └── perfil.tsx
│
└── repartidor/                # Rol repartidor — URLs /repartidor/...
    ├── _layout.tsx            # Guardia de rol + Drawer
    ├── index.tsx              # F06 Mis entregas asignadas
    ├── entrega/[id].tsx       # F06 Ubicación en mapa + "Marcar como entregado"
    └── perfil.tsx
```

> `admin/` y `repartidor/` son carpetas normales (no grupos con paréntesis) para
> que sus URLs no choquen con las del cliente: dos grupos con un `pedidos.tsx`
> resolverían ambos a `/pedidos`.

## Redirección inicial (`app/index.tsx`)

| Condición | Destino |
|---|---|
| Cargando sesión o perfil | Spinner |
| Sin sesión | `/login` |
| Rol `cliente` | `/home` |
| Rol `admin` | `/admin` |
| Rol `repartidor` | `/repartidor` |

Cada `_layout.tsx` de rol repite la verificación: si el usuario no tiene ese rol, lo
regresa a `/`. Así no se puede entrar escribiendo la URL o con un enlace profundo.
(La seguridad real está en las políticas RLS; la guardia es solo de navegación.)

## Encabezado y menú (según `design/pantalla_principal_catalogo.png`)

En lugar de una barra de pestañas se usa un **Drawer** (menú lateral):

- Encabezado: ícono hamburguesa (abre el menú) · logo ORNE · ícono de perfil (abre
  `perfil.tsx`). Fondo `#f6f4f3`.
- Opciones del menú por rol:

| Cliente | Admin | Repartidor |
|---|---|---|
| Catálogo | Pedidos | Mis entregas |
| Mis pedidos | Catálogo (F07 M4) | Perfil |
| Perfil | Perfil | Cerrar sesión |
| Cerrar sesión | Cerrar sesión | |

- Las pantallas del wizard (`pedido/nuevo/*`) y los detalles (`[id].tsx`) no
  aparecen en el menú.

## Reglas de navegación del wizard (pedido/nuevo/*)

- Cada paso debe poder **regresar** al anterior sin perder los datos ya capturados
  (requisito del cliente: "permitir regresar a pasos anteriores").
- El estado del pedido en construcción vive en un **Context** (`PedidoContext`),
  montado en `pedido/nuevo/_layout.tsx`, para que sobreviva al ir y venir entre pasos.
- **Guardar progreso**: el pedido se guarda en Supabase con `estado = 'borrador'` al
  completar el paso 1 y en cada paso siguiente; aparece en `pedidos.tsx` para
  retomarlo (botón "Continuar pedido"). Ver F01, D2.
- Solo al confirmar en `confirmacion.tsx` el pedido pasa de `borrador` a `pendiente`.

## Datos que viajan entre pantallas

```
home (pastel del catálogo) → pedido/nuevo            (viaja: id del pastel del catálogo)
pedido/nuevo/*              → todas comparten el mismo pedido_id
                               (creado como 'borrador' al completar el paso 1, o
                               recuperado si viene de "Continuar pedido")
pedidos                     → pedido/[id]            (viaja: id del pedido)
admin                       → admin/pedido/[id]      (viaja: id del pedido)
admin/catalogo              → admin/catalogo/[id]    (viaja: id del pastel, o 'nuevo')
repartidor                  → repartidor/entrega/[id] (viaja: id del pedido)
```
