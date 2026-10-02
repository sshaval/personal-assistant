-- Claudia — migration v8
-- Host-safe briefing signal. The Summary page's "Regenerate" button used to write
-- a LOCAL file (.briefing-request.json) and write-briefing.mjs stamped another
-- LOCAL file (.briefing-state.json). That only works when the web app and the
-- Mac engine share one filesystem — which they won't once the site is hosted.
-- Move both to a single singleton DB row so the hosted button and the Mac's
-- content-refresh watcher share state through Supabase. Run once in the Supabase
-- SQL editor. Safe to re-run.

-- Singleton state row for the Daily Briefing refresh signal.
--   requested_at — set by the "Regenerate" button when a rebuild is requested
--   last_run_at  — set by write-briefing.mjs after it publishes a briefing
--   briefing_date — the day the last published briefing was for (YYYY-MM-DD)
-- A request is "pending" when requested_at is newer than last_run_at.
create table if not exists public.briefing_state (
  id            text primary key default 'singleton',
  requested_at  timestamptz,
  last_run_at   timestamptz,
  briefing_date date,
  updated_at    timestamptz not null default now()
);
insert into public.briefing_state (id) values ('singleton') on conflict (id) do nothing;
alter table public.briefing_state enable row level security;
