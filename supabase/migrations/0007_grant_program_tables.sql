-- =====================================================================
-- Stax — Migration 0007: grant program tables to all server roles
-- =====================================================================
-- Migration 0006 granted the program tables to `authenticated` (so the
-- app can read them), but the server-side service_role — which writes the
-- generated program — was never granted access, causing
-- "permission denied for table programs" on generation.
--
-- This grants both roles, and sets default privileges so any FUTURE table
-- we create is covered automatically (prevents this from recurring).
-- Idempotent and safe to re-run.
-- =====================================================================

grant select, insert, update, delete on public.programs          to authenticated, service_role;
grant select, insert, update, delete on public.program_days      to authenticated, service_role;
grant select, insert, update, delete on public.program_exercises to authenticated, service_role;

-- Belt-and-suspenders: any new public table created from here on
-- auto-grants to these roles.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
