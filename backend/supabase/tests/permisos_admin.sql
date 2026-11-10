-- F04 D8: prueba de permisos del panel admin contra la base de datos (no solo la app).
-- F07: incluye el contador por estado (M3) y la cancelacion de un pedido no entregado (M2).
-- Se corre completo en el SQL Editor de Supabase. Simula a cada usuario cambiando el rol a
-- 'authenticated' y el usuario de auth.uid(); al final DESHACE todos los cambios y solo
-- muestra la tabla de resultados (prueba / OK o FALLA).
--
-- Necesita en la base: un admin, un repartidor, dos clientes y al menos un pedido
-- 'pendiente' (confirmado desde la app).

drop table if exists pg_temp.resultados;
create temp table resultados (n serial, prueba text, resultado text);

do $$
declare
  v_admin uuid;
  v_repartidor uuid;
  v_duenio uuid;
  v_otro uuid;
  v_pedido uuid;
  v_tipo text;
  v_borradores int;
  n int;
  v_fallo boolean;
  v_pruebas text[] := '{}';
  v_estados text[] := '{}';
begin
  select id into v_admin from public.perfiles where rol = 'admin' limit 1;
  select id into v_repartidor from public.perfiles where rol = 'repartidor' limit 1;
  select id, usuario_id, tipo_entrega into v_pedido, v_duenio, v_tipo from public.pedidos
  where estado = 'pendiente' order by (tipo_entrega = 'domicilio') desc limit 1;
  select id into v_otro from public.perfiles where rol = 'cliente' and id <> v_duenio limit 1;
  select count(*) into v_borradores from public.pedidos where estado = 'borrador';

  if v_admin is null or v_repartidor is null or v_pedido is null or v_otro is null then
    raise exception '%', 'Faltan datos de prueba:'
      || case when v_admin is null then ' un perfil admin;' else '' end
      || case when v_repartidor is null then ' un perfil repartidor;' else '' end
      || case when v_pedido is null then ' un pedido en estado pendiente;' else '' end
      || case when v_pedido is not null and v_otro is null then ' un segundo cliente (distinto del dueño del pedido);' else '' end;
  end if;

  -- todo lo que sigue se deshace con la excepcion DESHACER del final
  begin
    -- ---------------------------------------------------------------- otro cliente
    perform set_config('request.jwt.claims', json_build_object('sub', v_otro, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    select count(*) into n from public.pedidos where id = v_pedido;
    v_pruebas := v_pruebas || 'Otro cliente no ve el pedido ajeno'::text;
    v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

    select count(*) into n from public.pedido_detalle where pedido_id = v_pedido;
    v_pruebas := v_pruebas || 'Otro cliente no ve el detalle ajeno'::text;
    v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

    select count(*) into n from public.pagos where pedido_id = v_pedido;
    v_pruebas := v_pruebas || 'Otro cliente no ve el pago ajeno'::text;
    v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

    update public.pedidos set estado = 'confirmado' where id = v_pedido;
    get diagnostics n = row_count;
    v_pruebas := v_pruebas || 'Otro cliente no cambia el estado'::text;
    v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

    -- ---------------------------------------------------------------- dueño
    perform set_config('request.jwt.claims', json_build_object('sub', v_duenio, 'role', 'authenticated')::text, true);

    update public.pedidos set estado = 'confirmado' where id = v_pedido;
    get diagnostics n = row_count;
    v_pruebas := v_pruebas || 'El dueño no confirma su propio pedido'::text;
    v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

    select coalesce(sum(total), 0) - (select count(*) from public.pedidos where usuario_id = v_duenio and estado <> 'borrador')
    into n from public.contar_pedidos_por_estado();
    v_pruebas := v_pruebas || 'El contador por estado solo cuenta los pedidos del propio cliente'::text;
    v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

    -- ---------------------------------------------------------------- repartidor sin asignar
    perform set_config('request.jwt.claims', json_build_object('sub', v_repartidor, 'role', 'authenticated')::text, true);

    select count(*) into n from public.pedidos where id = v_pedido;
    v_pruebas := v_pruebas || 'Repartidor no ve un pedido que no tiene asignado'::text;
    v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

    select count(*) into n from public.pagos;
    v_pruebas := v_pruebas || 'Repartidor no ve pagos'::text;
    v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

    update public.pedidos set estado = 'confirmado' where id = v_pedido;
    get diagnostics n = row_count;
    v_pruebas := v_pruebas || 'Repartidor no cambia el estado'::text;
    v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

    -- ---------------------------------------------------------------- admin
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

    select count(*) into n from public.pedidos where id = v_pedido;
    v_pruebas := v_pruebas || 'Admin ve pedidos de otros clientes'::text;
    v_estados := v_estados || case when n = 1 then 'OK' else 'FALLA' end;

    select count(*) into n from public.pedidos where estado = 'borrador';
    v_pruebas := v_pruebas || format('Admin no ve borradores (hay %s en la base)', v_borradores);
    v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

    select coalesce(sum(total), 0) - (select count(*) from public.pedidos) into n from public.contar_pedidos_por_estado();
    v_pruebas := v_pruebas || 'El contador por estado coincide con los pedidos que ve el admin (011)'::text;
    v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      update public.pedidos set estado = 'listo' where id = v_pedido;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Admin no puede saltar estados (pendiente → listo)'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      update public.pedidos set total = 1 where id = v_pedido;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Admin no puede cambiar datos del pedido (total)'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    -- avanza por el ciclo valido hasta 'listo'
    update public.pedidos set estado = 'confirmado' where id = v_pedido;
    update public.pedidos set estado = 'en_preparacion' where id = v_pedido;
    update public.pedidos set estado = 'listo' where id = v_pedido;
    select count(*) into n from public.pedidos where id = v_pedido and estado = 'listo';
    v_pruebas := v_pruebas || 'Admin avanza pendiente → confirmado → en preparación → listo'::text;
    v_estados := v_estados || case when n = 1 then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      update public.pedidos set estado = 'en_camino' where id = v_pedido;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'No pasa a en camino sin repartidor'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      update public.pedidos set estado = 'en_camino', repartidor_id = v_otro where id = v_pedido;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'No se puede asignar a un cliente como repartidor (009)'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    if v_tipo = 'domicilio' then
      update public.pedidos set estado = 'en_camino', repartidor_id = v_repartidor where id = v_pedido;
      select count(*) into n from public.pedidos where id = v_pedido and estado = 'en_camino';
      v_pruebas := v_pruebas || 'Domicilio pasa a en camino con repartidor'::text;
      v_estados := v_estados || case when n = 1 then 'OK' else 'FALLA' end;

      v_fallo := false;
      begin
        update public.pedidos set estado = 'no_entregado', motivo_no_entrega = 'Nadie recibió el pedido' where id = v_pedido;
      exception when others then v_fallo := true;
      end;
      v_pruebas := v_pruebas || 'Admin no marca no entregado (solo el repartidor, 011)'::text;
      v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

      -- el repartidor lo marca no entregado y el admin lo cancela
      perform set_config('request.jwt.claims', json_build_object('sub', v_repartidor, 'role', 'authenticated')::text, true);
      update public.pedidos set estado = 'no_entregado', motivo_no_entrega = 'El cliente rechazó el pedido' where id = v_pedido;
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

      update public.pedidos set estado = 'cancelado' where id = v_pedido;
      select count(*) into n from public.pedidos where id = v_pedido and estado = 'cancelado';
      v_pruebas := v_pruebas || 'Admin cancela un pedido no entregado'::text;
      v_estados := v_estados || case when n = 1 then 'OK' else 'FALLA' end;
    else
      update public.pedidos set estado = 'entregado' where id = v_pedido;
      select count(*) into n from public.pedidos where id = v_pedido and estado = 'entregado';
      v_pruebas := v_pruebas || 'Recolección pasa de listo a entregado'::text;
      v_estados := v_estados || case when n = 1 then 'OK' else 'FALLA' end;
    end if;

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
