-- =====================================================================
-- Stax — Migration 0003: onboarding fields
-- =====================================================================
-- Additive only. Safe to re-run (ADD COLUMN IF NOT EXISTS).
-- Adds the handful of fields the first-time onboarding wizard introduces
-- on top of the core tables from migration 0001.
-- =====================================================================

-- Mark when a user finished the onboarding wizard.
-- NULL = not yet onboarded. Non-admins are gated into /onboarding until set.
alter table public.app_users
  add column if not exists onboarded_at timestamptz;

-- Onboarding answers that don't have a home in the core schema yet.
alter table public.user_preferences
  add column if not exists equipment_profile text,   -- 'full_gym' | 'home_gym' | 'minimal' | 'bodyweight'
  add column if not exists rep_range_pref   text,    -- 'low' | 'moderate' | 'high' | 'mixed'
  add column if not exists training_days    int[] not null default '{}';  -- 0=Sun .. 6=Sat

-- Value validation for these text columns is enforced in the saveOnboarding
-- server action (zod). Enum-backed columns (goal, experience_level,
-- preferred_units) already validate at the DB level.
