-- F06: prueba de permisos del repartidor contra la base de datos (no solo la app).
-- F07 M2: incluye el ciclo "no entregado" → reprogramar (migracion 011).
-- Se corre completo en el SQL Editor de Supabase. Simula a cada usuario cambiando el rol a
-- 'authenticated' y el usuario de auth.uid(); al final DESHACE todos los cambios y solo
-- muestra la tabla de resultados (prueba / OK o FALLA).
--
-- Necesita en la base: un admin, un repartidor, al menos un pedido 'pendiente' a domicilio
-- (confirmado desde la app) y, de preferencia, otro pedido que no sea borrador.

drop table if exists pg_temp.resultados;
create temp table resultados (n serial, prueba text, resultado text);

do $$
declare
  v_admin uuid;
  v_repartidor uuid;
  v_duenio uuid;
  v_pedido uuid;
  v_ajeno uuid;
  n int;
  v_fallo boolean;
  v_pruebas text[] := '{}';
  v_estados text[] := '{}';
begin
  select id into v_admin from public.perfiles where rol = 'admin' limit 1;
  select id into v_repartidor from public.perfiles where rol = 'repartidor' limit 1;
  select id, usuario_id into v_pedido, v_duenio from public.pedidos
  where estado = 'pendiente' and tipo_entrega = 'domicilio' limit 1;
  select id into v_ajeno from public.pedidos
  where id <> v_pedido and estado <> 'borrador' and repartidor_id is distinct from v_repartidor limit 1;

  if v_admin is null or v_repartidor is null or v_pedido is null then
    raise exception '%', 'Faltan datos de prueba:'
      || case when v_admin is null then ' un perfil admin;' else '' end
      || case when v_repartidor is null then ' un perfil repartidor;' else '' end
      || case when v_pedido is null then ' un pedido a domicilio en estado pendiente;' else '' end;
  end if;

  -- todo lo que sigue se deshace con la excepcion DESHACER del final
  begin
    -- ---------------------------------------------------------------- admin: envia el pedido a reparto
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    update public.pedidos set estado = 'confirmado' where id = v_pedido;
    update public.pedidos set estado = 'en_preparacion' where id = v_pedido;
    update public.pedidos set estado = 'listo' where id = v_pedido;
    update public.pedidos set estado = 'en_camino', repartidor_id = v_repartidor where id = v_pedido;

    -- ---------------------------------------------------------------- repartidor: lo que ve
    perform set_config('request.jwt.claims', json_build_object('sub', v_repartidor, 'role', 'authenticated')::text, true);

    select count(*) into n from public.pedidos where id = v_pedido and estado = 'en_camino';
    v_pruebas := v_pruebas || 'Repartidor ve su entrega en camino'::text;
    v_estados := v_estados || case when n = 1 then 'OK' else 'FALLA' end;

    select count(*) into n from public.pedido_detalle where pedido_id = v_pedido;
    v_pruebas := v_pruebas || 'Repartidor ve el detalle (tamaño y niveles) de su entrega'::text;
    v_estados := v_estados || case when n = 1 then 'OK' else 'FALLA' end;

    select count(*) into n from public.perfiles where id = v_duenio;
    v_pruebas := v_pruebas || 'Repartidor ve el nombre del cliente de su entrega (010)'::text;
    v_estados := v_estados || case when n = 1 then 'OK' else 'FALLA' end;

    select count(*) into n from public.perfiles where id <> v_duenio and id <> v_repartidor;
    v_pruebas := v_pruebas || 'Repartidor no ve otros perfiles'::text;
    v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

    select count(*) into n from public.pagos;
    v_pruebas := v_pruebas || 'Repartidor no ve pagos'::text;
    v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

    if v_ajeno is not null then
      select count(*) into n from public.pedidos where id = v_ajeno;
      v_pruebas := v_pruebas || 'Repartidor no ve un pedido que no tiene asignado'::text;
      v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

      update public.pedidos set estado = 'entregado' where id = v_ajeno;
      get diagnostics n = row_count;
      v_pruebas := v_pruebas || 'Repartidor no marca entregado un pedido ajeno'::text;
      v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;
    end if;

    -- ---------------------------------------------------------------- repartidor: lo que no puede cambiar
    v_fallo := false;
    begin
      update public.pedidos set estado = 'cancelado' where id = v_pedido;
      get diagnostics n = row_count;
      v_fallo := n = 0;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Repartidor no puede cancelar (en camino → cancelado)'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      update public.pedidos set estado = 'entregado', total = 1 where id = v_pedido;
      get diagnostics n = row_count;
      v_fallo := n = 0;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Repartidor no puede cambiar datos del pedido (total)'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      update public.pedidos set estado = 'entregado', repartidor_id = v_admin where id = v_pedido;
      get diagnostics n = row_count;
      v_fallo := n = 0;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Repartidor no puede reasignar la entrega'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    -- ---------------------------------------------------------------- F07 M2: no entregado
    v_fallo := false;
    begin
      update public.pedidos set estado = 'no_entregado' where id = v_pedido;
      get diagnostics n = row_count;
      v_fallo := n = 0;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Repartidor no marca no entregado sin motivo (011)'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      update public.pedidos set estado = 'no_entregado', motivo_no_entrega = '   ' where id = v_pedido;
      get diagnostics n = row_count;
      v_fallo := n = 0;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Repartidor no marca no entregado con un motivo en blanco'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      update public.pedidos set estado = 'entregado', motivo_no_entrega = 'Nadie recibió el pedido' where id = v_pedido;
      get diagnostics n = row_count;
      v_fallo := n = 0;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Repartidor no escribe motivo al marcar entregado'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    update public.pedidos set estado = 'no_entregado', motivo_no_entrega = 'Nadie recibió el pedido' where id = v_pedido;
    get diagnostics n = row_count;
    v_pruebas := v_pruebas || 'Repartidor marca su entrega como no entregada con motivo'::text;
    v_estados := v_estados || case when n = 1 then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      update public.pedidos set estado = 'entregado' where id = v_pedido;
      get diagnostics n = row_count;
      v_fallo := n = 0;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Repartidor no cambia un pedido no entregado'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    -- ---------------------------------------------------------------- admin: reprograma y reenvia
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

    v_fallo := false;
    begin
      update public.pedidos set motivo_no_entrega = 'Otro' where id = v_pedido;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Admin no cambia el motivo de no entrega'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      update public.pedidos set estado = 'listo' where id = v_pedido;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Admin no reprograma sin quitar el repartidor'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    update public.pedidos set estado = 'listo', repartidor_id = null where id = v_pedido;
    select count(*) into n from public.pedidos
    where id = v_pedido and estado = 'listo' and repartidor_id is null and motivo_no_entrega = 'Nadie recibió el pedido';
    v_pruebas := v_pruebas || 'Admin reprograma (no entregado → listo sin repartidor) y se conserva el motivo'::text;
    v_estados := v_estados || case when n = 1 then 'OK' else 'FALLA' end;

    update public.pedidos set estado = 'en_camino', repartidor_id = v_repartidor where id = v_pedido;

    -- ---------------------------------------------------------------- repartidor: entrega
    perform set_config('request.jwt.claims', json_build_object('sub', v_repartidor, 'role', 'authenticated')::text, true);

    update public.pedidos set estado = 'entregado' where id = v_pedido;
    get diagnostics n = row_count;
    v_pruebas := v_pruebas || 'Repartidor marca su entrega como entregada'::text;
    v_estados := v_estados || case when n = 1 then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      update public.pedidos set estado = 'en_camino' where id = v_pedido;
      get diagnostics n = row_count;
      v_fallo := n = 0;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Repartidor no puede regresar un pedido entregado'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    raise exception 'DESHACER';
  exception when others then
    if sqlerrm <> 'DESHACER' then
      v_pruebas := v_pruebas || ('Error inesperado: ' || sqlerrm);
      v_estados := v_estados || 'FALLA'::text;
    end if;
  end;

  insert into resultados (prueba, resultado)
  select * from unnest(v_pruebas, v_estados);
end;
$$;

select prueba, resultado from resultados order by n;
