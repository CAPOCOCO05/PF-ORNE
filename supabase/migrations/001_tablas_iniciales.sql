-- Tabla de pedidos
create table pedidos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) not null,
  estado text not null default 'pendiente',
  fecha_entrega date not null,
  hora_entrega time not null,
  tipo_entrega text not null, -- 'domicilio' o 'recoleccion'
  direccion text, -- dirección en texto (referencia legible para el repartidor)
  direccion_lat numeric(10,7), -- latitud del pin en el mapa
  direccion_lng numeric(10,7), -- longitud del pin en el mapa
  direccion_referencia text, -- opcional: "casa azul, portón negro", etc.
  total numeric(10,2) not null default 0,
  folio text unique not null,
  created_at timestamptz default now()
);

-- Detalle del pastel (diseño interactivo)
create table pedido_detalle (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete cascade not null,
  tipo_pan text not null,
  relleno text not null,
  niveles int not null default 1,
  decoracion_texto text,
  imagen_referencia_url text, -- foto/boceto subido a Supabase Storage
  precio_estimado numeric(10,2) not null default 0
);

-- Pagos (simulación del flujo de compra)
create table pagos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete cascade not null,
  metodo_pago text not null, -- 'tarjeta', 'efectivo', 'transferencia'
  monto numeric(10,2) not null,
  estado_pago text not null default 'simulado', -- simulado, pagado, fallido
  created_at timestamptz default now()
);