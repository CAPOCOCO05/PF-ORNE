-- 015: catalogo visible sin cuenta (F09)
-- Un visitante sin sesion (rol 'anon') puede ver los pasteles publicados para explorar
-- el catalogo; para pedir debe crear su cuenta o iniciar sesion.
-- - Solo lectura y solo los activos: los ocultos siguen siendo visibles solo para el admin.
-- - Las imagenes ya son publicas (bucket 'catalogo', 005).
-- - Pedidos, perfiles y datos del cliente no cambian: siguen siendo solo 'authenticated'.

grant select on public.catalogo_pasteles to anon;

create policy "catalogo_lectura_publica" on public.catalogo_pasteles
  for select to anon
  using (activo);
