-- =====================================================================
-- Stax — Migration 0008: workout logging
-- =====================================================================
-- A workout is one logged training session for a program day. workout_sets
-- record what was actually lifted (weight + reps) per set, plus a snapshot
-- of the prescribed targets. One in-progress workout is resumable.
-- =====================================================================

-- --- workouts --------------------------------------------------------
create table if not exists public.workouts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.app_users(id) on delete cascade,
  program_id      uuid references public.programs(id) on delete set null,
  program_day_id  uuid references public.program_days(id) on delete set null,
  label           text not null,                 -- snapshot of the day label
  status          text not null default 'in_progress'
                    check (status in ('in_progress','completed','abandoned')),
  unit            text not null default 'imperial'
                    check (unit in ('imperial','metric')),
  notes           text,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists workouts_user_idx   on public.workouts(user_id);
create index if not exists workouts_status_idx  on public.workouts(user_id, status);

drop trigger if exists workouts_set_updated_at on public.workouts;
create trigger workouts_set_updated_at
before update on public.workouts
for each row execute function public.set_updated_at();

-- --- workout_sets ----------------------------------------------------
create table if not exists public.workout_sets (
  id                  uuid primary key default uuid_generate_v4(),
  workout_id          uuid not null references public.workouts(id) on delete cascade,
  exercise_id         uuid not null references public.exercises(id) on delete restrict,
  program_exercise_id uuid references public.program_exercises(id) on delete set null,
  position            int not null default 0,    -- exercise order within the day
  set_index           int not null default 1,    -- set number within the exercise
  target_rep_low      int,
  target_rep_high     int,
  target_rir          int,
  weight              numeric(6,2),              -- in the parent workout's unit
  reps                int,
  done                boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists workout_sets_workout_idx on public.workout_sets(workout_id);
create index if not exists workout_sets_exercise_idx on public.workout_sets(exercise_id);

drop trigger if exists workout_sets_set_updated_at on public.workout_sets;
create trigger workout_sets_set_updated_at
before update on public.workout_sets
for each row execute function public.set_updated_at();

-- =====================================================================
-- Ownership helpers
-- =====================================================================
create or replace function public.can_read_workout(wid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workouts w
    where w.id = wid
      and (w.user_id = uid or public.is_admin(uid) or public.is_my_coachee(w.user_id, uid))
  );
$$;

create or replace function public.can_write_workout(wid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workouts w
    where w.id = wid and (w.user_id = uid or public.is_admin(uid))
  );
$$;

-- =====================================================================
-- Privileges + RLS
-- =====================================================================
grant select, insert, update, delete on public.workouts     to authenticated, service_role;
grant select, insert, update, delete on public.workout_sets to authenticated, service_role;

alter table public.workouts     enable row level security;
alter table public.workout_sets enable row level security;

-- workouts
drop policy if exists workouts_select on public.workouts;
create policy workouts_select on public.workouts for select
  using (user_id = auth.uid() or public.is_admin() or public.is_my_coachee(user_id));

drop policy if exists workouts_modify_self on public.workouts;
create policy workouts_modify_self on public.workouts for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- workout_sets
drop policy if exists workout_sets_select on public.workout_sets;
create policy workout_sets_select on public.workout_sets for select
  using (public.can_read_workout(workout_id));

drop policy if exists workout_sets_modify on public.workout_sets;
create policy workout_sets_modify on public.workout_sets for all
  using (public.can_write_workout(workout_id))
  with check (public.can_write_workout(workout_id));
