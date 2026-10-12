-- =============================================================================
-- Agental · 0003 · Analytics layer
-- Every dashboard number on /insights comes from one of these SQL functions,
-- so the same figures can feed Ship Fund updates, n8n reports or a notebook.
--
-- All functions are SECURITY INVOKER: they run with the caller's rights, so
-- Row Level Security still applies, and they refuse anyone who is not admin.
-- =============================================================================

create or replace function private.assert_admin()
returns void language plpgsql stable set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Admin only' using errcode = '42501';
  end if;
end $$;
grant execute on function private.assert_admin() to authenticated;

create or replace function private.category_label(c public.casting_category)
returns text language sql stable set search_path = '' as $$
  select coalesce((select label from public.casting_types where category = c), initcap(replace(c::text, '_', ' ')));
$$;
grant execute on function private.category_label(public.casting_category) to authenticated;

-- ---------------------------------------------------------------------------
-- 1. Headline KPIs with period-over-period comparison
-- ---------------------------------------------------------------------------
create or replace function public.analytics_overview(p_days int default 30)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  d      interval := make_interval(days => greatest(p_days, 1));
  t_now  timestamptz := now();
  r      jsonb;
begin
  perform private.assert_admin();

  with w as (
    select t_now - d as cur_start, t_now - 2 * d as prev_start
  ),
  visitors as (
    select count(distinct session_id) filter (where e.created_at >= w.cur_start) as cur,
           count(distinct session_id) filter (where e.created_at <  w.cur_start) as prev
    from public.events e, w where e.created_at >= w.prev_start
  ),
  leads as (
    select count(*) filter (where l.created_at >= w.cur_start) as cur,
           count(*) filter (where l.created_at <  w.cur_start) as prev
    from public.leads l, w where l.created_at >= w.prev_start
  ),
  signups as (
    select count(*) filter (where p.created_at >= w.cur_start) as cur,
           count(*) filter (where p.created_at <  w.cur_start) as prev
    from public.profiles p, w where p.created_at >= w.prev_start and p.role <> 'admin'
  ),
  activated as (
    select count(*) filter (where t.mandate_signed_at >= w.cur_start) as cur,
           count(*) filter (where t.mandate_signed_at <  w.cur_start) as prev
    from public.talents t, w where t.mandate_signed_at >= w.prev_start
  ),
  apps as (
    select count(*) filter (where a.created_at >= w.cur_start) as cur,
           count(*) filter (where a.created_at <  w.cur_start) as prev
    from public.applications a, w where a.created_at >= w.prev_start
  ),
  bookings as (
    select count(*) filter (where a.updated_at >= w.cur_start) as cur,
           count(*) filter (where a.updated_at <  w.cur_start) as prev
    from public.applications a, w where a.status = 'booked' and a.updated_at >= w.prev_start
  ),
  fb as (
    select count(*) as n,
           round(100.0 * (count(*) filter (where nps >= 9) - count(*) filter (where nps <= 6)) / nullif(count(*), 0)) as nps,
           round(100.0 * count(*) filter (where pmf = 'very') / nullif(count(*) filter (where pmf is not null), 0)) as pmf_very
    from public.feedback f, w where f.created_at >= w.cur_start
  ),
  totals as (
    select (select count(*) from public.talents) as talents,
           (select count(*) from public.talents where mandate_signed_at is not null) as represented,
           (select count(*) from public.casting_directors) as directors,
           (select count(*) from public.castings where status = 'open') as open_castings
  )
  select jsonb_build_object(
    'period_days', p_days,
    'visitors',     jsonb_build_object('current', v.cur, 'previous', v.prev),
    'leads',        jsonb_build_object('current', l.cur, 'previous', l.prev),
    'signups',      jsonb_build_object('current', s.cur, 'previous', s.prev),
    'activated',    jsonb_build_object('current', a.cur, 'previous', a.prev),
    'applications', jsonb_build_object('current', ap.cur, 'previous', ap.prev),
    'bookings',     jsonb_build_object('current', b.cur, 'previous', b.prev),
    'nps',          jsonb_build_object('score', fb.nps, 'responses', fb.n),
    'pmf_very_pct', fb.pmf_very,
    'visitor_to_signup_pct', round(100.0 * s.cur / nullif(v.cur, 0), 1),
    'signup_to_active_pct',  round(100.0 * a.cur / nullif(s.cur, 0), 1),
    'totals', to_jsonb(tt)
  ) into r
  from visitors v, leads l, signups s, activated a, apps ap, bookings b, fb, totals tt;

  return r;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Daily time series
-- ---------------------------------------------------------------------------
create or replace function public.analytics_timeseries(p_days int default 30)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare r jsonb;
begin
  perform private.assert_admin();

  with days as (
    select generate_series((current_date - (greatest(p_days, 1) - 1)), current_date, interval '1 day')::date as day
  ),
  v as (select created_at::date d, count(distinct session_id) n from public.events
        where created_at >= current_date - p_days group by 1),
  l as (select created_at::date d, count(*) n from public.leads
        where created_at >= current_date - p_days group by 1),
  s as (select created_at::date d, count(*) n from public.profiles
        where created_at >= current_date - p_days and role <> 'admin' group by 1),
  m as (select mandate_signed_at::date d, count(*) n from public.talents
        where mandate_signed_at >= current_date - p_days group by 1),
  a as (select created_at::date d, count(*) n from public.applications
        where created_at >= current_date - p_days group by 1),
  b as (select updated_at::date d, count(*) n from public.applications
        where status = 'booked' and updated_at >= current_date - p_days group by 1)
  select coalesce(jsonb_agg(jsonb_build_object(
           'day', days.day,
           'visitors', coalesce(v.n, 0), 'leads', coalesce(l.n, 0),
           'signups', coalesce(s.n, 0), 'activated', coalesce(m.n, 0),
           'applications', coalesce(a.n, 0), 'bookings', coalesce(b.n, 0)
         ) order by days.day), '[]'::jsonb)
  into r
  from days
  left join v on v.d = days.day left join l on l.d = days.day
  left join s on s.d = days.day left join m on m.d = days.day
  left join a on a.d = days.day left join b on b.d = days.day;

  return r;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Acquisition -> activation -> value funnel (talent side)
-- ---------------------------------------------------------------------------
create or replace function public.analytics_funnel(p_days int default 30)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  since timestamptz := now() - make_interval(days => greatest(p_days, 1));
  r jsonb;
begin
  perform private.assert_admin();

  with cohort as (
    select t.*,
      exists (select 1 from public.applications a where a.talent_id = t.id) as has_app,
      exists (select 1 from public.applications a where a.talent_id = t.id and a.status = 'booked') as has_booking
    from public.talents t where t.created_at >= since
  ),
  steps(ord, key, label, n) as (
    values
      (1, 'visitors', 'Visited the site',
         (select count(distinct session_id) from public.events where created_at >= since)),
      (2, 'join_started', 'Started registration',
         (select count(distinct session_id) from public.events
           where created_at >= since and name = 'signup_started')),
      (3, 'accounts', 'Created an account', (select count(*) from cohort)),
      (4, 'profile', 'Completed profile', (select count(*) from cohort where onboarding_step >= 3)),
      (5, 'media', 'Added headshot', (select count(*) from cohort where onboarding_step >= 4)),
      (6, 'mandate', 'Signed the mandate', (select count(*) from cohort where onboarding_step = 5)),
      (7, 'applied', 'First application', (select count(*) from cohort where has_app)),
      (8, 'booked', 'First booking', (select count(*) from cohort where has_booking))
  )
  select jsonb_agg(jsonb_build_object(
           'step', key, 'label', label, 'count', n,
           'pct_of_first', round(100.0 * n / nullif(first_n, 0), 1),
           'pct_of_previous', round(100.0 * n / nullif(prev_n, 0), 1)
         ) order by ord)
  into r
  from (select steps.*, first_value(n) over (order by ord) as first_n,
               lag(n) over (order by ord) as prev_n
        from steps) s;

  return r;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Channel performance: which sources bring talents who actually activate
-- ---------------------------------------------------------------------------
create or replace function public.analytics_acquisition(p_days int default 90)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  since timestamptz := now() - make_interval(days => greatest(p_days, 1));
  r jsonb;
begin
  perform private.assert_admin();

  with v as (
    select coalesce(nullif(utm_source, ''), 'direct') ch, count(distinct session_id) visitors
    from public.events where created_at >= since group by 1
  ),
  l as (
    select coalesce(nullif(utm_source, ''), 'direct') ch, count(*) leads
    from public.leads where created_at >= since group by 1
  ),
  t as (
    select coalesce(nullif(utm_source, ''), 'direct') ch,
           count(*) signups,
           count(*) filter (where mandate_signed_at is not null) activated,
           count(*) filter (where exists (select 1 from public.applications a
                                          where a.talent_id = talents.id and a.status = 'booked')) booked_talents
    from public.talents where created_at >= since group by 1
  ),
  d as (
    select coalesce(nullif(utm_source, ''), 'direct') ch, count(*) directors
    from public.casting_directors where created_at >= since group by 1
  ),
  chans as (select ch from v union select ch from l union select ch from t union select ch from d)
  select coalesce(jsonb_agg(jsonb_build_object(
           'channel', chans.ch,
           'visitors', coalesce(v.visitors, 0),
           'leads', coalesce(l.leads, 0),
           'signups', coalesce(t.signups, 0),
           'directors', coalesce(d.directors, 0),
           'activated', coalesce(t.activated, 0),
           'booked_talents', coalesce(t.booked_talents, 0),
           'visit_to_signup_pct', round(100.0 * coalesce(t.signups, 0) / nullif(v.visitors, 0), 1),
           'activation_pct', round(100.0 * coalesce(t.activated, 0) / nullif(t.signups, 0), 1)
         ) order by coalesce(t.signups, 0) desc, coalesce(v.visitors, 0) desc), '[]'::jsonb)
  into r
  from chans
  left join v on v.ch = chans.ch left join l on l.ch = chans.ch
  left join t on t.ch = chans.ch left join d on d.ch = chans.ch;

  return r;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Weekly retention cohorts (a talent is "active" in a week if they did
--    anything signed-in: page views, applications, approvals...)
-- ---------------------------------------------------------------------------
create or replace function public.analytics_cohorts(p_weeks int default 8)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare r jsonb;
begin
  perform private.assert_admin();

  with cohorts as (
    select t.id, date_trunc('week', t.created_at)::date as cohort
    from public.talents t
    where t.created_at >= date_trunc('week', now()) - make_interval(weeks => greatest(p_weeks, 1) - 1)
  ),
  activity as (
    select distinct e.user_id, date_trunc('week', e.created_at)::date as wk
    from public.events e
    where e.user_id is not null
      and e.created_at >= date_trunc('week', now()) - make_interval(weeks => greatest(p_weeks, 1) - 1)
  ),
  grid as (
    select c.cohort, k.offs,
           count(distinct c.id) as size,
           count(distinct a.user_id) as active
    from cohorts c
    cross join generate_series(0, greatest(p_weeks, 1) - 1) as k(offs)
    left join activity a on a.user_id = c.id and a.wk = c.cohort + 7 * k.offs
    where c.cohort + 7 * k.offs <= date_trunc('week', now())::date
    group by c.cohort, k.offs
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'cohort', cohort, 'size', size, 'retention', retention) order by cohort), '[]'::jsonb)
  into r
  from (
    select cohort, max(size) as size,
           jsonb_agg(round(100.0 * active / nullif(size, 0), 1) order by offs) as retention
    from grid group by cohort
  ) x;

  return r;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Marketplace balance: supply (represented talents) vs demand (castings)
-- ---------------------------------------------------------------------------
create or replace function public.analytics_supply_demand()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare r jsonb;
begin
  perform private.assert_admin();

  with cats as (select unnest(enum_range(null::public.casting_category)) as category),
  supply as (
    select c.category, count(t.id) as talents
    from cats c left join public.talents t
      on c.category = any (t.categories) and t.mandate_signed_at is not null
    group by c.category
  ),
  demand as (
    select category,
           count(*) filter (where status = 'open') as open_castings,
           count(*) filter (where created_at >= now() - interval '30 days') as castings_30d,
           avg((coalesce(pay_min, 0) + coalesce(pay_max, pay_min, 0)) / 2.0) filter (where pay_min is not null) as avg_pay
    from public.castings group by category
  ),
  apps as (
    select c.category,
           count(a.id) as applications,
           count(a.id) filter (where a.status = 'booked') as bookings,
           round(avg(a.match_score), 1) as avg_match
    from public.applications a join public.castings c on c.id = a.casting_id
    where a.created_at >= now() - interval '90 days'
    group by c.category
  ),
  leads as (
    select interest as category, count(*) as lead_interest
    from public.leads where interest is not null and created_at >= now() - interval '90 days'
    group by 1
  ),
  by_cat as (
    select cats.category,
           private.category_label(cats.category) as label,
           coalesce(s.talents, 0) as talents,
           coalesce(d.open_castings, 0) as open_castings,
           coalesce(d.castings_30d, 0) as castings_30d,
           round(coalesce(d.avg_pay, 0)) as avg_pay,
           coalesce(a.applications, 0) as applications_90d,
           coalesce(a.bookings, 0) as bookings_90d,
           a.avg_match,
           coalesce(l.lead_interest, 0) as lead_interest,
           round(coalesce(s.talents, 0)::numeric / nullif(d.open_castings, 0), 1) as talents_per_casting
    from cats
    left join supply s on s.category = cats.category
    left join demand d on d.category = cats.category
    left join apps a on a.category = cats.category
    left join leads l on l.category = cats.category
  ),
  by_city as (
    select city,
           sum(talents)::int as talents,
           sum(open_castings)::int as open_castings
    from (
      select initcap(city) as city, count(*) as talents, 0 as open_castings
      from public.talents where mandate_signed_at is not null and city is not null group by 1
      union all
      select initcap(city), 0, count(*) from public.castings where status = 'open' group by 1
    ) u group by city
    order by sum(talents) + sum(open_castings) * 10 desc
    limit 8
  )
  select jsonb_build_object(
    'categories', (select jsonb_agg(to_jsonb(b) order by b.open_castings desc, b.talents desc) from by_cat b),
    'cities', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from by_city c)
  ) into r;

  return r;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Submission pipeline + fairness of opportunity distribution
-- ---------------------------------------------------------------------------
create or replace function public.analytics_pipeline(p_days int default 90)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  since timestamptz := now() - make_interval(days => greatest(p_days, 1));
  r jsonb;
begin
  perform private.assert_admin();

  with a as (select * from public.applications where created_at >= since),
  statuses as (
    select s.status, count(a.id) as n
    from unnest(enum_range(null::public.application_status)) as s(status)
    left join a on a.status = s.status
    group by s.status
  ),
  reached as (
    select
      count(*) as total,
      count(*) filter (where approved_at is not null or status = 'declined') as responded,
      count(*) filter (where approved_at is not null) as approved,
      count(*) filter (where status in ('submitted', 'callback', 'booked', 'passed')) as submitted,
      count(*) filter (where status in ('callback', 'booked')) as callback,
      count(*) filter (where status = 'booked') as booked,
      round(avg(extract(epoch from (approved_at - created_at)) / 3600)
            filter (where approved_at > created_at + interval '1 minute'), 1) as avg_hours_to_approval,
      round(avg(match_score) filter (where status = 'booked'), 1) as avg_score_booked,
      round(avg(match_score) filter (where status = 'passed'), 1) as avg_score_passed
    from a
  ),
  per_talent as (
    select t.id, count(a.id) as n
    from public.talents t
    left join a on a.talent_id = t.id
    where t.mandate_signed_at is not null
    group by t.id
  ),
  ranked as (
    select n, row_number() over (order by n desc) as rk, count(*) over () as cnt, sum(n) over () as tot
    from per_talent
  ),
  fairness as (
    select
      round(100.0 * sum(n) filter (where rk <= greatest(1, ceil(cnt * 0.1))) / nullif(max(tot), 0), 1) as top10_share_pct,
      round(100.0 * count(*) filter (where n = 0) / nullif(count(*), 0), 1) as zero_opportunity_pct,
      -- Gini coefficient of applications per represented talent
      round((2.0 * sum(rk_asc * n) / nullif(count(*) * sum(n), 0) - (count(*) + 1.0) / nullif(count(*), 0))::numeric, 3) as gini
    from (select n, rk, cnt, tot, row_number() over (order by n asc) as rk_asc from ranked) x
  ),
  score_bands as (
    select least(width_bucket(match_score, 0, 100, 5), 5) as band,
           count(*) as n,
           count(*) filter (where status in ('callback', 'booked')) as positive
    from a where match_score is not null and status in ('submitted', 'callback', 'booked', 'passed')
    group by 1
  )
  select jsonb_build_object(
    'statuses', (select jsonb_agg(jsonb_build_object('status', status, 'count', n) order by status) from statuses),
    'conversion', (select to_jsonb(reached) from reached),
    'fairness', (select to_jsonb(fairness) from fairness),
    'score_calibration', (select coalesce(jsonb_agg(jsonb_build_object(
        'band', ((band - 1) * 20) || '-' || (band * 20),
        'submitted', n,
        'positive_pct', round(100.0 * positive / nullif(n, 0), 1)) order by band), '[]'::jsonb) from score_bands)
  ) into r;

  return r;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Voice of the customer: NPS, PMF (Sean Ellis), topics, verbatims
-- ---------------------------------------------------------------------------
create or replace function public.analytics_feedback(p_days int default 90)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  since timestamptz := now() - make_interval(days => greatest(p_days, 1));
  r jsonb;
begin
  perform private.assert_admin();

  with f as (select * from public.feedback where created_at >= since)
  select jsonb_build_object(
    'nps', (select jsonb_build_object(
              'responses', count(*),
              'promoters', count(*) filter (where nps >= 9),
              'passives', count(*) filter (where nps between 7 and 8),
              'detractors', count(*) filter (where nps <= 6),
              'score', round(100.0 * (count(*) filter (where nps >= 9) - count(*) filter (where nps <= 6)) / nullif(count(*), 0)))
            from f),
    'pmf', (select jsonb_build_object(
              'responses', count(*),
              'very', count(*) filter (where pmf = 'very'),
              'somewhat', count(*) filter (where pmf = 'somewhat'),
              'not', count(*) filter (where pmf = 'not'),
              'very_pct', round(100.0 * count(*) filter (where pmf = 'very') / nullif(count(*), 0), 1))
            from f where pmf is not null),
    'topics', (select coalesce(jsonb_agg(x order by (x ->> 'responses')::int desc), '[]'::jsonb) from (
              select jsonb_build_object(
                'topic', topic, 'responses', count(*), 'avg_nps', round(avg(nps), 1),
                'detractor_pct', round(100.0 * count(*) filter (where nps <= 6) / count(*), 1)) as x
              from f group by topic) t),
    'trend', (select coalesce(jsonb_agg(x order by x ->> 'week'), '[]'::jsonb) from (
              select jsonb_build_object(
                'week', date_trunc('week', created_at)::date,
                'responses', count(*),
                'nps', round(100.0 * (count(*) filter (where nps >= 9) - count(*) filter (where nps <= 6)) / count(*))) as x
              from f group by date_trunc('week', created_at)) t),
    'recent', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
              select jsonb_build_object('created_at', created_at, 'nps', nps, 'pmf', pmf,
                                        'topic', topic, 'comment', comment) as x
              from f where comment is not null order by created_at desc limit 8) t)
  ) into r;

  return r;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Customer validation: demand signals before revenue
-- ---------------------------------------------------------------------------
create or replace function public.analytics_validation(p_days int default 90)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  since timestamptz := now() - make_interval(days => greatest(p_days, 1));
  r jsonb;
begin
  perform private.assert_admin();

  select jsonb_build_object(
    'waitlist_weekly', (select coalesce(jsonb_agg(x order by x ->> 'week'), '[]'::jsonb) from (
        select jsonb_build_object(
          'week', date_trunc('week', created_at)::date,
          'talent', count(*) filter (where kind = 'talent'),
          'director', count(*) filter (where kind = 'director'),
          'converted', count(*) filter (where converted_at is not null)) as x
        from public.leads where created_at >= since
        group by date_trunc('week', created_at)) t),
    'lead_conversion_pct', (select round(100.0 * count(*) filter (where converted_at is not null) / nullif(count(*), 0), 1)
                            from public.leads where created_at >= since),
    'interest_by_category', (select coalesce(jsonb_agg(x order by (x ->> 'leads')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('category', interest, 'label', private.category_label(interest), 'leads', count(*)) as x
        from public.leads where created_at >= since and interest is not null group by interest) t),
    'plan_interest', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object(
          'tier', p.tier, 'name', p.name, 'price', p.monthly_price_eur,
          'clicks', (select count(*) from public.events e
                     where e.name = 'plan_interest' and e.props ->> 'tier' = p.tier::text and e.created_at >= since),
          'subscribers', (select count(*) from public.talents t where t.plan = p.tier)) as x
        from public.plans p order by p.sort_order) t),
    'director_demand', (select jsonb_build_object(
          'leads', count(*) filter (where kind = 'director'),
          'with_brief', count(*) filter (where kind = 'director' and message is not null))
        from public.leads where created_at >= since),
    'top_pages', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object('path', path, 'views', count(*), 'sessions', count(distinct session_id)) as x
        from public.events where name = 'page_view' and created_at >= since
        group by path order by count(*) desc limit 8) t),
    'devices', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object('device', coalesce(device, 'unknown'), 'sessions', count(distinct session_id)) as x
        from public.events where created_at >= since group by device) t)
  ) into r;

  return r;
end $$;

-- ---------------------------------------------------------------------------
-- 10. Onboarding: where talents get stuck, and what is missing
-- ---------------------------------------------------------------------------
create or replace function public.analytics_onboarding()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare r jsonb;
begin
  perform private.assert_admin();

  select jsonb_build_object(
    'steps', (select jsonb_agg(jsonb_build_object('step', s.step, 'label', s.label,
                'count', (select count(*) from public.talents t where t.onboarding_step = s.step)) order by s.step)
              from (values (1, 'Account only'), (2, 'Identity'), (3, 'Profile'), (4, 'Headshot'), (5, 'Mandate signed'))
                   as s(step, label)),
    'missing', (select jsonb_build_object(
                'headshot', count(*) filter (where headshot_path is null),
                'skills', count(*) filter (where cardinality(skills) = 0),
                'languages', count(*) filter (where cardinality(languages) = 0),
                'bio', count(*) filter (where bio is null),
                'categories', count(*) filter (where cardinality(categories) = 0),
                'total', count(*))
              from public.talents),
    'median_days_to_mandate', (select round((percentile_cont(0.5) within group (
                order by extract(epoch from (mandate_signed_at - created_at)) / 86400))::numeric, 1)
              from public.talents where mandate_signed_at is not null),
    'avg_completeness', (select round(avg(public.completeness(t))) from public.talents t)
  ) into r;

  return r;
end $$;

-- ---------------------------------------------------------------------------
-- 11. Product guidance: rules that turn the numbers above into next actions.
-- Deliberately transparent (no black box): each insight names its evidence.
-- ---------------------------------------------------------------------------
create or replace function public.analytics_insights()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  out_    jsonb := '[]'::jsonb;
  sd      jsonb := public.analytics_supply_demand();
  fn      jsonb := public.analytics_funnel(90);
  acq     jsonb := public.analytics_acquisition(90);
  fbk     jsonb := public.analytics_feedback(90);
  pipe    jsonb := public.analytics_pipeline(90);
  x       jsonb;
  prev    jsonb;
  worst   jsonb;
  worst_drop numeric := 0;
  best    jsonb;
  low     jsonb;
begin
  perform private.assert_admin();

  -- Supply gaps / oversupply per casting type
  for x in select * from jsonb_array_elements(sd -> 'categories') loop
    if (x ->> 'open_castings')::int >= 3 and coalesce((x ->> 'talents_per_casting')::numeric, 0) < 6 then
      out_ := out_ || jsonb_build_object(
        'severity', 'warning', 'area', 'Supply',
        'title', 'Recruit more ' || (x ->> 'label') || ' talent',
        'detail', format('Only %s represented talents for %s open castings (%s per casting). Directors may not get a full shortlist.',
                         x ->> 'talents', x ->> 'open_castings', coalesce(x ->> 'talents_per_casting', '0')),
        'action', 'Run a targeted campaign on the best-activating channel and feature this casting type on the homepage.',
        'metric', x ->> 'talents_per_casting');
    elsif (x ->> 'talents')::int >= 40 and coalesce((x ->> 'talents_per_casting')::numeric, 999) > 40 then
      out_ := out_ || jsonb_build_object(
        'severity', 'opportunity', 'area', 'Demand',
        'title', 'Bring more ' || (x ->> 'label') || ' castings',
        'detail', format('%s represented talents but only %s open castings. Talents in this type risk churning without opportunities.',
                         x ->> 'talents', x ->> 'open_castings'),
        'action', 'Prioritise casting-director outreach for this type; offer free shortlists to student and indie productions.',
        'metric', x ->> 'talents_per_casting');
    end if;
  end loop;

  -- Biggest onboarding drop (from "accounts" onwards)
  for x in select * from jsonb_array_elements(fn) loop
    if prev is not null and (prev ->> 'step') in ('accounts', 'profile', 'media', 'mandate')
       and (prev ->> 'count')::int >= 10 then
      if 100 - coalesce((x ->> 'pct_of_previous')::numeric, 100) > worst_drop then
        worst_drop := 100 - coalesce((x ->> 'pct_of_previous')::numeric, 100);
        worst := jsonb_build_object('from', prev ->> 'label', 'to', x ->> 'label');
      end if;
    end if;
    prev := x;
  end loop;
  if worst is not null and worst_drop >= 15 then
    out_ := out_ || jsonb_build_object(
      'severity', 'warning', 'area', 'Onboarding',
      'title', format('%s%% drop between "%s" and "%s"', round(worst_drop), worst ->> 'from', worst ->> 'to'),
      'detail', 'This is the largest leak in the talent funnel over the last 90 days.',
      'action', case worst ->> 'to'
        when 'Added headshot' then 'Let talents skip the headshot and add it later from a phone; send a reminder email after 24h.'
        when 'Signed the mandate' then 'Explain the mandate in plain words (free, cancellable) right on the step; add an FAQ link.'
        when 'Completed profile' then 'Shorten the profile step: ask only category + city first, the rest later.'
        else 'Interview 5 talents who stopped here this week.' end,
      'metric', round(worst_drop));
  end if;

  -- Best and weakest channel by activation (min 15 sign-ups)
  select c.value into best from jsonb_array_elements(acq) c
   where (c.value ->> 'signups')::int >= 15 order by (c.value ->> 'activation_pct')::numeric desc nulls last limit 1;
  select c.value into low from jsonb_array_elements(acq) c
   where (c.value ->> 'signups')::int >= 15 order by (c.value ->> 'activation_pct')::numeric asc nulls last limit 1;
  if best is not null and low is not null and best ->> 'channel' <> low ->> 'channel' then
    out_ := out_ || jsonb_build_object(
      'severity', 'opportunity', 'area', 'Acquisition',
      'title', format('"%s" activates %s%% of sign-ups vs %s%% for "%s"',
                      best ->> 'channel', best ->> 'activation_pct', low ->> 'activation_pct', low ->> 'channel'),
      'detail', 'Activation (signed mandate) matters more than raw sign-ups: only represented talents can be proposed.',
      'action', format('Shift effort toward "%s"; review the landing message used for "%s".', best ->> 'channel', low ->> 'channel'),
      'metric', best ->> 'activation_pct');
  end if;

  -- Weakest feedback topic
  select t.value into x from jsonb_array_elements(fbk -> 'topics') t
   where (t.value ->> 'responses')::int >= 5 order by (t.value ->> 'avg_nps')::numeric asc limit 1;
  if x is not null and (x ->> 'avg_nps')::numeric < 7 then
    out_ := out_ || jsonb_build_object(
      'severity', 'warning', 'area', 'Product',
      'title', format('Feedback on "%s" is the weakest (avg %s/10)', replace(x ->> 'topic', '_', ' '), x ->> 'avg_nps'),
      'detail', format('%s responses, %s%% detractors. Read the verbatims in the Feedback tab.', x ->> 'responses', x ->> 'detractor_pct'),
      'action', 'Make this the next sprint''s improvement theme and re-measure in 4 weeks.',
      'metric', x ->> 'avg_nps');
  end if;

  -- Product-market fit (Sean Ellis 40% benchmark)
  if coalesce((fbk -> 'pmf' ->> 'responses')::int, 0) >= 20 then
    out_ := out_ || jsonb_build_object(
      'severity', case when (fbk -> 'pmf' ->> 'very_pct')::numeric >= 40 then 'info' else 'warning' end,
      'area', 'Validation',
      'title', format('%s%% would be "very disappointed" without Agental', fbk -> 'pmf' ->> 'very_pct'),
      'detail', 'The Sean Ellis test treats 40% as a signal of product-market fit (a heuristic, not a law).',
      'action', case when (fbk -> 'pmf' ->> 'very_pct')::numeric >= 40
        then 'Find what the "very disappointed" group has in common and market to look-alikes.'
        else 'Ask the "somewhat disappointed" group what would make Agental indispensable.' end,
      'metric', fbk -> 'pmf' ->> 'very_pct');
  end if;

  -- Talent response time
  if coalesce((pipe -> 'conversion' ->> 'avg_hours_to_approval')::numeric, 0) > 24 then
    out_ := out_ || jsonb_build_object(
      'severity', 'warning', 'area', 'Operations',
      'title', format('Talents take %sh on average to approve a proposal', pipe -> 'conversion' ->> 'avg_hours_to_approval'),
      'detail', 'Slow approvals mean missed casting deadlines.',
      'action', 'Add SMS/push reminders at 6h and 18h; show the deadline in the notification.',
      'metric', pipe -> 'conversion' ->> 'avg_hours_to_approval');
  end if;

  -- Opportunity distribution
  if coalesce((pipe -> 'fairness' ->> 'zero_opportunity_pct')::numeric, 0) > 30 then
    out_ := out_ || jsonb_build_object(
      'severity', 'warning', 'area', 'Distribution',
      'title', format('%s%% of represented talents got no opportunity in 90 days', pipe -> 'fairness' ->> 'zero_opportunity_pct'),
      'detail', format('Top 10%% of talents receive %s%% of all applications (Gini %s).',
                       pipe -> 'fairness' ->> 'top10_share_pct', pipe -> 'fairness' ->> 'gini'),
      'action', 'Add an exposure boost for talents with no proposal in 30 days, and run the quarterly fairness check.',
      'metric', pipe -> 'fairness' ->> 'zero_opportunity_pct');
  end if;

  -- Match score calibration
  if coalesce((pipe -> 'conversion' ->> 'avg_score_booked')::numeric, 0) > 0
     and (pipe -> 'conversion' ->> 'avg_score_booked')::numeric - coalesce((pipe -> 'conversion' ->> 'avg_score_passed')::numeric, 0) >= 5 then
    out_ := out_ || jsonb_build_object(
      'severity', 'info', 'area', 'Matching',
      'title', 'Match score predicts outcomes',
      'detail', format('Booked talents averaged %s vs %s for passed ones.',
                       pipe -> 'conversion' ->> 'avg_score_booked', pipe -> 'conversion' ->> 'avg_score_passed'),
      'action', 'Keep the score as the default sort; use it to cap low-score proposals and save talents'' time.',
      'metric', pipe -> 'conversion' ->> 'avg_score_booked');
  end if;

  return out_;
end $$;

-- ---------------------------------------------------------------------------
-- Execution rights: signed-in only (the functions themselves check for admin)
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'analytics_overview(int)', 'analytics_timeseries(int)', 'analytics_funnel(int)',
    'analytics_acquisition(int)', 'analytics_cohorts(int)', 'analytics_supply_demand()',
    'analytics_pipeline(int)', 'analytics_feedback(int)', 'analytics_validation(int)',
    'analytics_onboarding()', 'analytics_insights()']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
