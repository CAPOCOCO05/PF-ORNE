-- F01: catálogo de pasteles predefinidos (pantalla de inicio)

create table public.catalogo_pasteles (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  imagen_url text, -- URL pública del bucket 'catalogo'; null = la app muestra un placeholder
  precio_base numeric(10,2) not null,
  -- configuración con la que se precarga el wizard al presionar "Pedir" (F01, D6)
  tamanio text not null check (tamanio in ('10', '15', '20', '30')),
  niveles int not null check (niveles between 1 and 4),
  tipo_pan text not null check (tipo_pan in ('vainilla', 'chocolate', 'redvelvet', 'tresleches', 'fresa', 'zanahoria')),
  relleno text not null check (relleno in ('cajeta', 'chocolate', 'cremapastelera', 'mantequillademani', 'mermeladafresa')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.catalogo_pasteles enable row level security;

-- Cualquier usuario con sesión ve el catálogo activo; el admin ve también los inactivos.
-- Nadie lo edita desde la app (se administra desde el Dashboard de Supabase)
create policy "catalogo_lectura" on public.catalogo_pasteles
  for select to authenticated
  using (activo or public.mi_rol() = 'admin');

-- Bucket público para las imágenes del catálogo (se suben desde el Dashboard)
insert into storage.buckets (id, name, public)
values ('catalogo', 'catalogo', true)
on conflict (id) do nothing;

-- Datos de prueba: 12 pasteles para probar la paginación de 10 en 10.
-- precio_base calculado con la fórmula provisional de F01 (D7)
insert into public.catalogo_pasteles (nombre, descripcion, precio_base, tamanio, niveles, tipo_pan, relleno) values
  ('Clásico de vainilla',     'Pan de vainilla con crema pastelera',            380.00, '10', 1, 'vainilla',   'cremapastelera'),
  ('Chocolate intenso',       'Pan de chocolate relleno de chocolate',          540.00, '15', 1, 'chocolate',  'chocolate'),
  ('Red Velvet',              'Pan red velvet con crema pastelera',             530.00, '15', 1, 'redvelvet',  'cremapastelera'),
  ('Tres leches tradicional', 'Pan tres leches con crema pastelera',            680.00, '20', 1, 'tresleches', 'cremapastelera'),
  ('Fresas con crema',        'Pan de fresa con mermelada de fresa',            350.00, '10', 1, 'fresa',      'mermeladafresa'),
  ('Zanahoria casero',        'Pan de zanahoria relleno de cajeta',             500.00, '15', 1, 'zanahoria',  'cajeta'),
  ('Chocolate con cajeta',    'Pan de chocolate relleno de cajeta',             650.00, '20', 1, 'chocolate',  'cajeta'),
  ('Vainilla y maní',         'Pan de vainilla con mantequilla de maní',        400.00, '10', 1, 'vainilla',   'mantequillademani'),
  ('Red Velvet dos pisos',    'Dos niveles de red velvet con crema pastelera',  930.00, '20', 2, 'redvelvet',  'cremapastelera'),
  ('Celebración tres leches', 'Dos niveles de tres leches con fresa',          1150.00, '30', 2, 'tresleches', 'mermeladafresa'),
  ('Fiesta de chocolate',     'Tres niveles de chocolate relleno de chocolate', 1190.00, '20', 3, 'chocolate', 'chocolate'),
  ('Boda clásica',            'Tres niveles de vainilla con crema pastelera',  1430.00, '30', 3, 'vainilla',   'cremapastelera');
