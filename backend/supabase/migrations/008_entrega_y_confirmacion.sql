--F08
-- F02 / F03: datos de entrega y confirmación del pedido en el servidor
-- (ver specs/features/F02-logistica-entrega.md D1 y F03-checkout-pago.md D1, D2)

-- ---------------------------------------------------------------------------
-- F02: datos de entrega
-- ---------------------------------------------------------------------------

alter table public.pedidos
  add column calle text check (char_length(calle) <= 100),
  add column numero_exterior text check (char_length(numero_exterior) <= 20),
  add column numero_interior text check (char_length(numero_interior) <= 20),
  add column colonia text check (char_length(colonia) <= 100),
  add column telefono_contacto text check (telefono_contacto ~ '^[0-9]{10}$'),
  add constraint pedidos_direccion_referencia_check check (char_length(direccion_referencia) <= 200),
  -- hora_entrega guarda el inicio del bloque de 2 h (F02 D2)
  add constraint pedidos_hora_entrega_check check (hora_entrega in ('10:00', '12:00', '14:00', '16:00'));

-- El borrador se retoma también en entrega (4) y pago (5)
alter table public.pedidos drop constraint if exists pedidos_paso_actual_check;
alter table public.pedidos add constraint pedidos_paso_actual_check check (paso_actual between 1 and 5);

-- Sucursal única (Ensenada, B.C.) y radio de entrega (F02 D5, D6)
create or replace function public.distancia_sucursal_km(p_lat numeric, p_lng numeric)
returns numeric
language sql
immutable
as $$
  -- fórmula de haversine; radio de la Tierra 6371 km
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(p_lat - 31.782259) / 2), 2)
    + cos(radians(31.782259)) * cos(radians(p_lat)) * power(sin(radians(p_lng - (-116.5956174)) / 2), 2)
  ));
$$;

-- Primer día de entrega según niveles, en hora de Ensenada (F02 D3)
create or replace function public.fecha_minima_entrega(p_niveles int)
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Tijuana')::date
         + case when p_niveles >= 3 then 10 when p_niveles = 2 then 7 else 2 end;
$$;

-- Lunes a sábado, desde la fecha mínima y hasta 60 días adelante (F02 D3)
create or replace function public.fecha_entrega_valida(p_fecha date, p_niveles int)
returns boolean
language sql
stable
as $$
  select p_fecha >= public.fecha_minima_entrega(p_niveles)
     and p_fecha <= (now() at time zone 'America/Tijuana')::date + 60
     and extract(isodow from p_fecha) <> 7;
$$;

-- ---------------------------------------------------------------------------
-- F03: precio, folio y confirmación
-- ---------------------------------------------------------------------------

-- Misma fórmula y montos que frontend/src/constants/precios.ts (F01 D7)
create or replace function public.calcular_precio(p_tamanio text, p_niveles int, p_relleno text)
returns numeric(10,2)
language sql
immutable
as $$
  select (case p_tamanio when '10' then 350 when '15' then 500 when '20' then 650 when '30' then 900 end)
       + 250 * (p_niveles - 1)
       + case p_relleno
           when 'cremapastelera' then 30
           when 'chocolate' then 40
           when 'mantequillademani' then 50
           else 0
         end;
$$;

-- ORN- + 6 caracteres sin ambiguos (sin 0/O/1/I/L) (F03 D2)
create or replace function public.generar_folio()
returns text
language plpgsql
volatile
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  folio text := 'ORN-';
begin
  for i in 1..6 loop
    folio := folio || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
  end loop;
  return folio;
end;
$$;

-- Confirma el borrador en una sola transacción (F03 D1). Los errores usan códigos
-- propios en el mensaje para que la app los traduzca (F03 D5)
create or replace function public.confirmar_pedido(p_pedido_id uuid)
returns table (folio text, total numeric)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_pedido public.pedidos%rowtype;
  v_detalle public.pedido_detalle%rowtype;
  v_total numeric(10,2);
  v_folio text;
  v_niveles_max int;
begin
  select * into v_pedido from public.pedidos
  where id = p_pedido_id and usuario_id = auth.uid()
  for update;
  if not found then
    raise exception 'PEDIDO_NO_ENCONTRADO';
  end if;
  if v_pedido.estado <> 'borrador' then
    raise exception 'PEDIDO_YA_CONFIRMADO';
  end if;

  select * into v_detalle from public.pedido_detalle where pedido_id = p_pedido_id;
  if not found then
    raise exception 'PEDIDO_INCOMPLETO';
  end if;

  -- niveles permitidos por tamaño (F01 D5); va aparte porque el "then" del case
  -- cerraría la condición del if
  v_niveles_max := case v_detalle.tamanio when '10' then 1 when '15' then 2 when '20' then 3 else 4 end;

  if v_detalle.tipo_pan is null or v_detalle.relleno is null
     or v_detalle.niveles > v_niveles_max
     or v_pedido.tipo_entrega is null or v_pedido.fecha_entrega is null
     or v_pedido.hora_entrega is null or v_pedido.telefono_contacto is null
     or (v_pedido.tipo_entrega = 'domicilio' and (
           v_pedido.calle is null or v_pedido.numero_exterior is null or v_pedido.colonia is null
           or v_pedido.direccion_lat is null or v_pedido.direccion_lng is null)) then
    raise exception 'PEDIDO_INCOMPLETO';
  end if;

  if not public.fecha_entrega_valida(v_pedido.fecha_entrega, v_detalle.niveles) then
    raise exception 'FECHA_NO_DISPONIBLE';
  end if;

  if v_pedido.tipo_entrega = 'domicilio'
     and public.distancia_sucursal_km(v_pedido.direccion_lat, v_pedido.direccion_lng) > 15 then
    raise exception 'FUERA_DE_ZONA';
  end if;

  -- el precio se recalcula aquí: el que envió la app no se toma en cuenta
  v_total := public.calcular_precio(v_detalle.tamanio, v_detalle.niveles, v_detalle.relleno);
  update public.pedido_detalle set precio_estimado = v_total where pedido_id = p_pedido_id;

  -- si el folio ya existe (unique), se genera otro sin avisar al usuario
  loop
    begin
      update public.pedidos
      set folio = public.generar_folio(), total = v_total, estado = 'pendiente'
      where id = p_pedido_id
      returning folio into v_folio;
      exit;
    exception when unique_violation then
      null; -- otro pedido ya tiene ese folio: se intenta con uno nuevo
    end;
  end loop;

  insert into public.pagos (pedido_id, metodo_pago, monto, estado_pago)
  values (p_pedido_id, 'tarjeta', v_total, 'simulado');

  folio := v_folio;
  total := v_total;
  return next;
end;
$$;

revoke all on function public.confirmar_pedido(uuid) from public, anon;
grant execute on function public.confirmar_pedido(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Permisos: la confirmación solo ocurre a través de confirmar_pedido
-- ---------------------------------------------------------------------------

-- Antes (006) el cliente podía pasar su borrador a 'pendiente' con un update directo,
-- saltándose el recálculo del precio. Ahora el borrador solo puede quedar como
-- borrador y sin folio
drop policy "usuarios_editan_sus_borradores" on public.pedidos;

create policy "usuarios_editan_sus_borradores" on public.pedidos
  for update
  using (auth.uid() = usuario_id and estado = 'borrador')
  with check (auth.uid() = usuario_id and estado = 'borrador' and folio is null);

-- Los pagos solo los crea confirmar_pedido
drop policy "usuarios_crean_sus_pagos" on public.pagos;
