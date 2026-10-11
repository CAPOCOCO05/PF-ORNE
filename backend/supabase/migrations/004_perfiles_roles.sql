-- F00: perfiles de usuario con rol (cliente, admin, repartidor)

create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default '',
  rol text not null default 'cliente' check (rol in ('cliente', 'admin', 'repartidor')),
  created_at timestamptz not null default now()
);

alter table public.perfiles enable row level security;

-- Rol del usuario actual. security definer para que las políticas puedan leer
-- perfiles sin depender de las políticas de la propia tabla perfiles
create or replace function public.mi_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

-- Al registrarse, todo usuario nace como 'cliente' (el rol nunca se toma de los
-- metadatos que manda la app; admin y repartidor se asignan a mano)
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(trim(new.raw_user_meta_data ->> 'nombre'), ''));
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- Usuarios que ya existían antes de esta migración
insert into public.perfiles (id, nombre)
select id, coalesce(trim(raw_user_meta_data ->> 'nombre'), '')
from auth.users
on conflict (id) do nothing;

-- Cada quien ve su perfil; el admin ve todos (para nombres de clientes y repartidores)
create policy "usuarios_ven_su_perfil" on public.perfiles
  for select using (id = auth.uid());

create policy "admin_ve_perfiles" on public.perfiles
  for select using (public.mi_rol() = 'admin');

-- Cada quien edita su perfil, pero solo la columna nombre (no puede cambiarse el rol)
create policy "usuarios_editan_su_perfil" on public.perfiles
  for update using (id = auth.uid()) with check (id = auth.uid());

revoke update on public.perfiles from authenticated;
grant update (nombre) on public.perfiles to authenticated;
