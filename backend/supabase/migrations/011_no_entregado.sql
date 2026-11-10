-- F07 M2: pedido no entregado por el repartidor (ver specs/features/F07-mejoras.md, M2 D3)
-- F07 M3: contador de pedidos por estado para los chips del admin (M3 D2)
--
-- Ciclo nuevo:
--   en_camino ─┬─→ entregado
--              └─→ no_entregado ─┬─→ listo (reprogramar, sin repartidor)
--                                └─→ cancelado

-- 1. Estado y motivo -----------------------------------------------------------

alter table public.pedidos drop constraint pedidos_estado_check;

alter table public.pedidos
  add constraint pedidos_estado_check check (estado in (
    'borrador', 'pendiente', 'confirmado', 'en_preparacion',
    'listo', 'en_camino', 'entregado', 'no_entregado', 'cancelado'
  )),
  -- se conserva al reprogramar, como historial del ultimo intento fallido
  add column motivo_no_entrega text
    constraint pedidos_motivo_no_entrega_check
    check (motivo_no_entrega is null or char_length(btrim(motivo_no_entrega)) between 1 and 200);

-- 2. El repartidor puede marcar entregado o no entregado (con motivo) ------------

drop policy "repartidor_entrega" on public.pedidos;

create policy "repartidor_entrega" on public.pedidos
  for update
  using (public.mi_rol() = 'repartidor' and repartidor_id = auth.uid() and estado = 'en_camino')
  with check (
    repartidor_id = auth.uid()
    and (estado = 'entregado' or (estado = 'no_entregado' and motivo_no_entrega is not null))
  );

-- 3. Transiciones (misma funcion que en 009, con los cambios de M2) --------------

create or replace function public.validar_cambio_pedido()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  rol text := public.mi_rol();
begin
  -- Aplica tambien a los cambios desde el Dashboard: nunca se asigna a un cliente o admin
  if new.repartidor_id is not null and new.repartidor_id is distinct from old.repartidor_id
     and not exists (select 1 from public.perfiles where id = new.repartidor_id and perfiles.rol = 'repartidor') then
    raise exception 'El usuario asignado no es repartidor';
  end if;

  -- Cambios hechos desde el Dashboard / service_role (sin usuario) no se restringen
  if auth.uid() is null then
    return new;
  end if;

  if new.repartidor_id is distinct from old.repartidor_id and rol is distinct from 'admin' then
    raise exception 'Solo el admin puede asignar repartidor';
  end if;

  -- Admin: solo estado y repartidor. Repartidor: solo estado y motivo de no entrega
  if rol = 'admin'
     and (to_jsonb(new) - 'estado' - 'repartidor_id') is distinct from (to_jsonb(old) - 'estado' - 'repartidor_id') then
    raise exception 'Solo se puede cambiar el estado del pedido';
  end if;
  if rol = 'repartidor'
     and (to_jsonb(new) - 'estado' - 'motivo_no_entrega') is distinct from (to_jsonb(old) - 'estado' - 'motivo_no_entrega') then
    raise exception 'Solo se puede cambiar el estado del pedido';
  end if;

  -- El motivo solo se registra al marcar un pedido en camino como no entregado
  if new.motivo_no_entrega is distinct from old.motivo_no_entrega
     and not (rol = 'repartidor' and old.estado = 'en_camino' and new.estado = 'no_entregado') then
    raise exception 'El motivo solo se registra al marcar el pedido como no entregado';
  end if;

  if new.estado = old.estado then
    return new;
  end if;

  -- Confirmación del cliente (F03): el pedido debe estar completo
  if rol = 'cliente' and old.estado = 'borrador' and new.estado = 'pendiente' then
    if new.fecha_entrega is null or new.hora_entrega is null or new.tipo_entrega is null or new.folio is null
       or (new.tipo_entrega = 'domicilio' and (new.direccion_lat is null or new.direccion_lng is null))
       or not exists (select 1 from public.pedido_detalle d where d.pedido_id = new.id
                      and d.tipo_pan is not null and d.relleno is not null) then
      raise exception 'El pedido está incompleto';
    end if;
    return new;
  end if;

  if rol = 'admin' and (
       (old.estado = 'pendiente'      and new.estado in ('confirmado', 'cancelado'))
    or (old.estado = 'confirmado'     and new.estado in ('en_preparacion', 'cancelado'))
    or (old.estado = 'en_preparacion' and new.estado = 'listo')
    or (old.estado = 'listo'          and new.estado = 'en_camino'
                                      and new.tipo_entrega = 'domicilio' and new.repartidor_id is not null)
    or (old.estado = 'listo'          and new.estado = 'entregado' and new.tipo_entrega = 'recoleccion')
    -- M2: reprogramar (vuelve a listo sin repartidor) o cancelar
    or (old.estado = 'no_entregado'   and new.estado = 'listo' and new.repartidor_id is null)
    or (old.estado = 'no_entregado'   and new.estado = 'cancelado')
  ) then
    return new;
  end if;

  if rol = 'repartidor' and old.estado = 'en_camino' and (
       new.estado = 'entregado'
    or (new.estado = 'no_entregado' and coalesce(btrim(new.motivo_no_entrega), '') <> '')
  ) then
    return new;
  end if;

  raise exception 'Cambio de estado no permitido: % → %', old.estado, new.estado;
end;
$$;

-- 4. Contador por estado para los chips de "Activos" (M3 D2) ---------------------
-- security invoker: respeta RLS, asi que solo el admin ve el conteo de todos los pedidos

create or replace function public.contar_pedidos_por_estado()
returns table (estado text, total bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select p.estado, count(*)
  from public.pedidos p
  where p.estado <> 'borrador'
  group by p.estado;
$$;

revoke all on function public.contar_pedidos_por_estado() from public, anon;
grant execute on function public.contar_pedidos_por_estado() to authenticated;
