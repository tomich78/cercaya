-- Tabla para guardar las suscripciones push de cada usuario
create table if not exists push_subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now()
);

-- Un usuario puede tener múltiples dispositivos, pero no duplicados del mismo endpoint
create unique index if not exists push_subscriptions_user_endpoint
  on push_subscriptions (user_id, endpoint);

-- Solo el propio usuario puede ver/insertar/borrar sus suscripciones
alter table push_subscriptions enable row level security;

create policy "push_subscriptions: usuario propio"
  on push_subscriptions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
