-- F01: permitir guardar pedidos como borrador (ver F01, D1)

-- Pedidos: los datos de entrega (F02) y el folio (F03) se capturan después del borrador
alter table public.pedidos
  alter column fecha_entrega drop not null,
  alter column hora_entrega drop not null,
  alter column tipo_entrega drop not null,
  alter column folio drop not null,
  alter column estado set default 'borrador',
  add column paso_actual int not null default 1 check (paso_actual between 1 and 3),
  add constraint pedidos_tipo_entrega_check check (tipo_entrega in ('domicilio', 'recoleccion'));

-- Detalle: un solo detalle por pedido; pan y relleno se eligen en el paso 2
alter table public.pedido_detalle
  alter column tipo_pan drop not null,
  alter column relleno drop not null,
  add column tamanio text not null default '10' check (tamanio in ('10', '15', '20', '30')),
  add constraint pedido_detalle_pedido_unico unique (pedido_id),
  add constraint pedido_detalle_niveles_check check (niveles between 1 and 4),
  add constraint pedido_detalle_decoracion_check check (char_length(decoracion_texto) <= 500),
  add constraint pedido_detalle_tipo_pan_check check (tipo_pan in ('vainilla', 'chocolate', 'redvelvet', 'tresleches', 'fresa', 'zanahoria')),
  add constraint pedido_detalle_relleno_check check (relleno in ('cajeta', 'chocolate', 'cremapastelera', 'mantequillademani', 'mermeladafresa'));

-- RLS del cliente sobre sus borradores

-- Edita su pedido solo mientras es borrador; al guardar solo puede quedar en
-- 'borrador' o pasar a 'pendiente' (confirmación en F03)
create policy "usuarios_editan_sus_borradores" on public.pedidos
  for update
  using (auth.uid() = usuario_id and estado = 'borrador')
  with check (auth.uid() = usuario_id and estado in ('borrador', 'pendiente'));

-- Elimina sus borradores (el detalle se borra en cascada)
create policy "usuarios_eliminan_sus_borradores" on public.pedidos
  for delete
  using (auth.uid() = usuario_id and estado = 'borrador');

-- El detalle solo se crea y edita mientras el pedido es borrador
drop policy "usuarios_crean_su_detalle" on public.pedido_detalle;

create policy "usuarios_crean_su_detalle" on public.pedido_detalle
  for insert with check (
    exists (select 1 from public.pedidos where pedidos.id = pedido_detalle.pedido_id
            and pedidos.usuario_id = auth.uid() and pedidos.estado = 'borrador')
  );

create policy "usuarios_editan_su_detalle" on public.pedido_detalle
  for update
  using (
    exists (select 1 from public.pedidos where pedidos.id = pedido_detalle.pedido_id
            and pedidos.usuario_id = auth.uid() and pedidos.estado = 'borrador')
  )
  with check (
    exists (select 1 from public.pedidos where pedidos.id = pedido_detalle.pedido_id
            and pedidos.usuario_id = auth.uid() and pedidos.estado = 'borrador')
  );

-- Storage: imágenes de referencia (F01, D9). Reemplaza el bucket creado a mano en 003
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('referencias-pasteles', 'referencias-pasteles', false, 5242880,
        array['image/jpeg', 'image/png', 'image/heic', 'image/heif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuario trabaja solo dentro de su carpeta: {usuario_id}/{pedido_id}/referencia.<ext>
create policy "referencias_subir_propias" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'referencias-pasteles' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "referencias_ver_propias" on storage.objects
  for select to authenticated
  using (bucket_id = 'referencias-pasteles' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "referencias_reemplazar_propias" on storage.objects
  for update to authenticated
  using (bucket_id = 'referencias-pasteles' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "referencias_borrar_propias" on storage.objects
  for delete to authenticated
  using (bucket_id = 'referencias-pasteles' and (storage.foldername(name))[1] = auth.uid()::text);

-- El admin ve todas las imágenes de referencia (F04)
create policy "referencias_admin_ve_todas" on storage.objects
  for select to authenticated
  using (bucket_id = 'referencias-pasteles' and public.mi_rol() = 'admin');
