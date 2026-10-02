-- Claudia — migration v5
-- Add 'will' (Will Haskell) as an allowed call lead. The lead CHECK constraint on
-- public.calls was created inline by migration_v4, so it needs to be widened to
-- accept 'will'. The DO block finds that check constraint by its definition (so it
-- works regardless of the auto-generated name), drops it, then re-adds it with
-- 'will' included. Run once in the Supabase SQL editor. Safe to re-run.

do $$
declare c text;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'public.calls'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%lead%';
  if c is not null then
    execute format('alter table public.calls drop constraint %I', c);
  end if;
end $$;

alter table public.calls
  add constraint calls_lead_check
  check (lead is null or lead in ('shayan','adriana','sarina','will','team','other'));
