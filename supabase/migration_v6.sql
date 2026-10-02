-- Claudia — migration v6
-- Suggest-and-approve task creation. The "Auto-generate tasks" button records a
-- request; Claudia's background scan reads recent email / Teams / Granola and
-- writes SUGGESTIONS here (never live tasks). Shayan reviews them in a popup and
-- approves which ones become real tasks. Run once in the Supabase SQL editor.
-- Safe to re-run.

-- 1) Singleton state row for the scan/suggestion run.
create table if not exists public.suggestion_state (
  id              text primary key default 'singleton',
  status          text not null default 'idle'
                    check (status in ('idle','working','ready','error')),
  requested_at    timestamptz,   -- set by the button when a scan is requested
  ready_at        timestamptz,   -- set when the scan finished writing suggestions
  last_scanned_at timestamptz,   -- watermark: end of the last completed scan window
  note            text,          -- one-line summary of the last run
  count           int not null default 0,
  updated_at      timestamptz not null default now()
);
insert into public.suggestion_state (id) values ('singleton') on conflict (id) do nothing;
alter table public.suggestion_state enable row level security;

-- 2) The current batch of suggested tasks (cleared when approved or discarded).
create table if not exists public.task_suggestions (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  notes      text,            -- Claudia's reasoning / context ("why I suggested this")
  priority   text not null default 'medium' check (priority in ('low','medium','high')),
  category   text not null default 'general'
               check (category in ('portfolio','pipeline','general','recurring')),
  company    text,
  due_date   date,
  source     text,            -- 'email' | 'teams' | 'call'
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.task_suggestions enable row level security;
