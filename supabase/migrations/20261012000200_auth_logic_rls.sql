-- =============================================================================
-- Agental · 0002 · Auth hooks, business rules, matching, Row Level Security
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Role helpers (in the private schema: not reachable through the REST API)
-- ---------------------------------------------------------------------------
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

create or replace function private.owns_casting(p_casting_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.castings c
    where c.id = p_casting_id and c.director_id = (select auth.uid())
  );
$$;

grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.owns_casting(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- New user -> profile (+ talent or director row, consents, lead conversion)
-- Everything collected by the multi-step registration form arrives in
-- raw_user_meta_data, so sign-up works with or without email confirmation.
-- ---------------------------------------------------------------------------
create or replace function private.json_text_array(j jsonb)
returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array(
    select left(trim(x), 60) from jsonb_array_elements_text(
      case when jsonb_typeof(j) = 'array' then j else '[]'::jsonb end) x
    where trim(x) <> ''
    limit 20
  ), '{}');
$$;

create or replace function private.json_category_array(j jsonb)
returns public.casting_category[] language sql stable set search_path = '' as $$
  select coalesce(array(
    select distinct x::public.casting_category
    from jsonb_array_elements_text(
      case when jsonb_typeof(j) = 'array' then j else '[]'::jsonb end) x
    where x = any (enum_range(null::public.casting_category)::text[])
  ), '{}');
$$;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role      public.user_role;
  v_created   timestamptz := coalesce(new.created_at, now());
  v_birth     date;
  v_mandate   boolean;
  v_step      smallint;
  c           jsonb;
begin
  -- Role: never trust the client for "admin".
  if exists (select 1 from public.admin_allowlist a where a.email = lower(new.email)) then
    v_role := 'admin';
  elsif meta ->> 'role' = 'director' then
    v_role := 'director';
  else
    v_role := 'talent';
  end if;

  insert into public.profiles (id, role, full_name, email, created_at)
  values (new.id, v_role, left(coalesce(meta ->> 'full_name', ''), 120), lower(new.email), v_created);

  -- Consent ledger (append-only).
  for c in select * from jsonb_array_elements(
             case when jsonb_typeof(meta -> 'consents') = 'array' then meta -> 'consents' else '[]'::jsonb end)
  loop
    if c ->> 'kind' = any (enum_range(null::public.consent_kind)::text[]) then
      insert into public.consents (profile_id, kind, version, granted, created_at)
      values (new.id, (c ->> 'kind')::public.consent_kind,
              left(coalesce(c ->> 'version', 'v1'), 20),
              coalesce((c ->> 'granted')::boolean, true), v_created);
    end if;
  end loop;

  v_mandate := exists (
    select 1 from public.consents
    where profile_id = new.id and kind = 'representation_mandate' and granted
  );

  if v_role = 'talent' then
    begin
      v_birth := nullif(meta ->> 'birth_date', '')::date;
    exception when others then
      v_birth := null;
    end;

    v_step := case
      when v_mandate then 5
      when meta ->> 'headshot_path' is not null then 4
      when jsonb_array_length(coalesce(meta -> 'categories', '[]'::jsonb)) > 0 then 3
      when v_birth is not null or meta ->> 'city' is not null then 2
      else 1 end;

    insert into public.talents (
      id, stage_name, birth_date, gender, city, country, languages, categories,
      excluded_categories, skills, height_cm, union_status, availability, bio,
      headshot_path, plan, onboarding_step, mandate_signed_at,
      utm_source, utm_medium, utm_campaign, referrer, landing_path, created_at, updated_at)
    values (
      new.id,
      nullif(left(meta ->> 'stage_name', 80), ''),
      v_birth,
      case when meta ->> 'gender' in ('female', 'male', 'non_binary', 'prefer_not_say') then meta ->> 'gender' end,
      nullif(left(meta ->> 'city', 80), ''),
      coalesce(nullif(upper(left(meta ->> 'country', 2)), ''), 'US'),
      private.json_text_array(meta -> 'languages'),
      private.json_category_array(meta -> 'categories'),
      private.json_category_array(meta -> 'excluded_categories'),
      private.json_text_array(meta -> 'skills'),
      case when (meta ->> 'height_cm') ~ '^\d{2,3}$' and (meta ->> 'height_cm')::int between 90 and 250
           then (meta ->> 'height_cm')::int end,
      case when meta ->> 'union_status' in ('non_union', 'sag_aftra_eligible', 'sag_aftra')
           then meta ->> 'union_status' else 'non_union' end,
      case when meta ->> 'availability' in ('full_time', 'weekends', 'evenings', 'flexible')
           then meta ->> 'availability' else 'flexible' end,
      nullif(left(meta ->> 'bio', 1000), ''),
      nullif(meta ->> 'headshot_path', ''),
      case when meta ->> 'plan' in ('free', 'pro', 'premium', 'ultimate')
           then (meta ->> 'plan')::public.plan_tier else 'free' end,
      v_step,
      case when v_mandate then v_created end,
      left(meta ->> 'utm_source', 80), left(meta ->> 'utm_medium', 80),
      left(meta ->> 'utm_campaign', 120), left(meta ->> 'referrer', 500),
      left(meta ->> 'landing_path', 300), v_created, v_created);

  elsif v_role = 'director' then
    insert into public.casting_directors (id, company, job_title, city, website,
                                          utm_source, utm_medium, utm_campaign, created_at)
    values (new.id,
            left(coalesce(meta ->> 'company', ''), 120),
            nullif(left(meta ->> 'job_title', 80), ''),
            nullif(left(meta ->> 'city', 80), ''),
            case when meta ->> 'website' ~* '^https?://' then left(meta ->> 'website', 300) end,
            left(meta ->> 'utm_source', 80), left(meta ->> 'utm_medium', 80),
            left(meta ->> 'utm_campaign', 120), v_created);
  end if;

  -- Close the acquisition loop: lead -> account.
  update public.leads l
     set converted_at = v_created, profile_id = new.id
   where l.email = lower(new.email) and l.converted_at is null;

  -- Funnel event, stitched to the anonymous browser session.
  if meta ? 'session_id' then
    insert into public.events (session_id, user_id, name, path, utm_source, utm_medium, utm_campaign, created_at)
    values (left(meta ->> 'session_id', 64), new.id, 'sign_up', '/join',
            left(meta ->> 'utm_source', 80), left(meta ->> 'utm_medium', 80),
            left(meta ->> 'utm_campaign', 120), v_created);
  end if;

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Keep onboarding_step / mandate in sync when a talent edits their profile
-- or grants a new consent later.
create or replace function private.talent_progress()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.onboarding_step := greatest(new.onboarding_step, case
    when new.mandate_signed_at is not null then 5
    when new.headshot_path is not null then 4
    when cardinality(new.categories) > 0 then 3
    when new.birth_date is not null or new.city is not null then 2
    else 1 end);
  return new;
end $$;

create trigger talents_progress before insert or update on public.talents
  for each row execute function private.talent_progress();

create or replace function private.consent_to_talent()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'representation_mandate' then
    update public.talents
       set mandate_signed_at = case when new.granted then coalesce(mandate_signed_at, new.created_at) end,
           onboarding_step   = case when new.granted then 5 else least(onboarding_step, 4) end
     where id = new.profile_id;
  end if;
  return new;
end $$;

create trigger consents_sync after insert on public.consents
  for each row execute function private.consent_to_talent();

-- ---------------------------------------------------------------------------
-- Profile completeness: a PostgREST computed field.
--   supabase.from('talents').select('*, completeness')
-- ---------------------------------------------------------------------------
create or replace function public.completeness(t public.talents)
returns int language sql stable set search_path = '' as $$
  select (
      (case when t.stage_name is not null then 10 else 0 end)
    + (case when t.birth_date is not null then 10 else 0 end)
    + (case when t.city is not null then 10 else 0 end)
    + (case when cardinality(t.languages) > 0 then 10 else 0 end)
    + (case when cardinality(t.categories) > 0 then 15 else 0 end)
    + (case when cardinality(t.skills) > 0 then 10 else 0 end)
    + (case when t.bio is not null then 5 else 0 end)
    + (case when t.headshot_path is not null then 15 else 0 end)
    + (case when t.mandate_signed_at is not null then 15 else 0 end)
  )::int;
$$;

-- ---------------------------------------------------------------------------
-- Matching v0 (explainable, rule-based; LLM rerank can be added later)
--   Hard filters: exclusions, age, gender only if the brief states it,
--                 required languages, mandate signed.
--   Soft score (0-100): category 35, location 20, skills 25, completeness 15,
--                 extra languages 5.
-- Returns {"eligible": bool, "score": n, "reasons": [...]}
-- Never infers protected traits; uses only fields the talent entered.
-- ---------------------------------------------------------------------------
create or replace function private.match_score(t public.talents, c public.castings)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_age     int := case when t.birth_date is null then null
                        else extract(year from age(current_date, t.birth_date))::int end;
  v_score   numeric := 0;
  v_reasons text[] := '{}';
  v_overlap int;
  v_comp    int := public.completeness(t);
begin
  -- Hard filters
  if c.category = any (t.excluded_categories) then
    return jsonb_build_object('eligible', false, 'score', 0, 'reasons', jsonb_build_array('Talent excludes this casting type'));
  end if;
  if c.age_min is not null and (v_age is null or v_age < c.age_min)
     or c.age_max is not null and (v_age is null or v_age > c.age_max) then
    return jsonb_build_object('eligible', false, 'score', 0, 'reasons', jsonb_build_array('Outside the requested age range'));
  end if;
  if c.gender_req is not null and t.gender is distinct from c.gender_req then
    return jsonb_build_object('eligible', false, 'score', 0, 'reasons', jsonb_build_array('Brief specifies a different gender'));
  end if;
  if exists (select 1 from unnest(c.languages_req) l
             where lower(l) <> all (select lower(x) from unnest(t.languages) x)) then
    return jsonb_build_object('eligible', false, 'score', 0, 'reasons', jsonb_build_array('Missing a required language'));
  end if;

  -- Soft score
  if c.category = any (t.categories) then
    v_score := v_score + 35;
    v_reasons := v_reasons || 'Wants this casting type'::text;
  end if;

  if lower(t.city) = lower(c.city) then
    v_score := v_score + 20;
    v_reasons := v_reasons || ('Based in ' || c.city);
  elsif c.remote_ok then
    v_score := v_score + 12;
    v_reasons := v_reasons || 'Remote / self-tape accepted'::text;
  end if;

  if cardinality(c.skills_req) > 0 then
    select count(*) into v_overlap
    from unnest(c.skills_req) s
    where lower(s) = any (select lower(x) from unnest(t.skills) x);
    v_score := v_score + 25.0 * v_overlap / cardinality(c.skills_req);
    if v_overlap > 0 then
      v_reasons := v_reasons || (v_overlap || '/' || cardinality(c.skills_req) || ' requested skills');
    end if;
  else
    v_score := v_score + 15;
  end if;

  v_score := v_score + 0.15 * v_comp;
  if v_comp >= 80 then
    v_reasons := v_reasons || 'Complete profile'::text;
  end if;

  if cardinality(t.languages) >= 2 then
    v_score := v_score + 5;
    v_reasons := v_reasons || ('Speaks ' || array_to_string(t.languages[1:3], ', '));
  end if;

  return jsonb_build_object('eligible', true, 'score', round(least(v_score, 100), 1), 'reasons', to_jsonb(v_reasons));
end $$;

grant execute on function private.match_score(public.talents, public.castings) to authenticated;

-- ---------------------------------------------------------------------------
-- Applications: score on insert, guard every status change, audit trail.
-- ---------------------------------------------------------------------------
create or replace function private.applications_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid      uuid := (select auth.uid());
  v_is_admin boolean := private.is_admin();
  v_match    jsonb;
  t          public.talents;
  c          public.castings;
begin
  if tg_op = 'INSERT' then
    select * into t from public.talents where id = new.talent_id;
    select * into c from public.castings where id = new.casting_id;
    v_match := private.match_score(t, c);
    new.match_score := (v_match ->> 'score')::numeric;
    new.match_reasons := v_match -> 'reasons';
    if new.status = 'approved' then
      -- Only trusted contexts (SQL editor / service jobs: no auth.uid()) may backdate.
      new.approved_at := case when v_uid is null then coalesce(new.approved_at, new.created_at, now()) else now() end;
    elsif v_uid is not null then
      new.approved_at := null;
    end if;
    if new.status in ('queued', 'submitted', 'callback', 'booked', 'passed') and new.approved_at is null then
      raise exception 'Talent approval is required before submission' using errcode = 'P0001';
    end if;
    return new;
  end if;

  -- UPDATE (trusted back-office jobs may set updated_at explicitly, e.g. when importing history)
  if new.updated_at is not distinct from old.updated_at or v_uid is not null then
    new.updated_at := now();
  end if;
  if new.status = old.status then
    return new;
  end if;

  -- Who may make which transition (service role / SQL editor has no auth.uid()).
  if v_uid is not null and not v_is_admin then
    if v_uid = old.talent_id then
      if new.status not in ('approved', 'declined')
         or old.status not in ('proposed', 'awaiting_talent', 'approved', 'declined') then
        raise exception 'Talents can only approve or decline a proposal' using errcode = '42501';
      end if;
      if new.casting_id <> old.casting_id or new.talent_id <> old.talent_id
         or new.match_score is distinct from old.match_score then
        raise exception 'Talents cannot modify match data' using errcode = '42501';
      end if;
    elsif private.owns_casting(old.casting_id) then
      if new.status not in ('awaiting_talent', 'callback', 'booked', 'passed') then
        raise exception 'Casting directors can propose, call back, book or pass' using errcode = '42501';
      end if;
    else
      raise exception 'Not allowed' using errcode = '42501';
    end if;
  end if;

  if new.status = 'approved' then
    new.approved_at := now();
  elsif new.status = 'declined' then
    new.approved_at := null;
  end if;

  -- The human rule: nothing goes out without the talent's yes.
  if new.status in ('queued', 'submitted', 'callback', 'booked', 'passed') and new.approved_at is null then
    raise exception 'Talent approval is required before submission' using errcode = 'P0001';
  end if;

  return new;
end $$;

create trigger applications_guard before insert or update on public.applications
  for each row execute function private.applications_guard();

create or replace function private.applications_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.application_events (application_id, from_status, to_status, actor_id, created_at)
    values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status,
            (select auth.uid()), coalesce(case when tg_op = 'INSERT' then new.created_at end, now()));
  end if;
  return null;
end $$;

create trigger applications_audit after insert or update on public.applications
  for each row execute function private.applications_audit();

-- ---------------------------------------------------------------------------
-- RPCs used by the app
-- ---------------------------------------------------------------------------

-- Talent: open castings ranked for me (security invoker: RLS applies).
create or replace function public.recommended_castings(p_limit int default 12)
returns table (
  casting_id uuid, title text, production text, category public.casting_category,
  city text, remote_ok boolean, pay_min numeric, pay_max numeric, pay_unit text,
  deadline date, score numeric, reasons jsonb, applied boolean
)
language sql stable security invoker set search_path = '' as $$
  with me as (select * from public.talents where id = (select auth.uid()))
  select c.id, c.title, c.production, c.category, c.city, c.remote_ok,
         c.pay_min, c.pay_max, c.pay_unit, c.deadline,
         (m.r ->> 'score')::numeric, m.r -> 'reasons',
         exists (select 1 from public.applications a where a.casting_id = c.id and a.talent_id = (select auth.uid()))
  from public.castings c
  cross join me
  cross join lateral (select private.match_score(me, c) as r) m
  where c.status = 'open'
    and (c.deadline is null or c.deadline >= current_date)
    and (m.r ->> 'eligible')::boolean
  order by (m.r ->> 'score')::numeric desc, c.deadline nulls last
  limit least(greatest(p_limit, 1), 50);
$$;

-- Director / admin: best talents for one casting. Security definer because
-- directors must not read the talent table directly; returns only the fields a
-- talent agreed to share, and only talents with a signed mandate.
create or replace function public.match_talents(p_casting_id uuid, p_limit int default 20)
returns table (
  talent_id uuid, display_name text, city text, age int, languages text[],
  skills text[], categories public.casting_category[], completeness int,
  score numeric, reasons jsonb, already_proposed boolean
)
language plpgsql stable security definer set search_path = '' as $$
declare
  c public.castings;
begin
  if not (private.is_admin() or private.owns_casting(p_casting_id)) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into c from public.castings where id = p_casting_id;

  return query
  select t.id,
         coalesce(t.stage_name, split_part(p.full_name, ' ', 1)),
         t.city,
         extract(year from age(current_date, t.birth_date))::int,
         t.languages, t.skills, t.categories, public.completeness(t),
         (m.r ->> 'score')::numeric, m.r -> 'reasons',
         exists (select 1 from public.applications a where a.casting_id = c.id and a.talent_id = t.id)
  from public.talents t
  join public.profiles p on p.id = t.id
  cross join lateral (select private.match_score(t, c) as r) m
  where t.mandate_signed_at is not null
    and (m.r ->> 'eligible')::boolean
  order by (m.r ->> 'score')::numeric desc
  limit least(greatest(p_limit, 1), 100);
end $$;

-- Director / admin: propose talents. They land as "awaiting_talent";
-- each talent must approve before anything is submitted.
create or replace function public.propose_talents(p_casting_id uuid, p_talent_ids uuid[])
returns int language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if not (private.is_admin() or private.owns_casting(p_casting_id)) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if cardinality(p_talent_ids) > 50 then
    raise exception 'At most 50 talents per batch';
  end if;

  insert into public.applications (casting_id, talent_id, status)
  select p_casting_id, t.id, 'awaiting_talent'
  from public.talents t
  where t.id = any (p_talent_ids) and t.mandate_signed_at is not null
  on conflict (casting_id, talent_id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- Lock the definer RPCs to signed-in users.
revoke execute on function public.match_talents(uuid, int) from public, anon;
revoke execute on function public.propose_talents(uuid, uuid[]) from public, anon;
grant execute on function public.match_talents(uuid, int) to authenticated;
grant execute on function public.propose_talents(uuid, uuid[]) to authenticated;
revoke execute on function public.recommended_castings(int) from public, anon;
grant execute on function public.recommended_castings(int) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security: on for every table, deny by default.
-- (select auth.uid()) / (select private.is_admin()) are wrapped so Postgres
-- evaluates them once per query instead of once per row.
-- ---------------------------------------------------------------------------
alter table public.plans              enable row level security;
alter table public.casting_types      enable row level security;
alter table public.admin_allowlist    enable row level security;
alter table public.profiles           enable row level security;
alter table public.talents            enable row level security;
alter table public.casting_directors  enable row level security;
alter table public.castings           enable row level security;
alter table public.applications       enable row level security;
alter table public.application_events enable row level security;
alter table public.consents           enable row level security;
alter table public.leads              enable row level security;
alter table public.events             enable row level security;
alter table public.feedback           enable row level security;
alter table public.kpi_snapshots      enable row level security;

-- Catalog: public read of active rows, admin write.
create policy "catalog: read active plans" on public.plans
  for select to anon, authenticated using (is_active or (select private.is_admin()));
create policy "catalog: admins manage plans" on public.plans
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "catalog: read active casting types" on public.casting_types
  for select to anon, authenticated using (is_active or (select private.is_admin()));
create policy "catalog: admins manage casting types" on public.casting_types
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- admin_allowlist: no policies -> invisible to every API role.

-- Profiles
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select private.is_admin()));
create policy "profiles: update own name" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Role changes are blocked by column privileges below.

-- Talents
create policy "talents: read own or admin" on public.talents
  for select to authenticated using (id = (select auth.uid()) or (select private.is_admin()));
create policy "talents: update own" on public.talents
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "talents: admin update" on public.talents
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- Casting directors
create policy "directors: read own or admin" on public.casting_directors
  for select to authenticated using (id = (select auth.uid()) or (select private.is_admin()));
create policy "directors: update own" on public.casting_directors
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Castings: open ones are a public board; owners/admins see drafts.
create policy "castings: public read open" on public.castings
  for select to anon, authenticated
  using (status = 'open' or director_id = (select auth.uid()) or (select private.is_admin()));
create policy "castings: directors create own" on public.castings
  for insert to authenticated
  with check (director_id = (select auth.uid())
              and exists (select 1 from public.casting_directors d where d.id = (select auth.uid())));
create policy "castings: directors update own" on public.castings
  for update to authenticated using (director_id = (select auth.uid())) with check (director_id = (select auth.uid()));
create policy "castings: admins manage" on public.castings
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- Applications
create policy "applications: talent, casting owner or admin read" on public.applications
  for select to authenticated
  using (talent_id = (select auth.uid()) or (select private.is_admin()) or private.owns_casting(casting_id));
create policy "applications: talent self-applies (counts as approval)" on public.applications
  for insert to authenticated
  with check (talent_id = (select auth.uid()) and status = 'approved'
              and exists (select 1 from public.castings c where c.id = casting_id and c.status = 'open'));
create policy "applications: talent responds" on public.applications
  for update to authenticated using (talent_id = (select auth.uid())) with check (talent_id = (select auth.uid()));
create policy "applications: casting owner updates" on public.applications
  for update to authenticated using (private.owns_casting(casting_id)) with check (private.owns_casting(casting_id));
create policy "applications: admins manage" on public.applications
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "application events: same visibility as application" on public.application_events
  for select to authenticated
  using (exists (select 1 from public.applications a where a.id = application_id));

-- Consents: read own, insert own, never update/delete (append-only).
create policy "consents: read own or admin" on public.consents
  for select to authenticated using (profile_id = (select auth.uid()) or (select private.is_admin()));
create policy "consents: insert own" on public.consents
  for insert to authenticated with check (profile_id = (select auth.uid()));

-- Leads: anyone can join the waitlist; only admins read.
create policy "leads: anyone can submit" on public.leads
  for insert to anon, authenticated
  with check (converted_at is null and profile_id is null);
create policy "leads: admins read" on public.leads
  for select to authenticated using ((select private.is_admin()));
create policy "leads: admins update" on public.leads
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- Events: write-only for visitors; user_id must be yourself (or null).
create policy "events: anyone can track" on public.events
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
create policy "events: admins read" on public.events
  for select to authenticated using ((select private.is_admin()));

-- Feedback
create policy "feedback: insert own" on public.feedback
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "feedback: read own or admin" on public.feedback
  for select to authenticated using (profile_id = (select auth.uid()) or (select private.is_admin()));

create policy "kpi snapshots: admins read" on public.kpi_snapshots
  for select to authenticated using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Column privileges: users can't escalate their role, verify themselves,
-- or rewrite acquisition attribution.
-- ---------------------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (full_name, last_seen_at) on public.profiles to authenticated;

revoke update on public.talents from authenticated;
grant update (stage_name, birth_date, gender, city, country, languages, categories,
              excluded_categories, skills, height_cm, union_status, availability, bio,
              headshot_path, reel_url, plan) on public.talents to authenticated;

revoke update on public.casting_directors from authenticated;
grant update (company, job_title, city, website) on public.casting_directors to authenticated;

revoke update on public.applications from authenticated;
grant update (status, note) on public.applications to authenticated;

revoke insert, update, delete on public.events from anon, authenticated;
grant insert (session_id, user_id, name, path, props, utm_source, utm_medium, utm_campaign, referrer, device)
  on public.events to anon, authenticated;

revoke insert, update, delete on public.leads from anon, authenticated;
grant insert (email, kind, full_name, company, city, interest, message, session_id,
              utm_source, utm_medium, utm_campaign, referrer, landing_path)
  on public.leads to anon, authenticated;
grant update (converted_at, profile_id) on public.leads to authenticated;

revoke update, delete on public.consents from anon, authenticated;
revoke update, delete on public.application_events from anon, authenticated;
revoke insert on public.application_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private headshots bucket, one folder per user ({uid}/file.jpg)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('headshots', 'headshots', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "headshots: owner reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'headshots'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_admin())));
create policy "headshots: owner uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'headshots' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "headshots: owner replaces" on storage.objects
  for update to authenticated
  using (bucket_id = 'headshots' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "headshots: owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'headshots' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Realtime: live dashboards (RLS still decides who receives which rows)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.events, public.applications, public.leads, public.talents;
