-- Personal Assistant — database schema
-- Run this once in the Supabase SQL editor for the personal-assistant project.

create extension if not exists "pgcrypto";

-- Tasks / to-do list -------------------------------------------------------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  notes       text,
  done        boolean not null default false,
  priority    text not null default 'medium' check (priority in ('low','medium','high')),
  due_date    date,
  source      text not null default 'manual'
                check (source in ('manual','briefing','email','call','teams','calendar')),
  tag         text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  done_at     timestamptz
);

create index if not exists tasks_done_idx     on public.tasks (done);
create index if not exists tasks_due_date_idx on public.tasks (due_date);

-- Daily briefings ----------------------------------------------------------
create table if not exists public.briefings (
  id            uuid primary key default gen_random_uuid(),
  briefing_date date not null unique,          -- one briefing per day (upsert)
  content       text not null,                 -- markdown
  created_at    timestamptz not null default now()
);

-- Security -----------------------------------------------------------------
-- Lock everything down. The app talks to the database only from the server
-- using the service-role key, which bypasses RLS. There are no public
-- policies, so the anon key can read/write nothing.
alter table public.tasks     enable row level security;
alter table public.briefings enable row level security;
