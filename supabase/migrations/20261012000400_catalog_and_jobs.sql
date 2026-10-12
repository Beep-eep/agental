-- =============================================================================
-- Agental · 0004 · Reference catalog + scheduled jobs (pg_cron)
-- =============================================================================

-- Plans mirror the public site (agental.co/en/talents/tarifs, Oct 2026).
-- NOTE: charging represented talents a subscription is legally sensitive in
-- California (Labor Code §1700.40 / §1702). Keep paid tiers switched off in
-- production until counsel signs off: `update plans set is_active = false ...`
insert into public.plans (tier, name, tagline, monthly_price_eur, commission_pct, features, sort_order) values
  ('free',     'Free',     'Real representation, free forever', 0,  10,
   array['Signed representation mandate', 'AI casting watch 24/7', 'Talent approves every submission', 'Basic self-tape guide'], 1),
  ('pro',      'Pro',      'More tools for active talents',     19, 10,
   array['Everything in Free', 'Self-tape Studio feedback', 'Priority matching notifications', 'Profile insights'], 2),
  ('premium',  'Premium',  'Keep more of every fee',            49, 7.5,
   array['Everything in Pro', 'Commission drops to 7.5%', 'Vocal & accent coaching sessions', 'Monthly profile review'], 3),
  ('ultimate', 'Ultimate', 'For working professionals',         79, 5,
   array['Everything in Premium', 'Commission drops to 5%', 'Dedicated agent check-ins', 'Early access to new castings'], 4)
on conflict (tier) do nothing;

-- Casting worlds mirror agental.co/en/castings ("Children & teens" left out: V1 is adults-only).
insert into public.casting_types (category, slug, label, summary, description, pay_min, pay_max, pay_unit, sort_order) values
  ('background', 'background-acting', 'Background acting', 'The way into film and television. No experience required.',
   'Crowd scenes, passers-by, audiences. Reliable, flexible days that build set experience and credits.', 80, 180, 'day', 1),
  ('walk_on', 'walk-on', 'Walk-on', 'A step up from background: one gesture, one presence that registers.',
   'Featured moments without lines: the waiter who hands over the note, the stranger who turns around.', 100, 250, 'day', 2),
  ('supporting', 'supporting-roles', 'Supporting roles', 'Lines, a character, series and feature films.',
   'Speaking roles in series, features and shorts. Self-tapes are usually required.', 350, 800, 'day', 3),
  ('commercial', 'commercials', 'Commercials', 'The best-paid shoots, open to every profile.',
   'TV, online and social ads. Real, varied people are in demand: your look is an asset.', 800, 3000, 'day', 4),
  ('photo', 'photo', 'Photo', 'Campaigns, catalogues, editorial: your image, put to work.',
   'Lifestyle, e-commerce and editorial shoots for brands of every size.', 200, 600, 'day', 5),
  ('voice', 'voice-dubbing', 'Voice & dubbing', 'Your voice is enough: ads, dubbing, narration, e-learning.',
   'Remote-friendly sessions. Accents and languages are a strength here.', 200, 800, 'session', 6),
  ('creator', 'content-creators', 'Content creators', 'Your audience and your ease on camera are casting assets.',
   'Brand collaborations and UGC-style productions that want natural on-camera talent.', null, null, 'project', 7),
  ('performer', 'performers-stage', 'Performers & stage', 'Dance, music, magic, circus, hosting, stunt work: your discipline is a role.',
   'Specialty skills for film, events, music videos and live shows.', null, null, 'project', 8)
on conflict (category) do nothing;

-- ---------------------------------------------------------------------------
-- Jobs
-- ---------------------------------------------------------------------------
create or replace function private.close_expired_castings()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.castings set status = 'closed'
   where status = 'open' and deadline < current_date;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function private.snapshot_kpis()
returns void language sql security definer set search_path = '' as $$
  insert into public.kpi_snapshots (day, talents_total, talents_active, directors_total, castings_open, applications_open)
  select current_date,
         (select count(*) from public.talents),
         (select count(*) from public.talents where mandate_signed_at is not null),
         (select count(*) from public.casting_directors),
         (select count(*) from public.castings where status = 'open'),
         (select count(*) from public.applications where status in ('proposed', 'awaiting_talent', 'approved', 'queued', 'submitted', 'callback'))
  on conflict (day) do update set
    talents_total = excluded.talents_total, talents_active = excluded.talents_active,
    directors_total = excluded.directors_total, castings_open = excluded.castings_open,
    applications_open = excluded.applications_open, created_at = now();
$$;

revoke all on function private.close_expired_castings() from public, anon, authenticated;
revoke all on function private.snapshot_kpis() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

select cron.schedule('agental-close-expired-castings', '5 7 * * *', 'select private.close_expired_castings()');
select cron.schedule('agental-snapshot-kpis', '55 6 * * *', 'select private.snapshot_kpis()');
