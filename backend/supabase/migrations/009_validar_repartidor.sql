-- F04: el repartidor asignado debe tener rol 'repartidor' (ver specs/features/F04-panel-admin.md D1)
-- Misma funcion que en 007, con la validacion del repartidor al inicio

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
