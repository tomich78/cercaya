-- ══════════════════════════════════════════════════════════════
--  CercaYa — Búsqueda y filtrado del lado del servidor
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
--  Es 100% aditiva: agrega columnas e índices, no modifica ni borra
--  datos existentes. El código de guardado actual sigue funcionando
--  sin cambios (price_amount y search_text se completan solos).
-- ══════════════════════════════════════════════════════════════

-- ── Extensión para búsqueda por substring rápida (trigram) ────
create extension if not exists pg_trgm;

-- ══════════════════════════════════════════════════════════════
--  1. Precio numérico
--     Los precios se guardan como texto ("$150.000/mes", "150000",
--     "A convenir"). Derivamos un entero para poder ordenar y filtrar.
-- ══════════════════════════════════════════════════════════════

alter table public.products add column if not exists price_amount bigint;

-- Función: extrae los dígitos del texto de precio → bigint (o null)
create or replace function public.parse_price_amount(price_text text)
returns bigint language sql immutable as $$
  select nullif(regexp_replace(coalesce(price_text, ''), '[^0-9]', '', 'g'), '')::bigint;
$$;

-- Backfill de todos los productos existentes
update public.products
   set price_amount = public.parse_price_amount(price)
 where price_amount is null;

-- Trigger: mantener price_amount sincronizado en insert/update
create or replace function public.sync_price_amount()
returns trigger language plpgsql as $$
begin
  new.price_amount := public.parse_price_amount(new.price);
  return new;
end;
$$;

drop trigger if exists trg_sync_price_amount on public.products;
create trigger trg_sync_price_amount
  before insert or update of price on public.products
  for each row execute procedure public.sync_price_amount();

-- ══════════════════════════════════════════════════════════════
--  2. Búsqueda por texto (title + description + category + location)
--     Columna generada + índice trigram para ilike '%term%' rápido.
-- ══════════════════════════════════════════════════════════════

alter table public.products
  add column if not exists search_text text
  generated always as (
    coalesce(title, '')       || ' ' ||
    coalesce(description, '')  || ' ' ||
    coalesce(category, '')     || ' ' ||
    coalesce(location, '')
  ) stored;

create index if not exists idx_products_search_trgm
  on public.products using gin (search_text gin_trgm_ops);

-- ══════════════════════════════════════════════════════════════
--  3. Índices para filtros y orden comunes del feed
-- ══════════════════════════════════════════════════════════════

create index if not exists idx_products_sold         on public.products (sold);
create index if not exists idx_products_listing_type on public.products (listing_type);
create index if not exists idx_products_category      on public.products (category);
create index if not exists idx_products_created_at    on public.products (created_at desc);
create index if not exists idx_products_price_amount  on public.products (price_amount);
create index if not exists idx_products_user_id       on public.products (user_id);

-- Índice parcial: el caso más común del feed (activos y no vencidos,
-- ordenados por destacado y fecha).
create index if not exists idx_products_feed
  on public.products (featured desc, created_at desc)
  where sold = false;
