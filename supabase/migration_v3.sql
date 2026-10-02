-- Claudia — migration v3
-- Tasks get a first-class Company field + a recurrence day (which weekday a
-- weekly task repeats on, or which day-of-month a monthly task repeats on).
-- Run this once in the Supabase SQL editor (after schema.sql + migration_v2.sql).
-- Safe to re-run.

-- 1) New columns -----------------------------------------------------------
alter table public.tasks
  add column if not exists company text;

-- recurrence_day meaning depends on recurrence:
--   weekly  -> 0..6  (0 = Sunday … 6 = Saturday, matching JS getUTCDay())
--   monthly -> 1..31 (day of the month; clamped to the month's length)
--   daily / none -> null
alter table public.tasks
  add column if not exists recurrence_day int
    check (recurrence_day is null or recurrence_day between 0 and 31);

-- 2) Backfill --------------------------------------------------------------
-- The old `tag` column was used for deal / company names (Volie, Placecube,
-- K4, 6WIND…). Promote those into the new Company field so nothing is lost.
update public.tasks
  set company = tag
  where company is null and tag is not null and btrim(tag) <> '';

create index if not exists tasks_company_idx on public.tasks (company);
