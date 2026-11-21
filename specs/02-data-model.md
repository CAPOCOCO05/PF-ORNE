# Modelo de datos

> Las tablas `pedidos`, `pedido_detalle` y `pagos` ya existen en
> `backend/supabase/migrations/001_tablas_iniciales.sql`. Aquí se documentan como
> entidades de spec y se agregan los ajustes necesarios para F00-F06.

## Entidades

```ts
Perfil {                     // NUEVO — un registro por usuario de auth.users
  id: uuid                   // = auth.users.id
  nombre: string
  rol: 'cliente' | 'admin' | 'repartidor'   // default 'cliente'
  created_at: timestamp
}

Pedido {
  id: uuid
  usuario_id: uuid          // FK a auth.users — permite múltiples pedidos por usuario
  repartidor_id: uuid | null // NUEVO — FK a perfiles; lo asigna el admin (solo domicilio)
  estado: EstadoPedido       // ver "Estados del pedido"
  fecha_entrega: date
  hora_entrega: time         // inicio del bloque de 2 h: 10:00 | 12:00 | 14:00 | 16:00 (F02 D2)
  tipo_entrega: 'domicilio' | 'recoleccion'
  calle: string | null       // NUEVO (F02) — solo domicilio
  numero_exterior: string | null    // NUEVO (F02)
  numero_interior: string | null    // NUEVO (F02)
  colonia: string | null     // NUEVO (F02)
  telefono_contacto: string | null  // NUEVO (F02) — 10 dígitos
  direccion: string | null   // texto legible armado con los campos anteriores
  direccion_lat: number | null
  direccion_lng: number | null
  direccion_referencia: string | null
  total: number
  folio: string              // ID único de seguimiento (F03): ORN-XXXXXX
  paso_actual: 1 | 2 | 3 | 4 | 5     // paso donde se retoma el borrador
  motivo_no_entrega: string | null   // NUEVO (F07 M2) — lo escribe el repartidor; se conserva al reprogramar
}

PedidoDetalle {
  id: uuid
  pedido_id: uuid
  tamanio: '10' | '15' | '20' | '30'   // personas — NUEVO, faltaba en la tabla original
  tipo_pan: string                       // id de SABORES_PAN (ver "Catálogo de sabores")
  relleno: string                        // id de SABORES_RELLENO
  niveles: 1 | 2 | 3 | 4
  decoracion_texto: string | null        // máx. 500 caracteres
  imagen_referencia_url: string | null   // solo formato imagen (validar MIME antes de subir)
  precio_estimado: number
}

DatosCliente {               // NUEVO (F07 M7) — 1 a 1 con el usuario; solo lo ve el dueño
  usuario_id: uuid           // PK, FK a auth.users
  telefono: string | null    // 10 dígitos
  calle: string | null       // la dirección se guarda completa (con pin) o toda en null
  numero_exterior: string | null
  numero_interior: string | null
  colonia: string | null
  direccion_referencia: string | null
  direccion_lat: number | null
  direccion_lng: number | null
  updated_at: timestamp
}

Pago {
  id: uuid
  pedido_id: uuid
  metodo_pago: 'tarjeta'      // único método soportado en el MVP
  monto: number
  estado_pago: 'pendiente' | 'confirmado'   -- confirmado cuando el admin confirma el pedido (016)
}
```

## Estados del pedido

```
borrador → pendiente → confirmado → en_preparacion → listo ─┬─ (domicilio)   → en_camino ─┬─→ entregado
                │            │                       ▲      │                             └─→ no_entregado ─┐
                │            │                       │      └─ (recolección) ─────────────→ entregado      │
                │            │                       └──────────── reprogramar (sin repartidor) ◄──────────┤
                └────────────┴──→ cancelado ◄──────────────────────────────────────────────────────────────┘
```

| Estado | Significado | Quién lo pone |
|---|---|---|
| `borrador` | El cliente está armando el pedido | Cliente (F01) |
| `pendiente` | El cliente confirmó; espera revisión de la pastelería | Cliente (F03) |
| `confirmado` | La pastelería aceptó el pedido | Admin |
| `en_preparacion` | Se está elaborando | Admin |
| `listo` | Terminado; espera recolección o salida a reparto | Admin |
| `en_camino` | Asignado a un repartidor y en ruta (solo domicilio) | Admin (al asignar repartidor) |
| `entregado` | Recibido por el cliente | Repartidor (domicilio) · Admin (recolección) |
| `no_entregado` | Salió a reparto pero no se pudo entregar; guarda el motivo (F07 M2) | Repartidor |
| `cancelado` | Cancelado (desde `pendiente`, `confirmado` o `no_entregado`) | Admin |

Reglas:
- Solo se avanza a un estado de la flecha; no se puede regresar ni saltar estados.
- `en_camino` exige `repartidor_id` y `tipo_entrega = 'domicilio'`.
- El repartidor solo puede cambiar `en_camino → entregado` o `en_camino → no_entregado`
  (con motivo), y solo en los pedidos que tiene asignados.
- Desde `no_entregado` el admin reprograma (`→ listo`, quitando el repartidor) o
  cancela (F07 M2).
- Las transiciones se validan en la base de datos (no solo en la app).

## Permisos por rol (RLS)

| Tabla | Cliente | Admin | Repartidor |
|---|---|---|---|
| `perfiles` | Ver y editar su `nombre` (no su `rol`) | Ver todos | Ver el suyo y el nombre de los clientes de sus entregas en camino |
| `pedidos` | Ver/crear los suyos; editar solo borradores; pasar a `pendiente` | Ver todos; cambiar `estado` y `repartidor_id` | Ver los asignados a él; cambiar a `entregado` o `no_entregado` (con motivo) |
| `pedido_detalle` | Ver/crear/editar el de sus borradores | Ver todos | Ver el de sus entregas |
| `pagos` | Ver/crear los suyos | Ver todos | — |
| `datos_cliente` | Ver, crear y editar la suya (sin borrar) (F07 M7) | — | — |
| `catalogo_pasteles` | Ver activos (también sin sesión, rol `anon`, F09) | Ver todos; crear y editar, sin borrar (F07 M4) | — |
| Storage `referencias-pasteles` | Subir/ver en su carpeta | Ver todo | — |
| Storage `catalogo` (público) | Ver (URL pública) | Subir, reemplazar y borrar (F07 M4) | Ver (URL pública) |

Las políticas usan una función `mi_rol()` (`security definer`) que lee el rol del
usuario actual desde `perfiles`, para no repetir la consulta en cada política.

## Plan de migraciones

En `backend/supabase/migrations/`, en este orden:

| Migración | Contenido | Feature |
|---|---|---|
| `004_perfiles_roles.sql` | Tabla `perfiles`, trigger que crea el perfil `cliente` al registrarse, función `mi_rol()` | F00 |
| `005_catalogo.sql` | Tabla `catalogo_pasteles` + datos de prueba + bucket público de imágenes | F01 |
| `006_ajustes_borrador.sql` | Ajustes para guardar borradores (ver F01, D1) | F01 |
| `007_estados_y_roles.sql` | `check` de estados, `repartidor_id`, políticas RLS de admin y repartidor, validación de transiciones | F04, F06 |
| `008_entrega_y_confirmacion.sql` | Campos de dirección y teléfono, bloques de horario, `paso_actual` 1–5, `fecha_minima_entrega`, `calcular_precio`, `confirmar_pedido` (folio + pago) | F02, F03 |
| `009_validar_repartidor.sql` | El trigger de transiciones exige que `repartidor_id` sea un perfil con rol `repartidor` | F04 |
| `010_repartidor_ve_clientes.sql` | El repartidor ve el nombre del cliente de sus entregas en camino | F06 |
| `011_no_entregado.sql` | Estado `no_entregado`, `motivo_no_entrega`, política y trigger del repartidor, `contar_pedidos_por_estado()` | F07 M2, M3 |
| `012_catalogo_admin.sql` | Admin crea y edita pasteles (sin `delete`), nombre único, trigger que calcula `precio_base` con `calcular_precio`, políticas de Storage del bucket `catalogo` | F07 M4 |
| `013_datos_cliente.sql` | Tabla `datos_cliente` con RLS solo del dueño, llenado inicial desde el último pedido y trigger que la completa al confirmar un pedido | F07 M7 |
| `014_precios_relleno.sql` | Montos confirmados de los rellenos en `calcular_precio` (Cajeta $50, Mermelada $70) y recálculo de `precio_base` del catálogo | F01 D7 |
| `015_catalogo_publico.sql` | Lectura de los pasteles activos sin sesión (rol `anon`) | F09 |

## Catálogo de sabores e imágenes

Las imágenes de sabor de pan/relleno **no van en la base de datos**: son assets
estáticos del proyecto. **Solo existen los sabores que tienen imagen en
`frontend/assets/sabores/`**. En la BD se guarda el `id`; en pantalla, el `nombre`.

| Pan (`id` → nombre) | Relleno (`id` → nombre) |
|---|---|
| `vainilla` → Vainilla | `cajeta` → Cajeta |
| `chocolate` → Chocolate | `chocolate` → Chocolate |
| `redvelvet` → Red Velvet | `cremapastelera` → Crema pastelera |
| `tresleches` → Tres leches | `mantequillademani` → Mantequilla de maní |
| `fresa` → Fresa | `mermeladafresa` → Mermelada / Fresa |
| `zanahoria` → Zanahoria | |

```ts
// frontend/src/constants/catalogoSabores.ts
export const SABORES_PAN = [
  { id: 'vainilla', nombre: 'Vainilla', imagen: require('../../assets/sabores/pan/vainilla.png') },
  // ...
];
export const SABORES_RELLENO = [
  { id: 'cajeta', nombre: 'Cajeta', imagen: require('../../assets/sabores/relleno/cajeta.png') },
  // ...
];
```

Esto evita depender de Storage para algo que no cambia por pedido, y es más rápido
de renderizar.

## Catálogo base de pasteles predefinidos (pantalla de inicio)

Pasteles prediseñados que se muestran en `home.tsx` (ver
`design/pantalla_principal_catalogo.png`). Cada tarjeta muestra imagen, precio,
descripción y el botón "Pedir".

```sql
create table catalogo_pasteles (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  imagen_url text,
  precio_base numeric(10,2) not null,
  activo boolean default true
);
```

Esta tabla **sí** necesita RLS: cualquier persona, con o sin sesión (`anon`, F09,
`015`), ve el catálogo activo
y solo el admin lo crea y edita, desde la app (F07 M4, `012`). `precio_base` lo
calcula un trigger con `calcular_precio`, así que siempre coincide con lo que cobra
el wizard; el nombre es único sin distinguir mayúsculas. No se borran pasteles:
se ocultan con `activo = false`.
