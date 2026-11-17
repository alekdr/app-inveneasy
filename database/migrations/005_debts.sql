-- ============================================================
-- 005_debts.sql  –  Tabla de deudas ("Paz y Salvo")
-- ============================================================

create table if not exists public.debts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  creditor    text not null,                -- a quién le debo
  amount      numeric(15, 2) not null,      -- cuánto debo (en COP)
  due_date    date,                         -- fecha límite de pago
  note        text,                         -- nota opcional
  paid        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- RLS
alter table public.debts enable row level security;

create policy "Users can manage their own debts"
  on public.debts
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Índice para ordenar por fecha de creación
create index if not exists debts_user_id_idx on public.debts (user_id, created_at desc);
