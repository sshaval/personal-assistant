-- Personal Assistant — seed data
-- Run this AFTER schema.sql in the Supabase SQL editor.
-- Safe to re-run: tasks only seed when the table is empty; the briefing upserts.

-- Today's action items (only if no tasks exist yet) -----------------------
insert into public.tasks (title, priority, due_date, source, tag)
select v.title, v.priority, v.due_date, v.source, v.tag
from (values
  ('Finalize & send Volie IOI — review Adriana''s 2026-anchored model', 'high',   date '2026-06-02', 'call',     'Volie'),
  ('Review Placecube IOI v1 from Sarina',                               'high',   null::date,        'email',    'Placecube'),
  ('Approve K4 IOI final PDF before distribution',                      'high',   null::date,        'call',     'K4'),
  ('Sign off on 6WIND NDA when Sarina sends it',                        'medium', null::date,        'call',     '6WIND'),
  ('Approve PO-014964 in NetSuite',                                     'medium', null::date,        'email',    'NetSuite'),
  ('Review Sarina''s Mobility pass response before it sends',           'medium', null::date,        'teams',    'Mobility'),
  ('Decide kill/continue on Nets + clarify Motive (core DMS vs add-on)','medium', null::date,        'call',     'Nets/Motive'),
  ('Resolve 1:30 PM calendar conflict (Project Fortify vs. Adriana huddle)','high', date '2026-06-02','calendar', null)
) as v(title, priority, due_date, source, tag)
where not exists (select 1 from public.tasks);

-- Tuesday June 2 briefing (upsert one per day) ----------------------------
insert into public.briefings (briefing_date, content)
values (date '2026-06-02', $briefing$# 🗞️ Daily Briefing — prep for Tuesday, June 2, 2026

## 🔴 Top priority
- **Volie IOI is due tomorrow** (all-day deadline on Jun 2). From tonight's model review: Adriana is updating the model to 2026-anchored projections; target structure is **$90–100M EV** (60–70% guaranteed, 3-yr earnout at 3.6x ARR). You'll want the final model + IOI in front of you first thing.

## 📅 Tomorrow's schedule (Tue Jun 2, all times EDT)
- **10:30** – Daily Catch Up (Fazal / Nedfox portfolio)
- **11:00** – Bi-Weekly New Heights Investment Partners (Michael Assi)
- **1:00** – Solomon Partners connect — *Project Momentum*
- ⚠️ **1:30 conflict** – *Project Fortify | Manos* (BMO) **and** Adriana ⟷ Shayan huddle are booked at the same time
- **3:00** – Will ⟷ Ray

## 📞 Recent calls — quick recap
- **6WIND** (Fri) — French cloud-networking, NVIDIA partnership, >€10M recurring, zero churn. Acquisition intent confirmed. *Open:* Sarina sending NDA → your sign-off.
- **K4 IOI Review** (Mon) — moved to 12-month model; targets $11M / $17M for 2027; close by ~Oct 1. *Open:* Adriana to send final PDF → your review before it goes out.
- **New Heights Weekly M&A** (Mon) — May volume strong but response rates dropped; tightening filters to 15–20 employees / $2M rev, excluding hardware/non-VMS; A/B testing subject lines.
- **Volie Model Review** (Mon) — see top priority. Also passed on **Tahi** and **Local Smart**; **Nets** and **Motive** need more review (Motive: confirm if it's a core DMS or an add-on).

## ✉️ Email follow-ups (today)
- **Placecube IOI v1** — Sarina sent it for your review (attachment, still unread).
- **PO-014964 (NetSuite)** — awaiting your approval; Alex Li confirmed it's Dennis Tucker's salary cost allocated to your group.

## 💬 Teams follow-ups (today)
- **Mobility** — you decided to pass (closing gap too high); Sarina is writing the response → review before it sends.
- **Broker tool (Shehryar)** — he's rebuilding the brokers page off the NHCRM Supabase data and asked whether the IB relationship/firms pages are still needed. You answered most; confirm nothing's outstanding.
- **Will Haskell** — thinking tonight on ideas to drive outreach further; expect a follow-up from him.

## ✅ Suggested to-do list
- [ ] **Finalize & send Volie IOI** (due tomorrow) — review Adriana's 2026-anchored model
- [ ] Review **Placecube IOI v1** from Sarina
- [ ] Approve/decide **K4 IOI** final PDF before distribution
- [ ] Sign off on **6WIND NDA** when Sarina sends it
- [ ] Approve **PO-014964** in NetSuite
- [ ] Review Sarina's **Mobility** pass response before it goes out
- [ ] Decide kill/continue on **Nets** + clarify **Motive** (core DMS vs add-on)
- [ ] Resolve the **1:30 PM calendar conflict** (Project Fortify vs. Adriana huddle)

---

_Everything above is read-only — no email, message, or invite was touched._
$briefing$)
on conflict (briefing_date) do update set content = excluded.content;
