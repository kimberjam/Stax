-- =====================================================================
-- Stax — Migration 0002: grant table privileges to authenticated role
-- =====================================================================
-- Supabase's default privileges didn't apply to the tables created in
-- migration 0001, so authenticated users hit "permission denied" before
-- RLS policies could even evaluate. This grants the base privileges
-- and sets defaults so any future tables in Phase 2+ are covered too.
-- =====================================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on all tables in schema public
  to authenticated;

-- Apply the same grants automatically to any tables we add later.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
