-- 014: montos confirmados de los rellenos (F01 D7)
-- Cajeta pasa de $0 a $50 y Mermelada / Fresa de $0 a $70. Debe coincidir con
-- frontend/src/constants/precios.ts.
-- Los pedidos ya confirmados conservan su total; solo cambia lo que se calcule desde ahora.

create or replace function public.calcular_precio(p_tamanio text, p_niveles int, p_relleno text)
returns numeric(10,2)
language sql
immutable
as $$
  select (case p_tamanio when '10' then 350 when '15' then 500 when '20' then 650 when '30' then 900 end)
       + 250 * (p_niveles - 1)
       + case p_relleno
           when 'cajeta' then 50
           when 'mermeladafresa' then 70
           when 'cremapastelera' then 30
           when 'chocolate' then 40
           when 'mantequillademani' then 50
           else 0
         end;
$$;

-- recalcula el precio de los pasteles del catalogo (el trigger de 012 lo pone)
update public.catalogo_pasteles set precio_base = precio_base;
