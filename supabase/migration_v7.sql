-- Claudia — migration v7 (auth profiles + roles)
-- Backs the username/password auth + admin tab. One row per Supabase Auth user,
-- carrying their role. Run once in the Supabase SQL editor (after enabling auth).
-- Safe to re-run.

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  role         text not null default 'user' check (role in ('admin', 'user')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- RLS on, no public policies: the app reads/writes profiles only via the
-- server-side service-role client (which bypasses RLS), never from the browser.
alter table public.profiles enable row level security;
