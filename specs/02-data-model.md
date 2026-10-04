# Modelo de datos

> Las tablas `pedidos`, `pedido_detalle` y `pagos` ya existen en
> `supabase/migrations/001_tablas_iniciales.sql`. Aquí se documentan como entidades
> de spec y se agregan los ajustes necesarios para F01-F03.

## Entidades

```ts
Pedido {
  id: uuid
  usuario_id: uuid          // FK a auth.users — permite múltiples pedidos por usuario
  estado: 'borrador' | 'pendiente' | 'confirmado' | 'en_preparacion' | 'entregado' | 'cancelado'
  fecha_entrega: date
  hora_entrega: time
  tipo_entrega: 'domicilio' | 'recoleccion'
  direccion: string | null
  direccion_lat: number | null
  direccion_lng: number | null
  direccion_referencia: string | null
  total: number
  folio: string              // ID único de seguimiento (F3.2)
}

PedidoDetalle {
  id: uuid
  pedido_id: uuid
  tamanio: '10' | '15' | '20' | '30'   // personas — NUEVO, faltaba en la tabla original
  tipo_pan: string                       // Vainilla, Chocolate, Red Velvet, Café, Tres leches, Fresa, Zanahoria
  relleno: string                        // Cajeta, Fresa, Nutella, Crema pastelera, Mantequilla de maní
  niveles: 1 | 2 | 3 | 4
  decoracion_texto: string | null        // máx. 500 caracteres
  imagen_referencia_url: string | null   // solo formato imagen (validar MIME antes de subir)
  precio_estimado: number
}

Pago {
  id: uuid
  pedido_id: uuid
  metodo_pago: 'tarjeta'      // único método soportado en el MVP
  monto: number
  estado_pago: 'simulado' | 'pagado' | 'fallido'
}
```

## Ajuste pendiente a la migración

Falta la columna `tamanio` en `pedido_detalle` (no estaba contemplada originalmente).
Crear `supabase/migrations/004_ajustes_pedido_detalle.sql`:

```sql
alter table pedido_detalle
  add column tamanio text not null default '10'
  check (tamanio in ('10', '15', '20', '30'));
```

## Catálogo de sabores e imágenes (F1.2, requisito "RecursosImg")

Las imágenes de sabor de pan/relleno **no van en la base de datos**: son assets
estáticos del proyecto. Se define una constante local:

```ts
// src/constants/catalogoSabores.ts
export const SABORES_PAN = [
  { id: 'vainilla', nombre: 'Vainilla', imagen: require('../../assets/sabores/vainilla.png') },
  // ...
];
```

Esto evita depender de Storage para algo que no cambia por pedido, y es más rápido
de renderizar.

## Catálogo base de pasteles predefinidos (F1.1)

Si se requiere mostrar pasteles prediseñados con precio base (no solo construir desde
cero), se necesita una tabla adicional:

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

Esta tabla **sí** necesita RLS de solo lectura pública (cualquiera puede ver el
catálogo, nadie más que un admin lo edita).
