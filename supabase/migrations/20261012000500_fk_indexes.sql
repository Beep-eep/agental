-- =============================================================================
-- Agental · 0005 · Cover remaining foreign keys (Supabase performance advisor)
-- =============================================================================
create index if not exists feedback_profile_idx on public.feedback (profile_id);
create index if not exists leads_profile_idx on public.leads (profile_id) where profile_id is not null;
create index if not exists talents_plan_idx on public.talents (plan);
