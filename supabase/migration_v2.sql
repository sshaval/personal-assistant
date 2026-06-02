-- Claudia — migration v2
-- Adds task categories, creator attribution, recurrence, and a meetings table.
-- Run this once in the Supabase SQL editor (after schema.sql + seed.sql).
-- Safe to re-run.

-- 1) Tasks: new columns -----------------------------------------------------
alter table public.tasks
  add column if not exists category text not null default 'general'
    check (category in ('portfolio','pipeline','general','recurring'));
alter table public.tasks
  add column if not exists created_by text not null default 'user'
    check (created_by in ('user','claudia'));
alter table public.tasks
  add column if not exists recurrence text not null default 'none'
    check (recurrence in ('none','daily','weekly','monthly'));

create index if not exists tasks_category_idx on public.tasks (category);

-- 2) Re-attribute + categorize the originally seeded tasks ------------------
-- Everything seeded from the briefing was created by Claudia.
update public.tasks set created_by = 'claudia' where source <> 'manual';
-- Deal-related items -> Pipeline; admin/calendar -> General.
update public.tasks set category = 'pipeline'
  where tag in ('Volie','Placecube','K4','6WIND','Mobility','Nets/Motive');
update public.tasks set category = 'general'
  where tag = 'NetSuite' or source = 'calendar';

-- 3) Meetings (Day's View) --------------------------------------------------
-- Populated by Claudia from Granola / Outlook / Teams; the app only displays.
create table if not exists public.meetings (
  id           uuid primary key default gen_random_uuid(),
  meeting_date date not null,
  start_time   text,           -- display string, e.g. '10:30 AM'
  end_time     text,
  sort_order   int not null default 0,
  title        text not null,
  category     text,           -- 'portfolio' | 'pipeline' | 'internal' | 'external' ...
  attendees    text,
  summary      text,           -- one-line: what it is / why it's on the calendar
  prep         text,           -- markdown: short prep + last context
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists meetings_date_idx on public.meetings (meeting_date);

alter table public.meetings enable row level security;

-- 4) Day refresh state (the "redo the Day's View" button) -------------------
-- Shared signal between the web app and Claudia's background refresh task:
--   • the Refresh button sets requested_at = now() for a date;
--   • Claudia re-pulls the calendar, rewrites that date's meetings, then sets
--     refreshed_at = now() and clears requested_at.
-- A date has a PENDING request when requested_at is not null.
create table if not exists public.day_refresh (
  meeting_date date primary key,
  requested_at timestamptz,      -- set by the button; null once fulfilled
  refreshed_at timestamptz,      -- last time Claudia rebuilt this date
  note         text,             -- optional one-line note from the last run
  updated_at   timestamptz not null default now()
);

alter table public.day_refresh enable row level security;
