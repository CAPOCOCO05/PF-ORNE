alter table pedidos enable row level security;
alter table pedido_detalle enable row level security;
alter table pagos enable row level security;

-- Un usuario solo ve/crea/edita SUS pedidos
create policy "usuarios_ven_sus_pedidos" on pedidos
  for select using (auth.uid() = usuario_id);

create policy "usuarios_crean_sus_pedidos" on pedidos
  for insert with check (auth.uid() = usuario_id);

-- Detalle: se filtra a traves del pedido relacionado
create policy "usuarios_ven_su_detalle" on pedido_detalle
  for select using (
    exists (select 1 from pedidos where pedidos.id = pedido_detalle.pedido_id and pedidos.usuario_id = auth.uid())
  );

create policy "usuarios_crean_su_detalle" on pedido_detalle
  for insert with check (
    exists (select 1 from pedidos where pedidos.id = pedido_detalle.pedido_id and pedidos.usuario_id = auth.uid())
  );

-- Mismo patron para pagos
create policy "usuarios_ven_sus_pagos" on pagos
  for select using (
    exists (select 1 from pedidos where pedidos.id = pagos.pedido_id and pedidos.usuario_id = auth.uid())
  );

create policy "usuarios_crean_sus_pagos" on pagos
  for insert with check (
    exists (select 1 from pedidos where pedidos.id = pagos.pedido_id and pedidos.usuario_id = auth.uid())
  );