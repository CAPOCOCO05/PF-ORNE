-- F07 M7: datos de contacto del cliente (teléfono y dirección guardada)
-- (ver specs/features/F07-mejoras.md, M7 D1–D5)
--
-- - Tabla aparte de perfiles: la política 010 deja al repartidor leer el perfil de los
--   clientes de sus entregas, y la dirección guardada no debe verla nadie más (D1).
-- - Los pedidos no cambian: cada uno conserva sus propios datos de entrega (D2).
-- - Llenado inicial con el último pedido (D3) y actualización al confirmar (D4).

-- 1. Tabla (D1) --------------------------------------------------------------------

create table public.datos_cliente (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  -- mismas reglas que las columnas de entrega de pedidos (008)
  telefono text check (telefono ~ '^[0-9]{10}$'),
  calle text check (char_length(calle) <= 100),
  numero_exterior text check (char_length(numero_exterior) <= 20),
  numero_interior text check (char_length(numero_interior) <= 20),
  colonia text check (char_length(colonia) <= 100),
  direccion_referencia text check (char_length(direccion_referencia) <= 200),
  direccion_lat numeric(10,7),
  direccion_lng numeric(10,7),
  updated_at timestamptz not null default now(),
  -- la dirección se guarda completa (con pin) o no se guarda
  constraint datos_cliente_direccion_completa check (
    (calle is null and numero_exterior is null and numero_interior is null and colonia is null
       and direccion_referencia is null and direccion_lat is null and direccion_lng is null)
    or (calle is not null and numero_exterior is not null and colonia is not null
       and direccion_lat is not null and direccion_lng is not null)
  )
);

create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger datos_cliente_updated_at
  before update on public.datos_cliente
  for each row execute function public.tocar_updated_at();

-- 2. Permisos: solo el dueño (D1) ----------------------------------------------------
-- Sin política delete: "Quitar dirección" deja las columnas en null con un update.

alter table public.datos_cliente enable row level security;

create policy "datos_cliente_dueno_lee" on public.datos_cliente
  for select to authenticated
  using (auth.uid() = usuario_id);

create policy "datos_cliente_dueno_crea" on public.datos_cliente
  for insert to authenticated
  with check (auth.uid() = usuario_id);

create policy "datos_cliente_dueno_edita" on public.datos_cliente
  for update to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

revoke all on public.datos_cliente from anon;
grant select, insert, update on public.datos_cliente to authenticated;

-- 3. Llenado inicial (D3) ------------------------------------------------------------
-- Por cliente con pedidos no borrador: teléfono y dirección del pedido a domicilio más
-- reciente; si solo tiene recolecciones, el teléfono del pedido más reciente.

insert into public.datos_cliente (
  usuario_id, telefono, calle, numero_exterior, numero_interior, colonia,
  direccion_referencia, direccion_lat, direccion_lng
)
select
  c.usuario_id,
  coalesce(dom.telefono_contacto, ult.telefono_contacto),
  dom.calle, dom.numero_exterior, dom.numero_interior, dom.colonia,
  dom.direccion_referencia, dom.direccion_lat, dom.direccion_lng
from (select distinct usuario_id from public.pedidos where estado <> 'borrador') c
left join lateral (
  select p.telefono_contacto, p.calle, p.numero_exterior, p.numero_interior, p.colonia,
         p.direccion_referencia, p.direccion_lat, p.direccion_lng
  from public.pedidos p
  where p.usuario_id = c.usuario_id and p.estado <> 'borrador' and p.tipo_entrega = 'domicilio'
    and p.calle is not null and p.numero_exterior is not null and p.colonia is not null
    and p.direccion_lat is not null and p.direccion_lng is not null
  order by p.created_at desc
  limit 1
) dom on true
left join lateral (
  select p.telefono_contacto
  from public.pedidos p
  where p.usuario_id = c.usuario_id and p.estado <> 'borrador' and p.telefono_contacto is not null
  order by p.created_at desc
  limit 1
) ult on true
on conflict (usuario_id) do nothing;

-- 4. Actualización al confirmar (D4) ---------------------------------------------------
-- Se usa un trigger cuando el borrador pasa a 'pendiente' (lo hace confirmar_pedido, 008)
-- en lugar de redefinir esa función: el efecto es el mismo y no se duplica su lógica.
-- Solo llena lo que esté vacío: un envío puntual a otra dirección no pisa lo que el
-- cliente editó a mano.

create or replace function public.guardar_datos_cliente_al_confirmar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.datos_cliente (usuario_id, telefono)
  values (new.usuario_id, new.telefono_contacto)
  on conflict (usuario_id) do update
    set telefono = coalesce(datos_cliente.telefono, excluded.telefono);

  if new.tipo_entrega = 'domicilio' then
    update public.datos_cliente
    set calle = new.calle,
        numero_exterior = new.numero_exterior,
        numero_interior = new.numero_interior,
        colonia = new.colonia,
        direccion_referencia = new.direccion_referencia,
        direccion_lat = new.direccion_lat,
        direccion_lng = new.direccion_lng
    where usuario_id = new.usuario_id and calle is null;
  end if;
  return new;
end;
$$;

revoke all on function public.guardar_datos_cliente_al_confirmar() from public, anon, authenticated;

create trigger pedidos_guardar_datos_cliente
  after update of estado on public.pedidos
  for each row
  when (old.estado = 'borrador' and new.estado = 'pendiente')
  execute function public.guardar_datos_cliente_al_confirmar();
