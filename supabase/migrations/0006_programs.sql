-- =====================================================================
-- Stax — Migration 0006: training programs
-- =====================================================================
-- A program is a person's current weekly split. It repeats week to week;
-- every Nth week (default 6) is a recovery/deload week. Exercises are
-- prescribed as sets x rep-range @ RIR. One active program per user.
-- =====================================================================

-- --- programs --------------------------------------------------------
create table if not exists public.programs (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.app_users(id) on delete cascade,
  name            text not null,
  goal            public.training_goal not null default 'hypertrophy',
  split_name      text not null,                  -- e.g. 'Upper / Lower'
  days_per_week   int  not null check (days_per_week between 1 and 7),
  session_minutes int  not null default 60,
  deload_interval int  not null default 6,        -- recovery week every Nth week
  current_week    int  not null default 1,
  status          text not null default 'active' check (status in ('active','archived')),
  generated_by    text not null default 'ai' check (generated_by in ('ai','template')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists programs_user_idx on public.programs(user_id);
-- at most one active program per user
create unique index if not exists programs_one_active_per_user
  on public.programs(user_id) where status = 'active';

drop trigger if exists programs_set_updated_at on public.programs;
create trigger programs_set_updated_at
before update on public.programs
for each row execute function public.set_updated_at();

-- --- program_days ----------------------------------------------------
create table if not exists public.program_days (
  id          uuid primary key default uuid_generate_v4(),
  program_id  uuid not null references public.programs(id) on delete cascade,
  day_index   int  not null,                      -- 1..N within the week
  label       text not null,                       -- 'Push', 'Upper A', 'Full Body'
  focus       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (program_id, day_index)
);
create index if not exists program_days_program_idx on public.program_days(program_id);

drop trigger if exists program_days_set_updated_at on public.program_days;
create trigger program_days_set_updated_at
before update on public.program_days
for each row execute function public.set_updated_at();

-- --- program_exercises ----------------------------------------------
create table if not exists public.program_exercises (
  id              uuid primary key default uuid_generate_v4(),
  program_day_id  uuid not null references public.program_days(id) on delete cascade,
  exercise_id     uuid not null references public.exercises(id) on delete restrict,
  position        int  not null default 0,
  sets            int  not null default 3 check (sets between 1 and 10),
  rep_low         int  not null default 8 check (rep_low between 1 and 50),
  rep_high        int  not null default 12 check (rep_high between 1 and 50),
  rir             int  not null default 2 check (rir between 0 and 6),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists program_exercises_day_idx on public.program_exercises(program_day_id);

drop trigger if exists program_exercises_set_updated_at on public.program_exercises;
create trigger program_exercises_set_updated_at
before update on public.program_exercises
for each row execute function public.set_updated_at();

-- =====================================================================
-- Ownership helpers (SECURITY DEFINER so RLS subqueries stay simple)
-- =====================================================================
create or replace function public.can_read_program(pid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.programs p
    where p.id = pid
      and (p.user_id = uid or public.is_admin(uid) or public.is_my_coachee(p.user_id, uid))
  );
$$;

create or replace function public.can_write_program(pid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.programs p
    where p.id = pid and (p.user_id = uid or public.is_admin(uid))
  );
$$;

create or replace function public.program_of_day(did uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select program_id from public.program_days where id = did;
$$;

-- =====================================================================
-- Privileges + RLS
-- =====================================================================
grant select, insert, update, delete on public.programs          to authenticated;
grant select, insert, update, delete on public.program_days      to authenticated;
grant select, insert, update, delete on public.program_exercises to authenticated;

alter table public.programs          enable row level security;
alter table public.program_days      enable row level security;
alter table public.program_exercises enable row level security;

-- programs
drop policy if exists programs_select on public.programs;
create policy programs_select on public.programs for select
  using (user_id = auth.uid() or public.is_admin() or public.is_my_coachee(user_id));

drop policy if exists programs_modify_self on public.programs;
create policy programs_modify_self on public.programs for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- program_days
drop policy if exists program_days_select on public.program_days;
create policy program_days_select on public.program_days for select
  using (public.can_read_program(program_id));

drop policy if exists program_days_modify on public.program_days;
create policy program_days_modify on public.program_days for all
  using (public.can_write_program(program_id))
  with check (public.can_write_program(program_id));

-- program_exercises
drop policy if exists program_exercises_select on public.program_exercises;
create policy program_exercises_select on public.program_exercises for select
  using (public.can_read_program(public.program_of_day(program_day_id)));

drop policy if exists program_exercises_modify on public.program_exercises;
create policy program_exercises_modify on public.program_exercises for all
  using (public.can_write_program(public.program_of_day(program_day_id)))
  with check (public.can_write_program(public.program_of_day(program_day_id)));
