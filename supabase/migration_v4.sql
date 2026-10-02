-- Claudia — migration v4
-- The Calls tab: per-day "call reports" built from Granola meeting notes.
-- Claudia (Claude Code) reads the Granola folders READ-ONLY, summarizes each
-- call, tiers the deal calls (Hot/Warm/Cold), and writes them here; the web app
-- only displays. Run this once in the Supabase SQL editor (after schema.sql +
-- migration_v2.sql + migration_v3.sql). Safe to re-run.

-- 1) Calls (one row per Granola meeting in a day's report) -------------------
-- folder maps the Granola space to a bucket:
--   internal     = "_Internal"      (portfolio management; not tiered)
--   live_opps    = "0. Live Opps"   (active opps; not tiered)
--   direct       = "1. Direct"      (targets we're considering buying; tiered)
--   brokered     = "2. Brokered"    (advisors/intermediaries; tiered)
--   divestitures = "3. Divestitures"(carve-outs; tiered)
-- lead = the Granola note creator (who ran the call): shayan | adriana | sarina,
--        else 'team' (mixed/all of us) or 'other'.
-- tier = Hot/Warm/Cold fit rating for the deal folders; null for internal/live_opps.
create table if not exists public.calls (
  id             uuid primary key default gen_random_uuid(),
  call_date      date not null,
  granola_id     text,            -- Granola meeting UUID (for dedupe / re-link)
  folder         text not null
    check (folder in ('internal','live_opps','direct','brokered','divestitures')),
  title          text not null,
  company        text,            -- the counterparty business, when identifiable
  lead           text
    check (lead is null or lead in ('shayan','adriana','sarina','team','other')),
  attendees      text,            -- comma-separated display string
  summary        text,            -- a few sentences: what the call was about
  tier           text
    check (tier is null or tier in ('hot','warm','cold')),
  tier_rationale text,            -- one line: why this tier (fit vs. our criteria)
  start_time     text,            -- display string, e.g. '10:30 AM'
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists calls_date_idx on public.calls (call_date);
create index if not exists calls_granola_idx on public.calls (granola_id);

alter table public.calls enable row level security;

-- 2) Call report state (the "Create / Re-generate Report" button) -----------
-- Shared signal between the web app and Claudia's call-report watcher:
--   • the button sets requested_at = now() for a date;
--   • Claudia pulls that day's Granola calls, writes the `calls` rows, then sets
--     generated_at = now() and call_count.
-- A date has a PENDING request when requested_at > generated_at (or never generated).
create table if not exists public.call_reports (
  report_date  date primary key,
  requested_at timestamptz,       -- set by the button; fulfilled when generated_at is newer
  generated_at timestamptz,       -- last time Claudia built this date's report
  note         text,              -- optional one-line note from the last run
  call_count   int not null default 0,
  updated_at   timestamptz not null default now()
);

alter table public.call_reports enable row level security;
