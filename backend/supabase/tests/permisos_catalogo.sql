-- F07 M4: prueba de permisos del catalogo (012) contra la base de datos.
-- Se corre completo en el SQL Editor de Supabase. Simula a cada usuario cambiando el rol a
-- 'authenticated' y el usuario de auth.uid(); al final DESHACE todos los cambios y solo
-- muestra la tabla de resultados (prueba / OK o FALLA).
--
-- Necesita en la base: un admin, un repartidor, un cliente y al menos un pastel en el catalogo.

drop table if exists pg_temp.resultados;
create temp table resultados (n serial, prueba text, resultado text);

do $$
declare
  v_admin uuid;
  v_repartidor uuid;
  v_cliente uuid;
  v_pastel uuid;
  v_nuevo uuid;
  v_precio numeric;
  n int;
  v_fallo boolean;
  v_usuario uuid;
  v_rol text;
  v_pruebas text[] := '{}';
  v_estados text[] := '{}';
begin
  select id into v_admin from public.perfiles where rol = 'admin' limit 1;
  select id into v_repartidor from public.perfiles where rol = 'repartidor' limit 1;
  select id into v_cliente from public.perfiles where rol = 'cliente' limit 1;
  select id into v_pastel from public.catalogo_pasteles where activo order by nombre limit 1;

  if v_admin is null or v_repartidor is null or v_cliente is null or v_pastel is null then
    raise exception '%', 'Faltan datos de prueba:'
      || case when v_admin is null then ' un perfil admin;' else '' end
      || case when v_repartidor is null then ' un perfil repartidor;' else '' end
      || case when v_cliente is null then ' un perfil cliente;' else '' end
      || case when v_pastel is null then ' un pastel activo en el catalogo;' else '' end;
  end if;

  -- todo lo que sigue se deshace con la excepcion DESHACER del final
  begin
    perform set_config('role', 'authenticated', true);

    -- ------------------------------------------------- cliente y repartidor
    foreach v_usuario in array array[v_cliente, v_repartidor] loop
      v_rol := case when v_usuario = v_cliente then 'Cliente' else 'Repartidor' end;
      perform set_config('request.jwt.claims', json_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);

      v_fallo := false;
      begin
        insert into public.catalogo_pasteles (nombre, precio_base, tamanio, niveles, tipo_pan, relleno)
        values ('Prueba permisos ' || v_rol, 100, '10', 1, 'vainilla', 'cajeta');
      exception when others then v_fallo := true;
      end;
      v_pruebas := v_pruebas || (v_rol || ' no puede crear pasteles');
      v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

      update public.catalogo_pasteles set nombre = 'Cambiado por ' || v_rol where id = v_pastel;
      get diagnostics n = row_count;
      v_pruebas := v_pruebas || (v_rol || ' no puede editar pasteles');
      v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

      v_fallo := false;
      begin
        insert into storage.objects (bucket_id, name) values ('catalogo', 'prueba-permisos-' || lower(v_rol) || '.jpg');
      exception when others then v_fallo := true;
      end;
      v_pruebas := v_pruebas || (v_rol || ' no puede subir imágenes al bucket catalogo');
      v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;
    end loop;

    -- ---------------------------------------------------------------- admin
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

    -- precio_base enviado a proposito incorrecto: el trigger lo corrige
    insert into public.catalogo_pasteles (nombre, precio_base, tamanio, niveles, tipo_pan, relleno, activo)
    values ('Prueba de permisos ORNE', 1, '20', 2, 'chocolate', 'chocolate', false)
    returning id, precio_base into v_nuevo, v_precio;
    v_pruebas := v_pruebas || 'Admin crea un pastel'::text;
    v_estados := v_estados || case when v_nuevo is not null then 'OK' else 'FALLA' end;

    v_pruebas := v_pruebas || 'El precio lo calcula la base (calcular_precio)'::text;
    v_estados := v_estados || case when v_precio = public.calcular_precio('20', 2, 'chocolate') then 'OK' else 'FALLA' end;

    update public.catalogo_pasteles set niveles = 3 where id = v_nuevo returning precio_base into v_precio;
    v_pruebas := v_pruebas || 'Al editar se recalcula el precio'::text;
    v_estados := v_estados || case when v_precio = public.calcular_precio('20', 3, 'chocolate') then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      insert into public.catalogo_pasteles (nombre, precio_base, tamanio, niveles, tipo_pan, relleno)
      values ('  PRUEBA de permisos orne ', 0, '10', 1, 'vainilla', 'cajeta');
    exception when unique_violation then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'No se repite el nombre (sin distinguir mayúsculas)'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      delete from public.catalogo_pasteles where id = v_nuevo;
      get diagnostics n = row_count;
      v_fallo := n = 0;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Admin no puede borrar pasteles (solo ocultar)'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    select count(*) into n from public.catalogo_pasteles where id = v_nuevo;
    v_pruebas := v_pruebas || 'Admin ve los pasteles ocultos'::text;
    v_estados := v_estados || case when n = 1 then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      insert into storage.objects (bucket_id, name) values ('catalogo', 'prueba-permisos-admin.jpg');
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Admin puede subir imágenes al bucket catalogo'::text;
    v_estados := v_estados || case when not v_fallo then 'OK' else 'FALLA' end;

    -- el cliente no ve el pastel oculto
    perform set_config('request.jwt.claims', json_build_object('sub', v_cliente, 'role', 'authenticated')::text, true);
    select count(*) into n from public.catalogo_pasteles where id = v_nuevo;
    v_pruebas := v_pruebas || 'Cliente no ve un pastel oculto'::text;
    v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

    -- ------------------------------------------------- visitante sin sesion (F09, 015)
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

    select count(*) into n from public.catalogo_pasteles where id = v_pastel;
    v_pruebas := v_pruebas || 'Sin sesión ve los pasteles publicados'::text;
    v_estados := v_estados || case when n = 1 then 'OK' else 'FALLA' end;

    select count(*) into n from public.catalogo_pasteles where id = v_nuevo;
    v_pruebas := v_pruebas || 'Sin sesión no ve un pastel oculto'::text;
    v_estados := v_estados || case when n = 0 then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      insert into public.catalogo_pasteles (nombre, precio_base, tamanio, niveles, tipo_pan, relleno)
      values ('Prueba permisos visitante', 100, '10', 1, 'vainilla', 'cajeta');
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Sin sesión no puede crear pasteles'::text;
    v_estados := v_estados || case when v_fallo then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      update public.catalogo_pasteles set nombre = 'Cambiado sin sesión' where id = v_pastel;
      get diagnostics n = row_count;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Sin sesión no puede editar pasteles'::text;
    v_estados := v_estados || case when v_fallo or n = 0 then 'OK' else 'FALLA' end;

    v_fallo := false;
    begin
      select count(*) into n from public.pedidos;
    exception when others then v_fallo := true;
    end;
    v_pruebas := v_pruebas || 'Sin sesión no ve pedidos'::text;
    v_estados := v_estados || case when v_fallo or n = 0 then 'OK' else 'FALLA' end;

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
