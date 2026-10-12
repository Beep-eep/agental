-- =============================================================================
-- Agental demo seed — 120 days of synthetic but internally consistent data.
--
-- ⚠️  DEMO DATA ONLY. Every person, company and comment here is fictional
--     (emails use the reserved example.com domain). Never run on production.
--
-- Run as one script (psql / SQL editor); it is split into four blocks so each
-- stays under API statement timeouts. Blocks 2-4 only read what earlier blocks
-- committed, so they can also be run one at a time.
--
-- Users are inserted into auth.users with raw_user_meta_data, exactly like the
-- registration form does, so the same trigger (private.handle_new_user)
-- builds profiles, talents, directors, consents and lead conversions.
--
-- Demo logins (change the password after seeding!):
--   demo-admin@example.com · demo-director@example.com · demo-talent@example.com
--   password: the value of :demo_password below (default 'agental-demo-2026')
-- =============================================================================

do $seed$
declare
  demo_password text := coalesce(current_setting('agental.demo_password', true), 'agental-demo-2026');

  first_f text[] := array['Amina','Sofia','Maya','Chloe','Lea','Camila','Aaliyah','Grace','Mei','Hana','Isabella',
                          'Zoe','Nadia','Priya','Emma','Lucia','Jade','Valentina','Sarah','Yasmin','Olivia','Ines'];
  first_m text[] := array['Lucas','Sofiane','Mateo','Ethan','Noah','Hugo','Diego','Kenji','Omar','Julien','Marcus',
                          'Leo','Daniel','Adrian','Samuel','Wei','Theo','Gabriel','Andre','Malik','Jonah','Rafael'];
  last_n  text[] := array['Martin','Garcia','Nguyen','Kim','Johnson','Lopez','Chen','Dubois','Rossi','Okafor','Silva',
                          'Haddad','Park','Brown','Moreau','Ramirez','Lee','Bernard','Patel','Wright','Torres','Li'];
  skills_all text[] := array['driving','dance','singing','swimming','horse riding','stage combat','martial arts',
                             'skateboarding','guitar','piano','cooking','basketball','yoga','improv','accents',
                             'juggling','modeling','hosting','stunts','voice acting'];
  companies text[] := array['Northlight Casting','Sunset Boulevard Pictures','Harbor & Pine Studios','Lumen Ads',
                            'Echo Park Films','Westside Commercials','Golden Hour Media','Cinder Street Casting',
                            'Blue Lantern Productions','Atelier Paris Casting','Vertical Shorts Co.','Mesa Creative',
                            'USC School of Cinematic Arts (student)','Studio Kite','Brightline Voice'];

  i int; k int; n int;
  v_id uuid; v_created timestamptz; v_meta jsonb; v_session text;
  v_name text; v_first text; v_gender text; v_city text; v_country text; v_src text;
  v_cats text[]; v_langs text[]; v_skills text[];
  v_step int; v_mandated boolean; v_act numeric; v_r numeric;
  v_casting public.castings; v_cand record;
  v_status public.application_status; v_approved timestamptz; v_app_created timestamptz;
  v_cat public.casting_category; v_dir uuid; v_deadline date;
  v_topic text; v_nps int; v_pmf text; v_comment text;
  v_days int; v_sessions int; v_dev text; v_path text;
  admin_id uuid := '00000000-0000-4000-a000-000000000001';
  director_id uuid := '00000000-0000-4000-a000-000000000002';
  talent_id uuid := '00000000-0000-4000-a000-000000000003';
begin
  perform setseed(0.4242);

  -- ---------------------------------------------------------------------------
  -- helper: create an auth user (password login works for demo accounts only)
  -- ---------------------------------------------------------------------------
  create temporary table _new_users (id uuid, email text, created_at timestamptz, meta jsonb, password text);

  -- ---------------------------------------------------------------------------
  -- 1. Demo accounts
  -- ---------------------------------------------------------------------------
  insert into public.admin_allowlist (email) values ('demo-admin@example.com') on conflict do nothing;

  insert into _new_users values
    (admin_id, 'demo-admin@example.com', now() - interval '130 days',
     jsonb_build_object('full_name', 'Demo Admin', 'role', 'talent'), demo_password),
    (director_id, 'demo-director@example.com', now() - interval '95 days',
     jsonb_build_object('full_name', 'Dana Reyes', 'role', 'director', 'company', 'Northlight Casting',
                        'job_title', 'Casting Director', 'city', 'Los Angeles', 'utm_source', 'linkedin',
                        'consents', jsonb_build_array(jsonb_build_object('kind','terms','version','v1'),
                                                      jsonb_build_object('kind','privacy','version','v1'))), demo_password),
    (talent_id, 'demo-talent@example.com', now() - interval '41 days',
     jsonb_build_object('full_name', 'Jordan Ellis', 'role', 'talent', 'stage_name', 'Jordan Ellis',
                        'birth_date', '1997-05-14', 'gender', 'non_binary', 'city', 'Los Angeles', 'country', 'US',
                        'languages', jsonb_build_array('English', 'Spanish'),
                        'categories', jsonb_build_array('commercial', 'supporting', 'voice'),
                        'skills', jsonb_build_array('improv', 'driving', 'accents', 'voice acting'),
                        'height_cm', '172', 'union_status', 'sag_aftra_eligible', 'availability', 'flexible',
                        'bio', 'Bilingual actor and voice performer based in LA. Comedy, commercials and animation.',
                        'utm_source', 'instagram', 'session_id', 'seed-demo-talent-0001',
                        'consents', jsonb_build_array(jsonb_build_object('kind','terms','version','v1'),
                                                      jsonb_build_object('kind','privacy','version','v1'),
                                                      jsonb_build_object('kind','representation_mandate','version','v1'))),
     demo_password);

  -- ---------------------------------------------------------------------------
  -- 2. Casting directors (40)
  -- ---------------------------------------------------------------------------
  for i in 1..39 loop
    v_r := random();
    v_src := case when v_r < 0.40 then 'linkedin' when v_r < 0.70 then 'referral'
                  when v_r < 0.90 then null else 'google' end;
    v_first := case when random() < 0.5 then first_f[1 + floor(random() * 22)::int] else first_m[1 + floor(random() * 22)::int] end;
    v_name := v_first || ' ' || last_n[1 + floor(random() * 22)::int];
    v_created := now() - make_interval(secs => (110 * (1 - sqrt(random()))) * 86400);
    insert into _new_users values (gen_random_uuid(),
      lower(replace(v_name, ' ', '.')) || '.cd' || i || '@example.com', v_created,
      jsonb_build_object('full_name', v_name, 'role', 'director',
        'company', companies[1 + floor(random() * 15)::int], 'job_title',
        (array['Casting Director','Casting Associate','Producer','Brand Manager'])[1 + floor(random() * 4)::int],
        'city', case when random() < 0.8 then 'Los Angeles' when random() < 0.5 then 'New York' else 'Paris' end,
        'utm_source', v_src,
        'consents', jsonb_build_array(jsonb_build_object('kind','terms','version','v1'),
                                      jsonb_build_object('kind','privacy','version','v1'))), null);
  end loop;

  -- ---------------------------------------------------------------------------
  -- 3. Talents (~470) — growth curve skewed to recent weeks
  -- ---------------------------------------------------------------------------
  create temporary table _talent_plan (id uuid, email text, created_at timestamptz, src text,
                                       mandated boolean, step int, first_cat text, session text);

  for i in 1..470 loop
    v_r := random();
    v_src := case when v_r < 0.27 then 'instagram' when v_r < 0.49 then 'tiktok' when v_r < 0.64 then 'google'
                  when v_r < 0.76 then 'referral' when v_r < 0.86 then 'usc_student_films' else null end;
    v_act := case v_src when 'instagram' then 0.56 when 'tiktok' then 0.38 when 'google' then 0.60
                        when 'referral' then 0.80 when 'usc_student_films' then 0.74 else 0.50 end;
    v_created := now() - make_interval(secs => (118 * (1 - sqrt(random()))) * 86400);
    -- very recent sign-ups have had less time to finish onboarding
    if v_created > now() - interval '3 days' then v_act := v_act * 0.5; end if;
    v_mandated := random() < v_act;
    v_r := random();
    v_step := case when v_mandated then 5 when v_r < 0.38 then 4 when v_r < 0.70 then 3 when v_r < 0.86 then 2 else 1 end;

    v_gender := case when random() < 0.48 then 'female' when random() < 0.92 then 'male'
                     when random() < 0.7 then 'non_binary' else 'prefer_not_say' end;
    v_first := case when v_gender = 'female' then first_f[1 + floor(random() * 22)::int]
                    when v_gender = 'male' then first_m[1 + floor(random() * 22)::int]
                    else (array['Alex','Sam','Charlie','Robin','Kai','River'])[1 + floor(random() * 6)::int] end;
    v_name := v_first || ' ' || last_n[1 + floor(random() * 22)::int];

    v_r := random();
    v_city := case when v_r < 0.52 then 'Los Angeles' when v_r < 0.60 then 'Burbank' when v_r < 0.66 then 'Santa Monica'
                   when v_r < 0.70 then 'Long Beach' when v_r < 0.80 then 'New York' when v_r < 0.94 then 'Paris' else 'Lyon' end;
    v_country := case when v_city in ('Paris', 'Lyon') then 'FR' else 'US' end;

    v_langs := case when v_country = 'FR' then array['French'] || case when random() < 0.6 then array['English'] else '{}' end
                    else array['English'] end;
    if random() < 0.30 then v_langs := v_langs || 'Spanish'::text; end if;
    if random() < 0.09 then v_langs := v_langs || 'Mandarin'::text; end if;
    if random() < 0.05 then v_langs := v_langs || 'Korean'::text; end if;
    if v_country = 'US' and random() < 0.08 then v_langs := v_langs || 'French'::text; end if;

    v_cats := '{}';
    if random() < 0.50 then v_cats := v_cats || 'background'::text; end if;
    if random() < 0.34 then v_cats := v_cats || 'commercial'::text; end if;
    if random() < 0.30 then v_cats := v_cats || 'walk_on'::text; end if;
    if random() < 0.24 then v_cats := v_cats || 'supporting'::text; end if;
    if random() < 0.22 then v_cats := v_cats || 'photo'::text; end if;
    if random() < 0.14 then v_cats := v_cats || 'creator'::text; end if;
    if random() < 0.09 then v_cats := v_cats || 'voice'::text; end if;
    if random() < 0.09 then v_cats := v_cats || 'performer'::text; end if;
    if cardinality(v_cats) = 0 then v_cats := array['background']; end if;

    v_skills := array(select s from unnest(skills_all) s where random() < 0.13 limit 5);
    v_session := 'seed-' || substr(md5(random()::text), 1, 20);
    v_id := gen_random_uuid();

    v_meta := jsonb_build_object('full_name', v_name, 'role', 'talent', 'session_id', v_session,
                                 'utm_source', v_src, 'utm_medium', case when v_src in ('instagram','tiktok') then 'social'
                                                                          when v_src = 'google' then 'cpc' end,
                                 'landing_path', (array['/', '/castings', '/how-it-works', '/pricing'])[1 + floor(random() * 4)::int],
                                 'consents', jsonb_build_array(jsonb_build_object('kind','terms','version','v1'),
                                                               jsonb_build_object('kind','privacy','version','v1'))
                                             || case when random() < 0.6 then jsonb_build_array(jsonb_build_object('kind','marketing','version','v1')) else '[]'::jsonb end);
    if v_step >= 2 then
      v_meta := v_meta || jsonb_build_object(
        'birth_date', (current_date - make_interval(days => ((19 + floor(power(random(), 1.6) * 45)) * 365.25 + random() * 300)::int))::date,
        'gender', v_gender, 'city', v_city, 'country', v_country,
        'stage_name', case when random() < 0.7 then v_name end);
    end if;
    if v_step >= 3 then
      v_meta := v_meta || jsonb_build_object(
        'languages', to_jsonb(v_langs), 'categories', to_jsonb(v_cats), 'skills', to_jsonb(v_skills),
        'height_cm', (150 + floor(random() * 45))::text,
        'union_status', case when random() < 0.75 then 'non_union' when random() < 0.6 then 'sag_aftra_eligible' else 'sag_aftra' end,
        'availability', (array['full_time','weekends','evenings','flexible'])[1 + floor(random() * 4)::int],
        'bio', case when random() < 0.55 then 'Performer based in ' || v_city || '. Reliable, punctual, comfortable on camera.' end,
        'excluded_categories', case when random() < 0.12 then jsonb_build_array('background') else '[]'::jsonb end);
    end if;
    if v_step >= 4 then
      v_meta := v_meta || jsonb_build_object('headshot_path', v_id::text || '/headshot.jpg');
    end if;
    if v_mandated then
      v_meta := v_meta || jsonb_build_object('plan',
        case when random() < 0.78 then 'free' when random() < 0.55 then 'pro' when random() < 0.7 then 'premium' else 'ultimate' end);
    end if;

    insert into _new_users values (v_id, lower(replace(v_name, ' ', '.')) || '.' || i || '@example.com', v_created, v_meta, null);
    insert into _talent_plan values (v_id, lower(replace(v_name, ' ', '.')) || '.' || i || '@example.com',
                                     v_created, v_src, v_mandated, v_step, v_cats[1], v_session);
  end loop;

  -- ---------------------------------------------------------------------------
  -- 4. Leads: 70% of future talents joined the waitlist first; plus pure
  --    waitlist leads and casting-director briefs.
  -- ---------------------------------------------------------------------------
  insert into public.leads (email, kind, full_name, interest, session_id, utm_source, landing_path, created_at)
  select tp.email, 'talent', null, tp.first_cat::public.casting_category, tp.session, tp.src, '/',
         tp.created_at - make_interval(secs => random() * 4 * 86400)
  from _talent_plan tp where random() < 0.70;

  for i in 1..520 loop
    v_r := random();
    v_src := case when v_r < 0.30 then 'instagram' when v_r < 0.58 then 'tiktok' when v_r < 0.72 then 'google'
                  when v_r < 0.80 then 'referral' else null end;
    v_r := random();
    insert into public.leads (email, kind, interest, session_id, utm_source, landing_path, created_at)
    values ('waitlist.' || i || '.' || substr(md5(random()::text), 1, 6) || '@example.com', 'talent',
            (case when v_r < 0.30 then 'background' when v_r < 0.52 then 'commercial' when v_r < 0.66 then 'supporting'
                  when v_r < 0.76 then 'photo' when v_r < 0.86 then 'voice' when v_r < 0.94 then 'creator' else 'walk_on' end)::public.casting_category,
            'seed-' || substr(md5(random()::text), 1, 20), v_src,
            (array['/', '/castings', '/pricing', '/how-it-works'])[1 + floor(random() * 4)::int],
            now() - make_interval(secs => (118 * (1 - sqrt(random()))) * 86400));
  end loop;

  for i in 1..64 loop
    insert into public.leads (email, kind, full_name, company, city, message, session_id, utm_source, landing_path, created_at)
    values ('brief.' || i || '@example.com', 'director',
            first_m[1 + floor(random() * 22)::int] || ' ' || last_n[1 + floor(random() * 22)::int],
            companies[1 + floor(random() * 15)::int], 'Los Angeles',
            case when random() < 0.7 then (array[
              'Looking for 6 bilingual (EN/ES) talents for a regional car commercial, 2-day shoot.',
              'Need background for a period drama, 40 people, 1940s look, Burbank lot.',
              'Student thesis film: two supporting roles, 25-35, self-tapes this week.',
              'Voice casting for an e-learning series, warm neutral American accent.',
              'Vertical micro-drama: 3 leads + 10 walk-ons, 5 shooting days, fast turnaround.',
              'Brand UGC campaign: creators 20-30 comfortable on camera, LA based.'])[1 + floor(random() * 6)::int] end,
            'seed-' || substr(md5(random()::text), 1, 20),
            case when random() < 0.5 then 'linkedin' when random() < 0.5 then 'referral' end,
            '/directors', now() - make_interval(secs => (110 * (1 - sqrt(random()))) * 86400));
  end loop;

  -- ---------------------------------------------------------------------------
  -- 5. Create auth users (fires private.handle_new_user)
  -- ---------------------------------------------------------------------------
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
         case when u.password is not null then extensions.crypt(u.password, extensions.gen_salt('bf')) else '' end,
         u.created_at, '{"provider":"email","providers":["email"]}'::jsonb, u.meta, u.created_at, u.created_at,
         '', '', '', ''
  from _new_users u order by u.created_at;

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
         'email', u.created_at, u.created_at, u.created_at
  from _new_users u where u.password is not null;

  -- Mandates are signed a few days after sign-up (realistic time-to-activate).
  insert into public.consents (profile_id, kind, version, granted, created_at)
  select tp.id, 'representation_mandate', 'v1', true,
         least(now() - interval '5 minutes', tp.created_at + make_interval(secs => power(random(), 2) * 9 * 86400))
  from _talent_plan tp where tp.mandated;

end
$seed$;

-- ---------------------------------------------------------------------------
do $seed$
declare
  demo_password text := coalesce(current_setting('agental.demo_password', true), 'agental-demo-2026');

  first_f text[] := array['Amina','Sofia','Maya','Chloe','Lea','Camila','Aaliyah','Grace','Mei','Hana','Isabella',
                          'Zoe','Nadia','Priya','Emma','Lucia','Jade','Valentina','Sarah','Yasmin','Olivia','Ines'];
  first_m text[] := array['Lucas','Sofiane','Mateo','Ethan','Noah','Hugo','Diego','Kenji','Omar','Julien','Marcus',
                          'Leo','Daniel','Adrian','Samuel','Wei','Theo','Gabriel','Andre','Malik','Jonah','Rafael'];
  last_n  text[] := array['Martin','Garcia','Nguyen','Kim','Johnson','Lopez','Chen','Dubois','Rossi','Okafor','Silva',
                          'Haddad','Park','Brown','Moreau','Ramirez','Lee','Bernard','Patel','Wright','Torres','Li'];
  skills_all text[] := array['driving','dance','singing','swimming','horse riding','stage combat','martial arts',
                             'skateboarding','guitar','piano','cooking','basketball','yoga','improv','accents',
                             'juggling','modeling','hosting','stunts','voice acting'];
  companies text[] := array['Northlight Casting','Sunset Boulevard Pictures','Harbor & Pine Studios','Lumen Ads',
                            'Echo Park Films','Westside Commercials','Golden Hour Media','Cinder Street Casting',
                            'Blue Lantern Productions','Atelier Paris Casting','Vertical Shorts Co.','Mesa Creative',
                            'USC School of Cinematic Arts (student)','Studio Kite','Brightline Voice'];

  i int; k int; n int;
  v_id uuid; v_created timestamptz; v_meta jsonb; v_session text;
  v_name text; v_first text; v_gender text; v_city text; v_country text; v_src text;
  v_cats text[]; v_langs text[]; v_skills text[];
  v_step int; v_mandated boolean; v_act numeric; v_r numeric;
  v_casting public.castings; v_cand record;
  v_status public.application_status; v_approved timestamptz; v_app_created timestamptz;
  v_cat public.casting_category; v_dir uuid; v_deadline date;
  v_topic text; v_nps int; v_pmf text; v_comment text;
  v_days int; v_sessions int; v_dev text; v_path text;
  admin_id uuid := '00000000-0000-4000-a000-000000000001';
  director_id uuid := '00000000-0000-4000-a000-000000000002';
  talent_id uuid := '00000000-0000-4000-a000-000000000003';
begin
  perform setseed(0.1717);

  -- ---------------------------------------------------------------------------
  -- 6. Castings (~230): demand skews to commercials and voice
  -- ---------------------------------------------------------------------------
  for i in 1..230 loop
    v_r := random();
    v_cat := (case when v_r < 0.25 then 'commercial' when v_r < 0.39 then 'background' when v_r < 0.54 then 'supporting'
                   when v_r < 0.68 then 'voice' when v_r < 0.80 then 'photo' when v_r < 0.89 then 'walk_on'
                   when v_r < 0.95 then 'creator' else 'performer' end)::public.casting_category;
    v_created := now() - make_interval(secs => (112 * (1 - sqrt(random()))) * 86400);
    select d.id into v_dir from public.casting_directors d
      where d.created_at <= v_created order by random() limit 1;
    if random() < 0.2 then v_dir := null; end if;
    v_deadline := (v_created + make_interval(days => 7 + floor(random() * 15)::int))::date;

    insert into public.castings (director_id, source, title, production, category, city, remote_ok,
                                 pay_min, pay_max, pay_unit, age_min, age_max, gender_req, languages_req, skills_req,
                                 shoot_date, deadline, status, description, created_at, updated_at)
    select v_dir, case when v_dir is null then 'external' else 'agental' end,
           (array[ct.label || ' — ' || (array['Lead couple','Barista','Office workers','Concert crowd','Young parent',
                                              'Narrator','Delivery driver','Doctor','Tourist','Runner','Chef','Teacher'])[1 + floor(random() * 12)::int],
                  (array['Spring','Summer','Night','City','Coastal','Indie'])[1 + floor(random() * 6)::int] || ' ' ||
                  (array['campaign','series','feature','spot','shoot','project'])[1 + floor(random() * 6)::int] || ' · ' || ct.label])[1 + floor(random() * 2)::int],
           (array['Untitled Netflix-style series','Regional auto brand','Indie feature','USC thesis film','Sportswear launch',
                  'Food delivery app','Vertical micro-drama','E-learning platform','Music video','Streaming comedy'])[1 + floor(random() * 10)::int],
           v_cat,
           case when random() < 0.72 then 'Los Angeles' when random() < 0.4 then 'Burbank' when random() < 0.5 then 'New York' else 'Paris' end,
           v_cat in ('voice', 'creator') and random() < 0.8 or random() < 0.1,
           round(coalesce(ct.pay_min, 150) * (0.9 + random() * 0.3)),
           round(coalesce(ct.pay_max, 600) * (0.6 + random() * 0.4)),
           ct.pay_unit,
           case when random() < 0.5 then (array[18, 21, 25, 30, 35, 45])[1 + floor(random() * 6)::int] end,
           null,
           case when random() < 0.12 then (array['female','male'])[1 + floor(random() * 2)::int] end,
           case when random() < 0.12 then array['Spanish'] when random() < 0.05 then array['French']
                when random() < 0.04 then array['Mandarin'] else '{}' end,
           array(select s from unnest(skills_all) s where random() < 0.06 limit 2),
           v_deadline + (3 + floor(random() * 8))::int, v_deadline,
           (case when v_deadline >= current_date then 'open' else 'closed' end)::public.casting_status,
           'Self-tapes accepted. Please read the full brief before approving your submission.',
           v_created, v_created
    from public.casting_types ct where ct.category = v_cat;
  end loop;
  update public.castings set age_max = age_min + (10 + floor(random() * 20))::int where age_min is not null;

  -- Demo director owns a few fresh open castings
  update public.castings c set director_id = '00000000-0000-4000-a000-000000000002', source = 'agental'
   where c.id in (select id from public.castings where status = 'open' order by created_at desc limit 5);

end
$seed$;

-- ---------------------------------------------------------------------------
do $seed$
declare
  demo_password text := coalesce(current_setting('agental.demo_password', true), 'agental-demo-2026');

  first_f text[] := array['Amina','Sofia','Maya','Chloe','Lea','Camila','Aaliyah','Grace','Mei','Hana','Isabella',
                          'Zoe','Nadia','Priya','Emma','Lucia','Jade','Valentina','Sarah','Yasmin','Olivia','Ines'];
  first_m text[] := array['Lucas','Sofiane','Mateo','Ethan','Noah','Hugo','Diego','Kenji','Omar','Julien','Marcus',
                          'Leo','Daniel','Adrian','Samuel','Wei','Theo','Gabriel','Andre','Malik','Jonah','Rafael'];
  last_n  text[] := array['Martin','Garcia','Nguyen','Kim','Johnson','Lopez','Chen','Dubois','Rossi','Okafor','Silva',
                          'Haddad','Park','Brown','Moreau','Ramirez','Lee','Bernard','Patel','Wright','Torres','Li'];
  skills_all text[] := array['driving','dance','singing','swimming','horse riding','stage combat','martial arts',
                             'skateboarding','guitar','piano','cooking','basketball','yoga','improv','accents',
                             'juggling','modeling','hosting','stunts','voice acting'];
  companies text[] := array['Northlight Casting','Sunset Boulevard Pictures','Harbor & Pine Studios','Lumen Ads',
                            'Echo Park Films','Westside Commercials','Golden Hour Media','Cinder Street Casting',
                            'Blue Lantern Productions','Atelier Paris Casting','Vertical Shorts Co.','Mesa Creative',
                            'USC School of Cinematic Arts (student)','Studio Kite','Brightline Voice'];

  i int; k int; n int;
  v_id uuid; v_created timestamptz; v_meta jsonb; v_session text;
  v_name text; v_first text; v_gender text; v_city text; v_country text; v_src text;
  v_cats text[]; v_langs text[]; v_skills text[];
  v_step int; v_mandated boolean; v_act numeric; v_r numeric;
  v_casting public.castings; v_cand record;
  v_status public.application_status; v_approved timestamptz; v_app_created timestamptz;
  v_cat public.casting_category; v_dir uuid; v_deadline date;
  v_topic text; v_nps int; v_pmf text; v_comment text;
  v_days int; v_sessions int; v_dev text; v_path text;
  admin_id uuid := '00000000-0000-4000-a000-000000000001';
  director_id uuid := '00000000-0000-4000-a000-000000000002';
  talent_id uuid := '00000000-0000-4000-a000-000000000003';
begin
  perform setseed(0.2828);

  -- ---------------------------------------------------------------------------
  -- 7. Applications: proposals + self-applications, outcomes depend on score
  -- ---------------------------------------------------------------------------
  for v_casting in select * from public.castings order by created_at loop
    n := 4 + floor(random() * 14)::int;
    for v_cand in
      select t.id as talent_id, (m.r ->> 'score')::numeric as score
      from public.talents t
      cross join lateral (select private.match_score(t, v_casting) as r) m
      where t.mandate_signed_at is not null
        and t.mandate_signed_at < v_casting.created_at + interval '4 days'
        and (m.r ->> 'eligible')::boolean
      order by (m.r ->> 'score')::numeric + random() * 25 desc
      limit n
    loop
      v_app_created := least(now() - interval '10 minutes',
                             v_casting.created_at + make_interval(secs => random() * 4 * 86400));
      if random() < 0.35 then
        -- talent applied themselves (counts as approval)
        v_approved := v_app_created;
      elsif random() < 0.12 then
        v_approved := null;  -- declined
      elsif v_casting.status = 'open' and random() < 0.35 then
        v_approved := null;  -- still waiting for the talent
      else
        v_approved := least(now() - interval '5 minutes',
                            v_app_created + make_interval(secs => (0.5 + power(random(), 2) * 70) * 3600));
      end if;

      if v_approved is null then
        v_status := case when v_casting.status = 'open' and random() < 0.75 then 'awaiting_talent' else 'declined' end;
      elsif v_casting.status = 'open' and v_casting.created_at > now() - interval '5 days' then
        v_status := (array['approved', 'queued', 'submitted'])[1 + floor(random() * 3)::int]::public.application_status;
      elsif random() < 0.08 + v_cand.score / 260.0 then
        v_status := case when random() < 0.48 then 'booked' else 'callback' end;
        if v_casting.status = 'closed' and v_status = 'callback' then
          v_status := case when random() < 0.5 then 'booked' else 'passed' end;
        end if;
      else
        v_status := case when v_casting.status = 'closed' then 'passed' else 'submitted' end;
      end if;

      insert into public.applications (casting_id, talent_id, status, approved_at, created_at, updated_at)
      values (v_casting.id, v_cand.talent_id, v_status, v_approved, v_app_created,
              case when v_status in ('booked', 'passed', 'callback')
                   then least(now() - interval '1 minute', v_app_created + make_interval(days => 3 + floor(random() * 12)::int))
                   else coalesce(v_approved, v_app_created) end)
      on conflict do nothing;
    end loop;
  end loop;

  -- Demo talent: a few fresh proposals waiting for approval
  insert into public.applications (casting_id, talent_id, status, created_at, updated_at)
  select c.id, '00000000-0000-4000-a000-000000000003', 'awaiting_talent', now() - interval '6 hours', now() - interval '6 hours'
  from public.castings c
  where c.status = 'open' and c.category in ('commercial', 'supporting', 'voice')
    and (private.match_score((select t from public.talents t where t.id = '00000000-0000-4000-a000-000000000003'), c) ->> 'eligible')::boolean
  order by c.created_at desc limit 3
  on conflict do nothing;

end
$seed$;

-- ---------------------------------------------------------------------------
do $seed$
declare
  demo_password text := coalesce(current_setting('agental.demo_password', true), 'agental-demo-2026');

  first_f text[] := array['Amina','Sofia','Maya','Chloe','Lea','Camila','Aaliyah','Grace','Mei','Hana','Isabella',
                          'Zoe','Nadia','Priya','Emma','Lucia','Jade','Valentina','Sarah','Yasmin','Olivia','Ines'];
  first_m text[] := array['Lucas','Sofiane','Mateo','Ethan','Noah','Hugo','Diego','Kenji','Omar','Julien','Marcus',
                          'Leo','Daniel','Adrian','Samuel','Wei','Theo','Gabriel','Andre','Malik','Jonah','Rafael'];
  last_n  text[] := array['Martin','Garcia','Nguyen','Kim','Johnson','Lopez','Chen','Dubois','Rossi','Okafor','Silva',
                          'Haddad','Park','Brown','Moreau','Ramirez','Lee','Bernard','Patel','Wright','Torres','Li'];
  skills_all text[] := array['driving','dance','singing','swimming','horse riding','stage combat','martial arts',
                             'skateboarding','guitar','piano','cooking','basketball','yoga','improv','accents',
                             'juggling','modeling','hosting','stunts','voice acting'];
  companies text[] := array['Northlight Casting','Sunset Boulevard Pictures','Harbor & Pine Studios','Lumen Ads',
                            'Echo Park Films','Westside Commercials','Golden Hour Media','Cinder Street Casting',
                            'Blue Lantern Productions','Atelier Paris Casting','Vertical Shorts Co.','Mesa Creative',
                            'USC School of Cinematic Arts (student)','Studio Kite','Brightline Voice'];

  i int; k int; n int;
  v_id uuid; v_created timestamptz; v_meta jsonb; v_session text;
  v_name text; v_first text; v_gender text; v_city text; v_country text; v_src text;
  v_cats text[]; v_langs text[]; v_skills text[];
  v_step int; v_mandated boolean; v_act numeric; v_r numeric;
  v_casting public.castings; v_cand record;
  v_status public.application_status; v_approved timestamptz; v_app_created timestamptz;
  v_cat public.casting_category; v_dir uuid; v_deadline date;
  v_topic text; v_nps int; v_pmf text; v_comment text;
  v_days int; v_sessions int; v_dev text; v_path text;
  admin_id uuid := '00000000-0000-4000-a000-000000000001';
  director_id uuid := '00000000-0000-4000-a000-000000000002';
  talent_id uuid := '00000000-0000-4000-a000-000000000003';
begin
  perform setseed(0.3939);

  -- ---------------------------------------------------------------------------
  -- 8. Product analytics events
  -- ---------------------------------------------------------------------------
  -- 8a. Anonymous traffic
  for v_days in 0..119 loop
    v_sessions := greatest(5, (22 + 150 * power(1 - v_days / 120.0, 1.4) + (random() - 0.5) * 30
                              + case when extract(isodow from current_date - v_days) in (6, 7) then -12 else 0 end)::int);
    insert into public.events (session_id, name, path, props, utm_source, utm_medium, device, created_at)
    select s.sid, e.name, e.path, e.props, s.src,
           case when s.src in ('instagram','tiktok') then 'social' when s.src = 'google' then 'cpc' end,
           s.dev, s.t0 + make_interval(secs => e.ord * (20 + random() * 90))
    from (
      select 'seed-' || substr(md5(random()::text || g::text), 1, 20) as sid,
             (current_date - v_days)::timestamptz + make_interval(secs => random() * 86399) as t0,
             case when r1 < 0.30 then null when r1 < 0.52 then 'instagram' when r1 < 0.72 then 'tiktok'
                  when r1 < 0.87 then 'google' when r1 < 0.95 then 'referral' when r1 < 0.98 then 'usc_student_films'
                  else 'linkedin' end as src,
             case when r2 < 0.62 then 'mobile' when r2 < 0.95 then 'desktop' else 'tablet' end as dev,
             1 + floor(random() * 4)::int as pages
      from generate_series(1, v_sessions) g, lateral (select random() + 0 * g as r1, random() + 0 * g as r2) rr
    ) s
    cross join lateral (
      select p.ord, 'page_view' as name,
             (array['/', '/', '/', '/castings', '/how-it-works', '/pricing', '/faq', '/directors',
                    '/castings/commercials', '/castings/voice-dubbing', '/about', '/join'])[1 + floor(random() * 12)::int] as path,
             '{}'::jsonb as props
      from generate_series(0, s.pages - 1) p(ord)
      union all
      select s.pages, 'signup_started', '/join', '{}'::jsonb where random() < 0.11
      union all
      select s.pages + 1, 'plan_interest', '/pricing',
             jsonb_build_object('tier', (array['free','free','pro','pro','premium','ultimate'])[1 + floor(random() * 6)::int])
      where random() < 0.05
      union all
      select s.pages + 2, 'cta_click', '/', jsonb_build_object('cta', 'become_member') where random() < 0.15
    ) e
    where s.t0 + make_interval(secs => e.ord * 110) < now();
  end loop;

  -- 8b. Pre-sign-up sessions of talents (stitched by session_id)
  insert into public.events (session_id, name, path, utm_source, device, created_at)
  select tp.session, x.name, x.path, tp.src, case when random() < 0.65 then 'mobile' else 'desktop' end,
         tp.created_at - make_interval(secs => x.back)
  from (select t.id, t.created_at, t.utm_source as src, e.session_id as session
        from public.talents t join public.events e on e.user_id = t.id and e.name = 'sign_up') tp
  cross join (values ('page_view', '/', 600), ('page_view', '/how-it-works', 420),
                     ('page_view', '/join', 240), ('signup_started', '/join', 230)) x(name, path, back);

  -- 8c. Signed-in activity for retention cohorts
  insert into public.events (session_id, user_id, name, path, device, created_at)
  select 'seed-u-' || substr(md5(tp.id::text || w::text), 1, 16), tp.id, 'page_view',
         (array['/app', '/app/castings', '/app/profile', '/app'])[1 + floor(random() * 4)::int],
         'mobile', tp.created_at + make_interval(days => w * 7)
                   + random() * least(interval '6 days', now() - (tp.created_at + make_interval(days => w * 7)))
  from (select t.id, t.created_at, t.mandate_signed_at is not null as mandated from public.talents t) tp
  cross join generate_series(0, 16) w
  where tp.created_at + make_interval(days => w * 7) < now()
    and random() < (case when tp.mandated then 0.80 else 0.30 end) * power(case when tp.mandated then 0.93 else 0.70 end, w);

  -- ---------------------------------------------------------------------------
  -- 9. Feedback (NPS + Sean Ellis PMF), varying by topic
  -- ---------------------------------------------------------------------------
  for v_cand in
    select t.id as talent_id, t.mandate_signed_at from public.talents t
    where t.mandate_signed_at is not null and random() < 0.55
  loop
    v_r := random();
    v_topic := case when v_r < 0.26 then 'matching' when v_r < 0.44 then 'castings' when v_r < 0.58 then 'self_tape'
                    when v_r < 0.72 then 'onboarding' when v_r < 0.84 then 'pricing' when v_r < 0.92 then 'payments' else 'other' end;
    v_nps := greatest(0, least(10, round(
               (case v_topic when 'matching' then 8.4 when 'castings' then 7.7 when 'self_tape' then 8.1
                             when 'onboarding' then 5.9 when 'pricing' then 6.3 when 'payments' then 6.8 else 7.4 end)
               + (random() + random() + random() - 1.5) * 3.2)::int));
    v_pmf := case when v_nps >= 9 then (case when random() < 0.75 then 'very' else 'somewhat' end)
                  when v_nps >= 7 then (case when random() < 0.35 then 'very' when random() < 0.8 then 'somewhat' else 'not' end)
                  else (case when random() < 0.08 then 'very' when random() < 0.55 then 'somewhat' else 'not' end) end;
    v_comment := case when random() < 0.45 then null else
      case v_topic
        when 'matching' then (array['The roles I get actually fit me. Huge difference from scrolling listings.',
                                    'Matches are good but I would love to see why I was not picked.',
                                    'Got two commercials in a month. The explanations on each match help.'])[1 + floor(random() * 3)::int]
        when 'castings' then (array['More castings outside LA please.', 'Want more voice work listings.',
                                    'Deadlines are sometimes too short to prepare a self-tape.'])[1 + floor(random() * 3)::int]
        when 'self_tape' then (array['Framing tips saved my audition.', 'Studio works on my old phone, nice.',
                                     'Would like feedback on accents.'])[1 + floor(random() * 3)::int]
        when 'onboarding' then (array['Uploading headshots on mobile kept failing.',
                                      'Too many fields at once, I gave up the first time.',
                                      'Did not understand what the mandate meant until I read the FAQ.'])[1 + floor(random() * 3)::int]
        when 'pricing' then (array['Not sure the paid plans are worth it yet.', 'Love that representation is free.',
                                   'Commission going down is a good idea but explain it better.'])[1 + floor(random() * 3)::int]
        when 'payments' then (array['When do I get paid after a booking?', 'Need invoices for my taxes.'])[1 + floor(random() * 2)::int]
        else 'Keep going, this is what I needed.' end end;
    insert into public.feedback (profile_id, nps, pmf, topic, comment, created_at)
    values (v_cand.talent_id, v_nps, v_pmf, v_topic, v_comment,
            least(now() - interval '1 hour', v_cand.mandate_signed_at + make_interval(secs => random() * 30 * 86400)));
  end loop;

  -- ---------------------------------------------------------------------------
  -- 10. Back-filled daily KPI snapshots (pg_cron keeps them going from today)
  -- ---------------------------------------------------------------------------
  insert into public.kpi_snapshots (day, talents_total, talents_active, directors_total, castings_open, applications_open)
  select d::date,
         (select count(*) from public.talents where created_at < d + interval '1 day'),
         (select count(*) from public.talents where mandate_signed_at < d + interval '1 day'),
         (select count(*) from public.casting_directors where created_at < d + interval '1 day'),
         (select count(*) from public.castings where created_at < d + interval '1 day' and deadline >= d::date),
         (select count(*) from public.applications where created_at < d + interval '1 day'
            and (status in ('awaiting_talent', 'approved', 'queued', 'submitted') or updated_at >= d))
  from generate_series(current_date - 119, current_date, interval '1 day') d
  on conflict (day) do nothing;

end
$seed$;
