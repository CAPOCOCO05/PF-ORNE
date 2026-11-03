-- F06: el repartidor ve el nombre del cliente de sus entregas en curso
-- (ver specs/features/F06-repartidor.md D1). Sin esta politica, el nombre del cliente
-- llega vacio porque perfiles solo deja ver el propio perfil y al admin todos (004)

create policy "repartidor_ve_clientes_de_sus_entregas" on public.perfiles
  for select using (
    public.mi_rol() = 'repartidor'
    and exists (select 1 from public.pedidos
                where pedidos.usuario_id = perfiles.id
                  and pedidos.repartidor_id = auth.uid()
                  and pedidos.estado = 'en_camino')
  );
