-- F04 / F06: ciclo de estados del pedido y permisos de admin y repartidor
-- (ver 02-data-model.md, "Estados del pedido" y "Permisos por rol")

alter table public.pedidos
  add column repartidor_id uuid references public.perfiles(id),
  add constraint pedidos_estado_check check (estado in (
    'borrador', 'pendiente', 'confirmado', 'en_preparacion',
    'listo', 'en_camino', 'entregado', 'cancelado'
  )),
  -- Segunda FK sobre usuario_id para poder traer el nombre del cliente desde
  -- perfiles en una sola consulta (select ..., perfiles!pedidos_usuario_perfil_fkey(nombre))
  add constraint pedidos_usuario_perfil_fkey foreign key (usuario_id) references public.perfiles(id);

-- El cliente solo puede crear pedidos como borrador y sin repartidor
drop policy "usuarios_crean_sus_pedidos" on public.pedidos;

create policy "usuarios_crean_sus_pedidos" on public.pedidos
  for insert with check (auth.uid() = usuario_id and estado = 'borrador' and repartidor_id is null);

-- Admin: ve todos los pedidos (excepto borradores) y su detalle y pago; puede actualizarlos
create policy "admin_ve_pedidos" on public.pedidos
  for select using (public.mi_rol() = 'admin' and estado <> 'borrador');

create policy "admin_actualiza_pedidos" on public.pedidos
  for update
  using (public.mi_rol() = 'admin' and estado <> 'borrador')
  with check (public.mi_rol() = 'admin');

create policy "admin_ve_detalle" on public.pedido_detalle
  for select using (public.mi_rol() = 'admin');

create policy "admin_ve_pagos" on public.pagos
  for select using (public.mi_rol() = 'admin');

-- Repartidor: ve los pedidos asignados a él y su detalle; solo puede marcarlos entregados.
-- (No ve la tabla pagos; los precios en pedidos/pedido_detalle simplemente no se consultan en F06)
create policy "repartidor_ve_sus_entregas" on public.pedidos
  for select using (public.mi_rol() = 'repartidor' and repartidor_id = auth.uid());

create policy "repartidor_entrega" on public.pedidos
  for update
  using (public.mi_rol() = 'repartidor' and repartidor_id = auth.uid() and estado = 'en_camino')
  with check (repartidor_id = auth.uid() and estado = 'entregado');

create policy "repartidor_ve_detalle" on public.pedido_detalle
  for select using (
    public.mi_rol() = 'repartidor'
    and exists (select 1 from public.pedidos where pedidos.id = pedido_detalle.pedido_id
                and pedidos.repartidor_id = auth.uid())
  );

-- Valida las transiciones de estado en la base de datos, no solo en la app.
-- Las políticas deciden QUIÉN puede actualizar una fila; este trigger decide QUÉ cambio es válido.
create or replace function public.validar_cambio_pedido()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  rol text := public.mi_rol();
begin
  -- Cambios hechos desde el Dashboard / service_role (sin usuario) no se restringen
  if auth.uid() is null then
    return new;
  end if;

  if new.repartidor_id is distinct from old.repartidor_id and rol is distinct from 'admin' then
    raise exception 'Solo el admin puede asignar repartidor';
  end if;

  -- Admin y repartidor solo pueden tocar estado y repartidor, no los datos del pedido
  if rol in ('admin', 'repartidor')
     and (to_jsonb(new) - 'estado' - 'repartidor_id') is distinct from (to_jsonb(old) - 'estado' - 'repartidor_id') then
    raise exception 'Solo se puede cambiar el estado del pedido';
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
  ) then
    return new;
  end if;

  if rol = 'repartidor' and old.estado = 'en_camino' and new.estado = 'entregado' then
    return new;
  end if;

  raise exception 'Cambio de estado no permitido: % → %', old.estado, new.estado;
end;
$$;

create trigger validar_cambio_pedido
  before update on public.pedidos
  for each row execute function public.validar_cambio_pedido();
