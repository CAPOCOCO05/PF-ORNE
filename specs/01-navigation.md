# Navegación (Expo Router)

## Árbol de rutas

Las rutas viven en `frontend/app/`. Cada rol tiene su propia sección, protegida por
su `_layout.tsx`.

```
app/
├── _layout.tsx                # AuthProvider global (Stack raíz)
├── index.tsx                  # Redirección según sesión y rol (ver abajo)
├── aviso-privacidad.tsx       # F08 N2 Aviso de privacidad (con o sin sesión)
│
├── (auth)/                    # Sin sesión
│   ├── login.tsx              # F00
│   └── register.tsx           # F00
│
├── (cliente)/                 # Rol cliente — URLs sin prefijo (/home, /pedidos…)
│   ├── _layout.tsx            # Guardia de rol + barra inferior (Tabs) con encabezado ORNE
│   ├── home.tsx               # F01 Catálogo base (paginado) — pantalla de inicio
│   ├── pedidos.tsx            # Mis pedidos (incluye borradores)
│   ├── perfil.tsx             # F07 M7 Datos personales, dirección guardada, cerrar sesión
│   ├── perfil/
│   │   └── editar.tsx         # F07 M7 Editar nombre, teléfono y dirección (sin pestaña propia)
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
│   ├── _layout.tsx            # Guardia de rol + barra inferior (Tabs)
│   ├── index.tsx              # F04 Lista de todos los pedidos (filtro por estado)
│   ├── pedido/[id].tsx        # F04 Detalle + cambiar estado + asignar repartidor
│   ├── catalogo/
│   │   ├── index.tsx          # F07 M4 Pasteles publicados y ocultos + "Nuevo pastel"
│   │   └── [id].tsx           # F07 M4 Alta ('nuevo') o edición, con vista previa
│   └── perfil.tsx
│
└── repartidor/                # Rol repartidor — URLs /repartidor/...
    ├── _layout.tsx            # Guardia de rol + barra inferior (Tabs)
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
| Sin sesión | `/home` (catálogo como visitante, F09) |
| Rol `cliente` | `/home` |
| Rol `admin` | `/admin` |
| Rol `repartidor` | `/repartidor` |

Cada `_layout.tsx` de rol repite la verificación: si el usuario no tiene ese rol, lo
regresa a `/`. Excepción (F09): la sección del cliente deja entrar sin sesión
(`permitirInvitado`); ahí `pedidos`, `perfil`, `perfil/editar`, `pedido/[id]` y el
wizard muestran "Inicia sesión o crea tu cuenta" (`RequiereCuenta`). "Pedir" sin
sesión abre `/register?pedir=<id|nuevo>` y al terminar se continúa con el wizard. Así no se puede entrar escribiendo la URL o con un enlace profundo.
(La seguridad real está en las políticas RLS; la guardia es solo de navegación.)

## Encabezado y barra de navegación (F08 N1)

En lugar del menú lateral se usa una **barra de pestañas inferior** (`Tabs` de
`expo-router/tabs`, componente `src/components/BarraNavegacion.tsx`):

- Encabezado: solo el logo ORNE, fondo `#f6f4f3`.
- Barra inferior: ícono + etiqueta; pestaña activa en `#b2181d`. Visible siempre,
  también en el wizard y en los detalles.
- Pestañas por rol:

| Cliente | Admin | Repartidor |
|---|---|---|
| Catálogo | Pedidos | Mis entregas |
| Mis pedidos | Catálogo (F07 M4) | Perfil |
| Perfil | Perfil | |

- "Cerrar sesión" y "Aviso de privacidad" están en la pantalla de Perfil de cada rol.
- Las pantallas del wizard (`pedido/nuevo/*`), los detalles (`[id].tsx`) y
  `perfil/editar` no tienen pestaña propia; en ellas se resalta la pestaña de la que
  se llegó (`pedido/nuevo` → Catálogo, `pedido/[id]` → Mis pedidos, etc.).
- `aviso-privacidad.tsx` vive en el Stack raíz, fuera de las secciones de rol, para
  abrirse desde login y registro sin sesión (sin barra inferior).

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
