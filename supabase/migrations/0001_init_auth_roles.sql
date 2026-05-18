-- =====================================================================
-- Stax — Migration 0001: auth, roles, and core user-scoped tables
-- =====================================================================
-- Run from the Supabase SQL editor, or via `supabase db push` once the
-- CLI is configured. Idempotent within reason — drop/recreate is fine
-- for early development but should be replaced with proper migrations
-- once we have real user data.
-- =====================================================================

-- --- Extensions ------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- --- Enums -----------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'coach', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.experience_level as enum ('beginner', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.training_goal as enum (
    'hypertrophy', 'strength', 'fat_loss', 'recomposition', 'general_fitness'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.units_pref as enum ('metric', 'imperial');
exception when duplicate_object then null; end $$;

-- --- Helper: updated_at trigger -------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- --- 1. app_users: one row per auth.users row -----------------------
create table if not exists public.app_users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  avatar_url   text,
  role         public.user_role not null default 'user',
  time_zone    text not null default 'America/Los_Angeles',
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists app_users_set_updated_at on public.app_users;
create trigger app_users_set_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

-- Auto-create an app_users row whenever a new auth user signs up.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- --- 2. profiles -----------------------------------------------------
create table if not exists public.profiles (
  user_id           uuid primary key references public.app_users(id) on delete cascade,
  sex               text check (sex in ('male', 'female', 'other', 'prefer_not_to_say')),
  birth_date        date,
  height_cm         numeric(5,1),
  starting_weight_kg numeric(5,1),
  experience_level  public.experience_level,
  preferred_units   public.units_pref not null default 'imperial',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- --- 3. user_equipment ----------------------------------------------
create table if not exists public.user_equipment (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.app_users(id) on delete cascade,
  category    text not null,             -- e.g., 'smith_machine', 'cables', 'plates'
  item_name   text not null,             -- e.g., 'Mikolo M4 2.0'
  attributes  jsonb not null default '{}'::jsonb,
  source      text not null default 'preset' check (source in ('preset','custom_ai_parsed','custom_freetext')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists user_equipment_user_id_idx on public.user_equipment(user_id);

drop trigger if exists user_equipment_set_updated_at on public.user_equipment;
create trigger user_equipment_set_updated_at
before update on public.user_equipment
for each row execute function public.set_updated_at();

-- --- 4. user_preferences --------------------------------------------
create table if not exists public.user_preferences (
  user_id            uuid primary key references public.app_users(id) on delete cascade,
  goal               public.training_goal not null default 'hypertrophy',
  days_per_week      int  not null default 4 check (days_per_week between 1 and 7),
  session_minutes    int  not null default 60 check (session_minutes between 15 and 180),
  preferred_split    text,
  favorite_muscles   text[] not null default '{}',
  avoided_exercises  text[] not null default '{}',
  notes              text,
  week_start_dow     int  not null default 1 check (week_start_dow between 0 and 6),  -- 1 = Mon
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

-- --- 5. coach_assignments (many-to-many) ----------------------------
create table if not exists public.coach_assignments (
  id            uuid primary key default uuid_generate_v4(),
  coach_user_id uuid not null references public.app_users(id) on delete cascade,
  user_id       uuid not null references public.app_users(id) on delete cascade,
  status        text not null default 'active' check (status in ('active','removed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (coach_user_id, user_id)
);
create index if not exists coach_assignments_user_idx on public.coach_assignments(user_id);
create index if not exists coach_assignments_coach_idx on public.coach_assignments(coach_user_id);

drop trigger if exists coach_assignments_set_updated_at on public.coach_assignments;
create trigger coach_assignments_set_updated_at
before update on public.coach_assignments
for each row execute function public.set_updated_at();

-- --- 6. invites ------------------------------------------------------
create table if not exists public.invites (
  id          uuid primary key default uuid_generate_v4(),
  email       text not null,
  role        public.user_role not null default 'user',
  invited_by  uuid not null references public.app_users(id) on delete set null,
  token_hash  text not null unique,      -- store hashed; raw token only in the email
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists invites_email_idx on public.invites(email);

-- --- 7. audit_log ----------------------------------------------------
create table if not exists public.audit_log (
  id              uuid primary key default uuid_generate_v4(),
  actor_id        uuid references public.app_users(id) on delete set null,
  action          text not null,         -- e.g., 'invite_sent', 'role_changed', 'view_as'
  target_user_id  uuid references public.app_users(id) on delete set null,
  payload         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists audit_log_target_idx on public.audit_log(target_user_id);
create index if not exists audit_log_actor_idx on public.audit_log(actor_id);

-- =====================================================================
-- Helper functions used by RLS
-- =====================================================================

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.app_users where id = uid and role = 'admin');
$$;

create or replace function public.is_my_coachee(target_user_id uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.coach_assignments
    where coach_user_id = uid
      and user_id = target_user_id
      and status = 'active'
  );
$$;

-- =====================================================================
-- Row-Level Security
-- =====================================================================
-- Pattern:
--   - Owner can always read/write their own row.
--   - Admins can do anything.
--   - Coaches can READ their assigned users' rows (no write, except notes
--     and suggestions, which live in their own tables — added later).

alter table public.app_users         enable row level security;
alter table public.profiles          enable row level security;
alter table public.user_equipment    enable row level security;
alter table public.user_preferences  enable row level security;
alter table public.coach_assignments enable row level security;
alter table public.invites           enable row level security;
alter table public.audit_log         enable row level security;

-- app_users -----------------------------------------------------------
drop policy if exists app_users_select on public.app_users;
create policy app_users_select on public.app_users for select
  using (
    id = auth.uid()
    or public.is_admin()
    or public.is_my_coachee(id)
  );

drop policy if exists app_users_update_self on public.app_users;
create policy app_users_update_self on public.app_users for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- No public insert/delete — handled by trigger or admin server actions.

-- profiles ------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (user_id = auth.uid() or public.is_admin() or public.is_my_coachee(user_id));

drop policy if exists profiles_modify_self on public.profiles;
create policy profiles_modify_self on public.profiles for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- user_equipment ------------------------------------------------------
drop policy if exists user_equipment_select on public.user_equipment;
create policy user_equipment_select on public.user_equipment for select
  using (user_id = auth.uid() or public.is_admin() or public.is_my_coachee(user_id));

drop policy if exists user_equipment_modify_self on public.user_equipment;
create policy user_equipment_modify_self on public.user_equipment for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- user_preferences ----------------------------------------------------
drop policy if exists user_preferences_select on public.user_preferences;
create policy user_preferences_select on public.user_preferences for select
  using (user_id = auth.uid() or public.is_admin() or public.is_my_coachee(user_id));

drop policy if exists user_preferences_modify_self on public.user_preferences;
create policy user_preferences_modify_self on public.user_preferences for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- coach_assignments ---------------------------------------------------
drop policy if exists coach_assignments_select on public.coach_assignments;
create policy coach_assignments_select on public.coach_assignments for select
  using (
    coach_user_id = auth.uid()
    or user_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists coach_assignments_admin_write on public.coach_assignments;
create policy coach_assignments_admin_write on public.coach_assignments for all
  using (public.is_admin())
  with check (public.is_admin());

-- invites -------------------------------------------------------------
drop policy if exists invites_admin_all on public.invites;
create policy invites_admin_all on public.invites for all
  using (public.is_admin())
  with check (public.is_admin());

-- audit_log -----------------------------------------------------------
drop policy if exists audit_log_admin_select on public.audit_log;
create policy audit_log_admin_select on public.audit_log for select
  using (public.is_admin());
-- Writes happen via service-role server actions only; no client policy.

-- =====================================================================
-- Convenience: bootstrap your own admin account
-- =====================================================================
-- After signing up with your email through the auth flow (or via Supabase
-- Studio → Auth), run this once to promote yourself to admin:
--
--   update public.app_users
--   set role = 'admin', display_name = 'Kim'
--   where email = 'kimberjam@gmail.com';
--
-- Do NOT leave this hard-coded in a migration.
