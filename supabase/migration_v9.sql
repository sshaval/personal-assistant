-- Claudia — migration v9
-- Per-user task authorship. Until now a task only recorded created_by = 'user' |
-- 'claudia' (a human vs. Claudia), not WHICH human. Now that more than one person
-- signs in, record the author's email so each person's tasks can show their own
-- avatar. Nullable + free-form; existing tasks stay null (they render as the
-- legacy 😈 "you" badge). Run once in the Supabase SQL editor. Safe to re-run.

alter table public.tasks
  add column if not exists created_by_email text;
