-- Estado del pago: solo 'pendiente' o 'confirmado' (se quita el pago simulado).
-- El pago nace 'pendiente' al confirmar el pedido y pasa a 'confirmado' cuando
-- el admin confirma el pedido (pendiente → confirmado).

update public.pagos set estado_pago = 'pendiente' where estado_pago in ('simulado', 'fallido');
update public.pagos set estado_pago = 'confirmado' where estado_pago = 'pagado';

-- pedidos que el admin ya confirmó antes de esta migración
update public.pagos pa set estado_pago = 'confirmado'
from public.pedidos pe
where pe.id = pa.pedido_id
  and pe.estado in ('confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado');

alter table public.pagos alter column estado_pago set default 'pendiente';
alter table public.pagos drop constraint if exists pagos_estado_pago_check;
alter table public.pagos
  add constraint pagos_estado_pago_check check (estado_pago in ('pendiente', 'confirmado'));

-- confirmar_pedido inserta el pago como 'pendiente' (antes 'simulado')
do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.confirmar_pedido(uuid)'::regprocedure) into v_def;
  v_def := replace(v_def, 'v_total, ''simulado'')', 'v_total, ''pendiente'')');
  execute v_def;
end;
$$;

-- al confirmar el admin el pedido, el pago queda confirmado
create or replace function public.confirmar_pago_al_confirmar_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.pagos set estado_pago = 'confirmado'
  where pedido_id = new.id and estado_pago = 'pendiente';
  return new;
end;
$$;

revoke all on function public.confirmar_pago_al_confirmar_pedido() from public, anon, authenticated;

drop trigger if exists pedidos_confirma_pago on public.pedidos;
create trigger pedidos_confirma_pago
  after update of estado on public.pedidos
  for each row
  when (old.estado = 'pendiente' and new.estado = 'confirmado')
  execute function public.confirmar_pago_al_confirmar_pedido();
