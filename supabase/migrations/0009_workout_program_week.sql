-- =====================================================================
-- Stax — Migration 0009: track which program week a workout counts toward
-- =====================================================================
-- Snapshot of programs.current_week at the moment a session starts. Lets us
-- count completed days within a week to auto-advance (and trigger deload).
-- Additive and safe to re-run.
-- =====================================================================

alter table public.workouts
  add column if not exists program_week int;

create index if not exists workouts_program_week_idx
  on public.workouts(program_id, program_week);
