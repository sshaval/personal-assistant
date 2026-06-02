-- Claudia — Day's View meetings seed
-- Run AFTER migration_v2.sql (needs the public.meetings table).
-- Safe to re-run: clears Jun 2 + Jun 3 first, then re-inserts (refreshes prep).
-- Source: live Outlook calendar (Jun 2 & 3, 2026) + email/Granola context.
-- Times shown are America/Toronto (EDT, UTC-4). Read-only synthesis — nothing was sent.

begin;

delete from public.meetings
 where meeting_date in (date '2026-06-02', date '2026-06-03');

-- ===== TODAY — Tuesday, June 2, 2026 =====================================
insert into public.meetings
  (meeting_date, start_time, end_time, sort_order, title, category, attendees, summary, prep)
values
( date '2026-06-02', 'All day', null, 0,
  'Volie — IOI Deadline', 'pipeline',
  'Sarina Gill, Adriana Salazar',
  $md$Final day to send the Volie IOI — review Adriana's 2026-anchored model first.$md$,
  $md$- Target structure: **$90–100M EV**, ~60–70% guaranteed, 3-yr earnout at ~3.6x ARR.
- Adriana re-anchored the model to **2026 projections** — review before it goes out.
- From Monday's model review: passed on **Tahi** and **Local Smart**; **Nets / Motive** still need a read (is Motive a core DMS or an add-on?).
- **Action:** finalize & send today.$md$ ),

( date '2026-06-02', '10:30 AM', '11:00 AM', 1,
  'Daily Catch Up', 'portfolio',
  'Fazal Khaishgi, Maite Carrero (Aspire); Vroom, Fidder (Nedfox)',
  $md$Fazal's daily Nedfox working session — stay coordinated on the week's priorities.$md$,
  $md$- Open Nedfox threads: **legal hearing**, **billing collected**, **payment-vendor selection**, **price-increase pushback**, **CS automation**.
- Daily cadence Fazal set up last week to keep momentum — quick status + unblock.$md$ ),

( date '2026-06-02', '1:00 PM', '1:30 PM', 2,
  'Solomon Partners Connect — Project Momentum', 'pipeline',
  'Solange Velazquez, Craig Muir, Christopher Canet (Solomon Partners); Sarina Gill, Adriana Salazar',
  $md$Intro call with Solomon Partners' banking team on Project Momentum (sell-side).$md$,
  $md$- Banker-led **connect** — expect an asset overview, process stage, and timeline.
- **Zoom** (not Teams). Sarina + Adriana on with you.
- Goal: understand the opportunity and next steps — no commitments today.$md$ ),

( date '2026-06-02', '1:30 PM', '2:00 PM', 3,
  'Project Fortify | Manos', 'pipeline',
  'Blake Musburger + deal team (BMO); Sarina Gill, Adriana Salazar',
  $md$BMO-run process (Project Fortify / "Manos") — banker discussion.$md$,
  $md$- Continues the **BMO / Blake Musburger** CIP thread (active through Jun 1).
- **Teams.** Sarina + Adriana with you.
- Note: earlier flagged as a 1:30 clash with the Adriana huddle — the huddle moved to 2:00, so these are now **back-to-back**.$md$ ),

( date '2026-06-02', '2:00 PM', '2:30 PM', 4,
  'Adriana <> Shayan — Huddle', 'internal',
  'Adriana Salazar',
  $md$Internal deal-team huddle — pipeline + model coordination.$md$,
  $md$- Likely: **Volie IOI** status and follow-ups from the Momentum / Fortify calls.
- Good slot to align on what actually went out today.$md$ ),

( date '2026-06-02', '3:00 PM', '3:45 PM', 5,
  'Will <> Ray', 'internal',
  'Will Haskell, Ray Mohsenin',
  $md$Origination / outreach sync with Will & Ray.$md$,
  $md$- From Monday's New Heights weekly: volume strong but **response rates dropped**; filters tightening to **15–20 employees / $2M rev**, excluding hardware / non-VMS; A/B testing subject lines.
- Will flagged he's thinking on ideas to push outreach further — expect proposals.$md$ );

-- ===== TOMORROW — Wednesday, June 3, 2026 ================================
insert into public.meetings
  (meeting_date, start_time, end_time, sort_order, title, category, attendees, summary, prep)
values
( date '2026-06-03', '10:30 AM', '11:00 AM', 0,
  'Daily Catch Up', 'portfolio',
  'Fazal Khaishgi, Maite Carrero (Aspire); Vroom, Fidder (Nedfox)',
  $md$Fazal's daily Nedfox working session (recurring).$md$,
  $md$- Carry over anything still open from Tuesday's catch-up.
- Same Nedfox watch-list: legal hearing, billing, payment-vendor pick, price-increase pushback, CS automation.$md$ ),

( date '2026-06-03', '11:00 AM', '11:30 AM', 1,
  'Softland x Valsoft', 'pipeline',
  'O. Saez, A. Ramirez (Softland); Adriana Salazar',
  $md$Management call with Softland (LatAm ERP) — reactivated process.$md$,
  $md$- LatAm ERP, **~$25M ARR**; seller asking **~$90M**; our shape ~**$65M + $10M + earnouts (~$100M all-in)**.
- Process went **on-hold then reactivated**; Adriana coordinated this additional management call.
- Calls run in **Spanish** — Adriana leading.
- ⚠️ **Overlaps with the Krista monthly** (same 11:00 slot) — decide which to take / reschedule.$md$ ),

( date '2026-06-03', '11:00 AM', '11:30 AM', 2,
  'Krista : Shayan — Monthly', 'internal',
  'Krista Cemerka (Aspire People)',
  $md$Monthly People / HR sync — M&A people support.$md$,
  $md$- Agenda: upcoming M&A & business-context changes; current People topics in the pod (integration, risks/plans); open questions.
- ⚠️ **Conflicts with Softland** at 11:00 — Softland is external & time-sensitive, so this likely moves.$md$ ),

( date '2026-06-03', '11:30 AM', '12:00 PM', 3,
  'Project Rise', 'pipeline',
  'Chris (Barnsgate Solutions); Sarina Gill, Adriana Salazar',
  $md$Advisor call on Project Rise (Barnsgate-run).$md$,
  $md$- **Barnsgate Solutions** (Chris) advising; thread was very active into Jun 2.
- **Teams.** Sarina + Adriana with you.
- Goal: confirm the next diligence / process steps.$md$ ),

( date '2026-06-03', '1:00 PM', '1:30 PM', 4,
  'Paine Pacific / Valsoft', 'pipeline',
  'Daniel Madhavan, Nels (Paine Pacific); Sarina Gill',
  $md$Early-stage intro on an HR/HCM SaaS opportunity (Paine Pacific).$md$,
  $md$- **NDA signed May 29**; still early-stage.
- **Zoom.** Daniel Madhavan hosting; Nels + Sarina on.
- Goal: understand the asset and whether it fits the VMS thesis.$md$ ),

( date '2026-06-03', '1:30 PM', '2:00 PM', 5,
  'Fazal <> Shayan — Huddle', 'internal',
  'Fazal Khaishgi',
  $md$1:1 with Fazal — portfolio / Nedfox coordination.$md$,
  $md$- Roll up the day's Nedfox items; align on portfolio priorities and anything needing your sign-off.$md$ ),

( date '2026-06-03', '2:00 PM', '2:30 PM', 6,
  'Sarina <> Shayan — Huddle', 'internal',
  'Sarina Gill',
  $md$1:1 with Sarina — pipeline coordination.$md$,
  $md$- Likely agenda: **Placecube IOI v1**, **6WIND NDA**, the **Mobility** pass response, and Rise / Fortify / Momentum follow-ups.$md$ );

commit;
