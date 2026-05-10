-- ══════════════════════════════════════════════════════════════
--  CercaYa — Schema Supabase
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ══════════════════════════════════════════════════════════════

-- ── Extensiones ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Perfiles (extiende auth.users) ───────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text        not null,
  initials      text        not null,
  location      text        not null default '',
  phone_verified boolean    not null default false,
  phone_number  text,
  dni_verified  boolean     not null default false,
  dni_number    text,
  created_at    timestamptz not null default now()
);

-- ── Productos ─────────────────────────────────────────────────
create table public.products (
  id          bigserial   primary key,
  user_id     uuid        references public.profiles(id) on delete set null,
  emoji       text        not null default '📦',
  title       text        not null,
  price       text        not null,
  location    text        not null default '',
  distance    text        not null default 'Cerca tuyo',
  bg          text        not null default '#f5f5f3',
  verified    boolean     not null default false,
  category    text        not null,
  condition   text        check (condition in ('Nuevo','Usado')),
  description text        not null default '',
  created_at  timestamptz not null default now()
);

-- ── Conversaciones ────────────────────────────────────────────
create table public.conversations (
  id               bigserial   primary key,
  product_id       bigint      references public.products(id) on delete cascade,
  product_title    text        not null default '',
  product_emoji    text        not null default '📦',
  product_bg       text        not null default '#f5f5f3',
  buyer_id         uuid        references public.profiles(id) on delete cascade,
  buyer_name       text        not null default '',
  buyer_initials   text        not null default '',
  seller_id        uuid        references public.profiles(id) on delete cascade,
  seller_name      text        not null default '',
  seller_initials  text        not null default '',
  last_message     text        not null default '',
  last_message_at  timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

-- ── Mensajes ──────────────────────────────────────────────────
create table public.messages (
  id               bigserial   primary key,
  conversation_id  bigint      not null references public.conversations(id) on delete cascade,
  sender_id        uuid        references public.profiles(id) on delete set null,
  sender_initials  text        not null default '',
  text             text        not null,
  created_at       timestamptz not null default now()
);

-- ── Reseñas ───────────────────────────────────────────────────
create table public.reviews (
  id                bigserial   primary key,
  seller_id         uuid        not null references public.profiles(id) on delete cascade,
  reviewer_id       uuid        not null references public.profiles(id) on delete cascade,
  reviewer_name     text        not null default '',
  reviewer_initials text        not null default '',
  rating            int         not null check (rating between 1 and 5),
  text              text        not null default '',
  created_at        timestamptz not null default now(),
  unique (seller_id, reviewer_id)   -- una reseña por par
);

-- ── Favoritos ─────────────────────────────────────────────────
create table public.favorites (
  user_id     uuid    not null references public.profiles(id) on delete cascade,
  product_id  bigint  not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ── Lecturas de conversación ──────────────────────────────────
create table public.conversation_reads (
  conversation_id  bigint      not null references public.conversations(id) on delete cascade,
  user_id          uuid        not null references public.profiles(id) on delete cascade,
  read_at          timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- ══════════════════════════════════════════════════════════════
--  Row Level Security (RLS)
-- ══════════════════════════════════════════════════════════════

alter table public.profiles           enable row level security;
alter table public.products           enable row level security;
alter table public.conversations      enable row level security;
alter table public.messages           enable row level security;
alter table public.reviews            enable row level security;
alter table public.favorites          enable row level security;
alter table public.conversation_reads enable row level security;

-- profiles
create policy "Perfiles visibles para todos"     on public.profiles for select using (true);
create policy "Cada usuario edita su perfil"     on public.profiles for update using (auth.uid() = id);

-- products
create policy "Productos visibles para todos"    on public.products for select using (true);
create policy "Usuario crea sus productos"       on public.products for insert with check (auth.uid() = user_id);
create policy "Usuario edita sus productos"      on public.products for update using (auth.uid() = user_id);
create policy "Usuario elimina sus productos"    on public.products for delete using (auth.uid() = user_id);

-- conversations
create policy "Ver conversaciones propias"       on public.conversations for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Crear conversación como comprador" on public.conversations for insert with check (auth.uid() = buyer_id);
create policy "Actualizar conversación propia"   on public.conversations for update using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- messages
create policy "Ver mensajes de conversaciones propias" on public.messages for select
  using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())));
create policy "Enviar mensajes"                  on public.messages for insert with check (auth.uid() = sender_id);

-- reviews
create policy "Reseñas visibles para todos"      on public.reviews for select using (true);
create policy "Crear reseña autenticado"         on public.reviews for insert with check (auth.uid() = reviewer_id);

-- favorites
create policy "Ver propios favoritos"            on public.favorites for select using (auth.uid() = user_id);
create policy "Agregar favorito"                 on public.favorites for insert with check (auth.uid() = user_id);
create policy "Quitar favorito"                  on public.favorites for delete using (auth.uid() = user_id);

-- conversation_reads
create policy "Ver propias lecturas"             on public.conversation_reads for select using (auth.uid() = user_id);
create policy "Insertar lectura"                 on public.conversation_reads for insert with check (auth.uid() = user_id);
create policy "Actualizar lectura"               on public.conversation_reads for update using (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
--  Trigger: crear perfil automáticamente al registrarse
-- ══════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, initials, location)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Usuario'),
    coalesce(new.raw_user_meta_data->>'initials', 'U'),
    coalesce(new.raw_user_meta_data->>'location', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
