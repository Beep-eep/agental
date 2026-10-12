-- =============================================================================
-- Agental · 0001 · Core schema
-- Talents, casting directors, castings, applications (submissions), consents,
-- product catalog (plans, casting types), acquisition (leads, events), feedback.
--
-- Design rules (from the Agental Simple Guide and roadmap):
--   * Adults only in V1 (18+ enforced in the database, not just the UI).
--   * A talent always says "yes" before anything is submitted in their name.
--   * Consents and audit events are append-only.
--   * Keep only what we use: every talent field serves matching or submissions.
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('talent', 'director', 'admin');

-- "children" from the public site is deliberately absent: V1 is adults-only.
create type public.casting_category as enum (
  'background', 'walk_on', 'supporting', 'commercial',
  'photo', 'voice', 'creator', 'performer'
);

create type public.plan_tier as enum ('free', 'pro', 'premium', 'ultimate');
create type public.casting_status as enum ('draft', 'open', 'closed');

-- proposed -> awaiting_talent -> approved | declined -> queued -> submitted
--          -> callback -> booked | passed
create type public.application_status as enum (
  'proposed', 'awaiting_talent', 'approved', 'declined',
  'queued', 'submitted', 'callback', 'booked', 'passed'
);

create type public.consent_kind as enum ('terms', 'privacy', 'representation_mandate', 'marketing');
create type public.lead_kind as enum ('talent', 'director');

-- ---------------------------------------------------------------------------
-- Product catalog (managed by admins, rendered live on the website)
-- ---------------------------------------------------------------------------
create table public.plans (
  tier              public.plan_tier primary key,
  name              text        not null,
  tagline           text        not null default '',
  monthly_price_eur numeric(8,2) not null check (monthly_price_eur >= 0),
  commission_pct    numeric(4,2) not null check (commission_pct between 0 and 100),
  features          text[]      not null default '{}',
  is_active         boolean     not null default true,
  sort_order        int         not null default 0,
  updated_at        timestamptz not null default now()
);
comment on table public.plans is 'Pricing tiers shown on /pricing. Editable from /insights/catalog.';

create table public.casting_types (
  category    public.casting_category primary key,
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  label       text not null,
  summary     text not null,
  description text not null default '',
  pay_min     numeric(10,2),
  pay_max     numeric(10,2),
  pay_unit    text not null default 'day' check (pay_unit in ('day', 'session', 'project')),
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now(),
  check (pay_min is null or pay_max is null or pay_min <= pay_max)
);
comment on table public.casting_types is 'Casting worlds shown on /castings. Editable from /insights/catalog.';

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table public.admin_allowlist (
  email      text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
comment on table public.admin_allowlist is 'Emails that become admins when they sign up. Never exposed to the API.';

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         public.user_role not null default 'talent',
  full_name    text not null default '' check (char_length(full_name) <= 120),
  email        text not null,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz
);
create index profiles_role_idx on public.profiles (role);

create table public.talents (
  id                  uuid primary key references public.profiles (id) on delete cascade,
  stage_name          text check (char_length(stage_name) <= 80),
  birth_date          date check (birth_date <= (current_date - interval '18 years')::date),
  gender              text check (gender in ('female', 'male', 'non_binary', 'prefer_not_say')),
  city                text check (char_length(city) <= 80),
  country             text not null default 'US' check (char_length(country) = 2),
  languages           text[] not null default '{}',
  categories          public.casting_category[] not null default '{}',
  excluded_categories public.casting_category[] not null default '{}',
  skills              text[] not null default '{}',
  height_cm           int check (height_cm between 90 and 250),
  union_status        text not null default 'non_union'
                      check (union_status in ('non_union', 'sag_aftra_eligible', 'sag_aftra')),
  availability        text not null default 'flexible'
                      check (availability in ('full_time', 'weekends', 'evenings', 'flexible')),
  bio                 text check (char_length(bio) <= 1000),
  headshot_path       text,
  reel_url            text check (reel_url is null or reel_url ~* '^https?://'),
  plan                public.plan_tier not null default 'free' references public.plans (tier),
  onboarding_step     smallint not null default 1 check (onboarding_step between 1 and 5),
  mandate_signed_at   timestamptz,
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,
  referrer            text,
  landing_path        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
comment on column public.talents.onboarding_step is '1 account · 2 identity · 3 profile · 4 media · 5 mandate signed (complete)';
create index talents_categories_idx on public.talents using gin (categories);
create index talents_city_idx on public.talents (city);
create index talents_created_idx on public.talents (created_at);
create index talents_utm_idx on public.talents (utm_source);

create table public.casting_directors (
  id           uuid primary key references public.profiles (id) on delete cascade,
  company      text not null default '' check (char_length(company) <= 120),
  job_title    text check (char_length(job_title) <= 80),
  city         text check (char_length(city) <= 80),
  website      text check (website is null or website ~* '^https?://'),
  verified     boolean not null default false,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Castings & applications
-- ---------------------------------------------------------------------------
create table public.castings (
  id            uuid primary key default gen_random_uuid(),
  director_id   uuid references public.casting_directors (id) on delete set null,
  source        text not null default 'agental' check (source in ('agental', 'external')),
  title         text not null check (char_length(title) between 3 and 140),
  production    text check (char_length(production) <= 140),
  category      public.casting_category not null,
  city          text not null check (char_length(city) <= 80),
  remote_ok     boolean not null default false,
  pay_min       numeric(10,2),
  pay_max       numeric(10,2),
  pay_unit      text not null default 'day' check (pay_unit in ('day', 'session', 'project')),
  age_min       int check (age_min >= 18),
  age_max       int check (age_max <= 100),
  gender_req    text check (gender_req in ('female', 'male', 'non_binary')),
  languages_req text[] not null default '{}',
  skills_req    text[] not null default '{}',
  shoot_date    date,
  deadline      date,
  status        public.casting_status not null default 'open',
  description   text check (char_length(description) <= 4000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (age_min is null or age_max is null or age_min <= age_max),
  check (pay_min is null or pay_max is null or pay_min <= pay_max)
);
create index castings_status_idx on public.castings (status, category);
create index castings_director_idx on public.castings (director_id);
create index castings_created_idx on public.castings (created_at);

create table public.applications (
  id            uuid primary key default gen_random_uuid(),
  casting_id    uuid not null references public.castings (id) on delete cascade,
  talent_id     uuid not null references public.talents (id) on delete cascade,
  status        public.application_status not null default 'proposed',
  match_score   numeric(5,2),
  match_reasons jsonb not null default '[]'::jsonb,
  note          text check (char_length(note) <= 1000),
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (casting_id, talent_id)
);
create index applications_talent_idx on public.applications (talent_id, status);
create index applications_status_idx on public.applications (status, created_at);

-- Append-only audit trail of every status change (AI-in-hiring record keeping).
create table public.application_events (
  id             bigint generated always as identity primary key,
  application_id uuid not null references public.applications (id) on delete cascade,
  from_status    public.application_status,
  to_status      public.application_status not null,
  actor_id       uuid,
  created_at     timestamptz not null default now()
);
create index application_events_app_idx on public.application_events (application_id, created_at);

-- Append-only, versioned consent ledger.
create table public.consents (
  id         bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind       public.consent_kind not null,
  version    text not null,
  granted    boolean not null,
  created_at timestamptz not null default now()
);
create index consents_profile_idx on public.consents (profile_id, kind, created_at desc);

-- ---------------------------------------------------------------------------
-- Acquisition & validation
-- ---------------------------------------------------------------------------
create table public.leads (
  id           uuid primary key default gen_random_uuid(),
  email        text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  kind         public.lead_kind not null,
  full_name    text check (char_length(full_name) <= 120),
  company      text check (char_length(company) <= 120),
  city         text check (char_length(city) <= 80),
  interest     public.casting_category,
  message      text check (char_length(message) <= 2000),
  session_id   text check (char_length(session_id) <= 64),
  utm_source   text check (char_length(utm_source) <= 80),
  utm_medium   text check (char_length(utm_medium) <= 80),
  utm_campaign text check (char_length(utm_campaign) <= 120),
  referrer     text check (char_length(referrer) <= 500),
  landing_path text check (char_length(landing_path) <= 300),
  converted_at timestamptz,
  profile_id   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (email, kind)
);
create index leads_created_idx on public.leads (created_at);

-- First-party product analytics. Written by the website's tracker (anon allowed).
create table public.events (
  id           bigint generated always as identity primary key,
  session_id   text not null check (char_length(session_id) between 8 and 64),
  user_id      uuid references public.profiles (id) on delete set null,
  name         text not null check (name ~ '^[a-z][a-z0-9_]{1,40}$'),
  path         text check (char_length(path) <= 300),
  props        jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 2048),
  utm_source   text check (char_length(utm_source) <= 80),
  utm_medium   text check (char_length(utm_medium) <= 80),
  utm_campaign text check (char_length(utm_campaign) <= 120),
  referrer     text check (char_length(referrer) <= 500),
  device       text check (device in ('mobile', 'tablet', 'desktop')),
  created_at   timestamptz not null default now()
);
create index events_created_idx on public.events (created_at);
create index events_name_created_idx on public.events (name, created_at);
create index events_session_idx on public.events (session_id);
create index events_user_idx on public.events (user_id, created_at) where user_id is not null;

create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  nps        smallint not null check (nps between 0 and 10),
  -- Sean Ellis product-market-fit question.
  pmf        text check (pmf in ('very', 'somewhat', 'not')),
  topic      text not null default 'other'
             check (topic in ('matching', 'castings', 'self_tape', 'pricing', 'onboarding', 'payments', 'other')),
  comment    text check (char_length(comment) <= 2000),
  created_at timestamptz not null default now()
);
create index feedback_created_idx on public.feedback (created_at);

-- Daily KPI snapshots written by pg_cron (supply metrics are not reconstructable later).
create table public.kpi_snapshots (
  day               date primary key,
  talents_total     int not null,
  talents_active    int not null,
  directors_total   int not null,
  castings_open     int not null,
  applications_open int not null,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger talents_touch before update on public.talents
  for each row execute function private.touch_updated_at();
create trigger castings_touch before update on public.castings
  for each row execute function private.touch_updated_at();
create trigger plans_touch before update on public.plans
  for each row execute function private.touch_updated_at();
create trigger casting_types_touch before update on public.casting_types
  for each row execute function private.touch_updated_at();
