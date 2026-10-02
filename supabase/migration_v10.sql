-- Claudia — migration v10
-- Per-user tab access. Admins choose which app tabs each user can see + open
-- (Summary, Day's View, Tasks). Admins always have access to everything, so this
-- only constrains non-admin users. Stored as a text[] of tab keys on the profile.
-- Run once in the Supabase SQL editor. Safe to re-run.

alter table public.profiles
  add column if not exists allowed_tabs text[]
    not null default array['summary','day','tasks']::text[];
