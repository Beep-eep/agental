-- =============================================================================
-- Agental · 0006 · Casting pipeline for directors
-- Directors can't read the talents table (privacy), so they see their casting's
-- applicants through this function: only the shareable fields, and declined
-- talents stay anonymous.
-- =============================================================================
create or replace function public.casting_pipeline(p_casting_id uuid)
returns table (
  application_id uuid, status public.application_status, display_name text, city text,
  languages text[], skills text[], score numeric, reasons jsonb, approved_at timestamptz, updated_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (private.is_admin() or private.owns_casting(p_casting_id)) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  return query
  select a.id, a.status,
         case when a.status = 'declined' then null
              else coalesce(t.stage_name, split_part(p.full_name, ' ', 1)) end,
         case when a.status = 'declined' then null else t.city end,
         case when a.status = 'declined' then null else t.languages end,
         case when a.status = 'declined' then null else t.skills end,
         a.match_score, a.match_reasons, a.approved_at, a.updated_at
  from public.applications a
  join public.talents t on t.id = a.talent_id
  join public.profiles p on p.id = t.id
  where a.casting_id = p_casting_id
  order by case a.status when 'booked' then 0 when 'callback' then 1 when 'submitted' then 2 when 'queued' then 3
                         when 'approved' then 4 when 'awaiting_talent' then 5 when 'proposed' then 6 else 7 end,
           a.match_score desc nulls last;
end $$;

revoke execute on function public.casting_pipeline(uuid) from public, anon;
grant execute on function public.casting_pipeline(uuid) to authenticated;
