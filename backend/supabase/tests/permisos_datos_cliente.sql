-- F07 M7: prueba de permisos de datos_cliente (013) contra la base de datos.
-- Se corre completo en el SQL Editor de Supabase. Simula a cada usuario cambiando el rol a
-- 'authenticated' y el usuario de auth.uid(); al final DESHACE todos los cambios y solo
-- muestra la tabla de resultados (prueba / OK o FALLA).
--
-- Necesita en la base: un admin, un repartidor y dos clientes.

drop table if exists pg_temp.resultados;
create temp table resultados (n serial, prueba text, resultado text);

do $$
declare
  v_admin uuid;
  v_repartidor uuid;
  v_cliente uuid;
  v_otro uuid;
  v_usuario uuid;
  v_rol text;
  v_telefono text;
  n int;
  v_fallo boolean;
  v_pruebas text[] := '{}';
  v_estados text[] := '{}';
begin
  select id into v_admin from public.perfiles where rol = 'admin' limit 1;
  select id into v_repartidor from public.perfiles where rol = 'repartidor' limit 1;
  select id into v_cliente from public.perfiles where rol = 'cliente' order by id limit 1;
  select id into v_otro from public.perfiles where rol = 'cliente' and id <> v_cliente order by id limit 1;

  if v_admin is null or v_repartidor is null or v_cliente is null or v_otro is null then
    raise exception '%', 'Faltan datos de prueba:'
      || case when v_admin is null then ' un perfil admin;' else '' end
      || case when v_repartidor is null then ' un perfil repartidor;' else '' end
      || case when v_cliente is null or v_otro is null then ' dos perfiles cliente;' else '' end;
  end if;

  -- todo lo que sigue se deshace con la excepcion DESHACER del final
  begin
    perform set_config('role', 'authenticated', true);

    -- ------------------------------------------------------------ el dueño
    perform set_config('request.jwt.claims', json_build_object('sub', v_cliente, 'role', 'authenticated')::text, true);

    insert into public.datos_cliente (usuario_id, telefono) values (v_cliente, '6461111111')
    on conflict (usuario_id) do update set telefono = excluded.telefono;
    select telefono into v_telefono from public.datos_cliente where usuario_id = v_cliente;
    v_pruebas := v_pruebas || 'Cliente guarda y lee sus datos'::text;
    v_estados := v_estados || case when v_telefono = '6461111111' then 'OK' else 'FALLA' end;

    update public.datos_cliente
    set calle = 'Calle Primera', numero_exterior = '1', colonia = 'Centro',
        direccion_lat = 31.78, direccion_lng = -116.6
    where usuario_id = v_cliente;
    get diagnostics n = row_count;
    v_pruebas := v_pruebas || 'Cliente edita su dirección'::text;
    v_estados := v_estados || case when n = 1 then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      update public.datos_cliente set calle = null where usuario_id = v_cliente;
    exception when check_violation then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'La dirección no puede quedar a medias'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      insert into public.datos_cliente (usuario_id, telefono) values (v_otro, '6462222222');
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Cliente no crea datos de otro usuario'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    -- ------------------------------- otro cliente, repartidor y admin
    foreach v_usuario in array array[v_otro, v_repartidor, v_admin] loop
      v_rol := case v_usuario when v_otro then 'Otro cliente' when v_repartidor then 'Repartidor' else 'Admin' end;
      perform set_config('request.jwt.claims', json_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);

      select count(*) into n from public.datos_cliente where usuario_id = v_cliente;
      v_pruebas := v_pruebas || (v_rol || ' no lee los datos del cliente');
      v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

      update public.datos_cliente set telefono = '6469999999' where usuario_id = v_cliente;
      get diagnostics n = row_count;
      v_pruebas := v_pruebas || (v_rol || ' no edita los datos del cliente');
      v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;
    end loop;

    -- el telefono sigue siendo el del dueño
    perform set_config('request.jwt.claims', json_build_object('sub', v_cliente, 'role', 'authenticated')::text, true);
    select telefono into v_telefono from public.datos_cliente where usuario_id = v_cliente;
    v_pruebas := v_pruebas || 'Nadie más cambió el teléfono'::text;
    v_estados := v_estados || case when v_telefono = '6461111111' then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      delete from public.datos_cliente where usuario_id = v_cliente;
      get diagnostics n = row_count;
      v_fallo := n = 0;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Nadie puede borrar la fila (solo vaciar columnas)'::text;
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
