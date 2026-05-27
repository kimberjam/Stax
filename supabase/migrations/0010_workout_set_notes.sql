-- =====================================================================
-- Stax — Migration 0010: per-set notes on workout_sets
-- =====================================================================
-- Progression (Phase 5) writes a short coaching note per exercise onto its
-- sets (e.g. "Up 5 lb — you topped the range last time"). The code expects
-- workout_sets.notes, which was never created — add it. Additive, safe.
-- =====================================================================

alter table public.workout_sets
  add column if not exists notes text;
