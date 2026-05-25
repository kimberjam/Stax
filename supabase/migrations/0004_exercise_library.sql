-- =====================================================================
-- Stax — Migration 0004: exercise library
-- =====================================================================
-- A shared, seeded catalog of exercises (owner_id IS NULL) plus
-- per-user custom exercises (owner_id = the user). Everything the AI
-- program generator and workout logger will draw from later.
-- =====================================================================

-- --- Enums -----------------------------------------------------------
do $$ begin
  create type public.exercise_mechanic as enum ('compound', 'isolation');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.movement_pattern as enum (
    'push', 'pull', 'squat', 'hinge', 'lunge', 'carry', 'core', 'other'
  );
exception when duplicate_object then null; end $$;

-- --- Table -----------------------------------------------------------
create table if not exists public.exercises (
  id                uuid primary key default uuid_generate_v4(),
  slug              text not null unique,
  owner_id          uuid references public.app_users(id) on delete cascade, -- NULL = shared library
  name              text not null,
  primary_muscle    text not null,
  secondary_muscles text[] not null default '{}',
  equipment         text[] not null default '{}',   -- required equipment categories; empty = bodyweight
  mechanic          public.exercise_mechanic not null default 'compound',
  pattern           public.movement_pattern  not null default 'other',
  is_unilateral     boolean not null default false,
  cue               text,
  created_by        uuid references public.app_users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists exercises_owner_idx          on public.exercises(owner_id);
create index if not exists exercises_primary_muscle_idx on public.exercises(primary_muscle);
create index if not exists exercises_equipment_gin      on public.exercises using gin (equipment);

drop trigger if exists exercises_set_updated_at on public.exercises;
create trigger exercises_set_updated_at
before update on public.exercises
for each row execute function public.set_updated_at();

-- --- Privileges (RLS still gates rows; this gates the table) ---------
grant select, insert, update, delete on public.exercises to authenticated;

-- --- Row-Level Security ----------------------------------------------
alter table public.exercises enable row level security;

-- Read: the shared library, your own custom moves, your coachees' moves,
-- and everything if you're an admin.
drop policy if exists exercises_select on public.exercises;
create policy exercises_select on public.exercises for select
  using (
    owner_id is null
    or owner_id = auth.uid()
    or public.is_admin()
    or public.is_my_coachee(owner_id)
  );

-- A user may add their own custom exercises.
drop policy if exists exercises_insert_own on public.exercises;
create policy exercises_insert_own on public.exercises for insert
  with check (owner_id = auth.uid());

-- Admins may add to the shared library (owner_id IS NULL).
drop policy if exists exercises_insert_shared on public.exercises;
create policy exercises_insert_shared on public.exercises for insert
  with check (owner_id is null and public.is_admin());

-- Owners edit their own; admins edit anything (including shared).
drop policy if exists exercises_update on public.exercises;
create policy exercises_update on public.exercises for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists exercises_delete on public.exercises;
create policy exercises_delete on public.exercises for delete
  using (owner_id = auth.uid() or public.is_admin());
