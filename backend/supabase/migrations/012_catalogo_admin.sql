-- F07 M4: el admin publica y edita pasteles del catalogo desde la app
-- (ver specs/features/F07-mejoras.md, M4 D1–D3)
--
-- - Sin borrado: para retirar un pastel se oculta (activo = false), no hay politica delete.
-- - precio_base lo calcula la base con calcular_precio (008); la app no lo escribe.
-- - Nombre unico sin distinguir mayusculas ni espacios de los extremos.

-- 1. Reglas de los datos ---------------------------------------------------------

alter table public.catalogo_pasteles
  add constraint catalogo_nombre_check check (char_length(btrim(nombre)) between 1 and 60),
  add constraint catalogo_descripcion_check check (descripcion is null or char_length(descripcion) <= 200);

create unique index catalogo_nombre_unico on public.catalogo_pasteles (lower(btrim(nombre)));

-- 2. Precio automatico (D2) --------------------------------------------------------

create or replace function public.calcular_precio_catalogo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.precio_base := public.calcular_precio(new.tamanio, new.niveles, new.relleno);
  return new;
end;
$$;

create trigger catalogo_precio_base
  before insert or update on public.catalogo_pasteles
  for each row execute function public.calcular_precio_catalogo();

-- recalcula los pasteles que ya existen (el trigger pone el precio)
update public.catalogo_pasteles set precio_base = precio_base;

-- 3. Permisos del admin en la tabla (D3) -------------------------------------------

create policy "catalogo_admin_crea" on public.catalogo_pasteles
  for insert to authenticated
  with check (public.mi_rol() = 'admin');

create policy "catalogo_admin_edita" on public.catalogo_pasteles
  for update to authenticated
  using (public.mi_rol() = 'admin')
  with check (public.mi_rol() = 'admin');

-- 4. Imagenes en el bucket publico 'catalogo' (D3, D4) -----------------------------
-- La lectura es publica (URL publica); solo el admin sube, reemplaza y borra.
-- Storage pide tambien select para upload con upsert y para remove

create policy "catalogo_admin_ve" on storage.objects
  for select to authenticated
  using (bucket_id = 'catalogo' and public.mi_rol() = 'admin');

create policy "catalogo_admin_sube" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'catalogo' and public.mi_rol() = 'admin');

create policy "catalogo_admin_reemplaza" on storage.objects
  for update to authenticated
  using (bucket_id = 'catalogo' and public.mi_rol() = 'admin');

create policy "catalogo_admin_borra" on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalogo' and public.mi_rol() = 'admin');
