# Stax

Private, invite-only AI hypertrophy coaching for family and friends.

> **Status:** Phases 0–4 are built and deployed: auth, onboarding, exercise
> library, AI program generation, and workout logging with a progress
> dashboard. Not built yet: coach chat and automatic weekly progression
> (see [Roadmap](#roadmap)).

## What it does

- **Invite-only access.** No public sign-up. An admin sends invites; people
  join through the invite link. Roles are `admin`, `coach`, and `user`.
- **Onboarding wizard.** Profile, goal, schedule, equipment, and rep-range
  preferences feed the program builder.
- **Exercise library.** 96 seeded exercises, plus custom exercises you can
  keep private or share.
- **Program generation.** Builds a weekly split from your goal, days per week,
  session length, equipment, and muscle emphasis. Claude picks exercises from
  your library and prescribes sets, rep ranges, and RIR. If the AI step is
  unavailable or returns something unusable, Stax falls back to a
  deterministic template program and tells you (a notice on the program page,
  and the reason in the server logs).
- **Workout logging.** Start a session from any program day, log weight and
  reps per set, swap exercises for a session, and see a running session timer.
  Suggested weights follow double progression, with a lighter recovery week
  every sixth week.
- **History and progress.** Past workouts with detail views and a
  bodyweight-friendly progress dashboard.
- **Installable.** PWA manifest and icons for adding to a phone home screen.

## Stack

- Next.js 16 (App Router, Turbopack), React 18, TypeScript
- Tailwind CSS with Stax brand tokens
- Supabase: Postgres, Auth, and Row-Level Security (`@supabase/ssr`)
- Anthropic Claude API for program generation (default model
  `claude-sonnet-4-6`; override with `ANTHROPIC_MODEL`)
- Vercel hosting

## Project layout

```
stax/
├── public/                  Logo, PWA icons, manifest
├── src/
│   ├── app/                 Next.js App Router
│   │   ├── login, forgot-password, reset-password, accept-invite
│   │   ├── auth/            callback, confirm, sign-out routes
│   │   ├── admin/invites    Send and manage invites (admins)
│   │   ├── onboarding       First-run wizard
│   │   ├── exercises        Library + custom exercises
│   │   ├── program          Generated weekly program
│   │   ├── workout/[id]     Live session logging
│   │   ├── workouts         History and workout detail
│   │   └── progress         Progress dashboard
│   ├── components/          Shared UI (logo)
│   ├── lib/
│   │   ├── ai/              Anthropic client + model setting
│   │   ├── auth/            Admin guard
│   │   ├── programs/        Templates, generation, progression math
│   │   └── supabase/        Browser, server, and service-role clients
│   └── middleware.ts        Refreshes the Supabase session on each request
├── supabase/migrations/     0001–0010 (see below)
├── .env.example
└── SETUP.md                 One-time setup walkthrough
```

## Database migrations

Run these in order in the Supabase SQL editor (or with the Supabase CLI).

| Migration | Adds |
| --- | --- |
| `0001_init_auth_roles` | Users, roles, profiles, equipment, preferences, invites, audit log, RLS |
| `0002_grant_table_privileges` | Table privileges for the `authenticated` role |
| `0003_onboarding_fields` | Onboarding columns |
| `0004_exercise_library` | `exercises` table and RLS |
| `0005_seed_exercises` | The 96-exercise shared library |
| `0006_programs` | `programs`, `program_days`, `program_exercises` |
| `0007_grant_program_tables` | Privileges for program tables |
| `0008_workouts` | `workouts` and `workout_sets` |
| `0009_workout_program_week` | Which program week a workout counts toward |
| `0010_workout_set_notes` | Per-set notes |

## Environment variables

Copy `.env.example` to `.env.local` for local work, and set the same values in
Vercel (Production and Preview).

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Never expose to the browser |
| `ANTHROPIC_API_KEY` | Claude API key. Without it, programs use the template |
| `ANTHROPIC_MODEL` | Optional model override |
| `NEXT_PUBLIC_SITE_URL` | Absolute URL used in emails and redirects |

## Day-to-day

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run lint
npm run build
```

Hosting note: on Supabase's free tier a project pauses after about a week of
inactivity. If the app suddenly fails to sign anyone in, check the project
status in the Supabase dashboard and restore it.

See `SETUP.md` for first-time account, database, and deployment setup.

## Roadmap

- Coach features and chat (invites can assign the `coach` role and a
  `coach_assignments` table exists, but there is no coach-facing UI yet)
- Automatic weekly progression (suggested weights are computed when a workout
  starts; there is no scheduled job)
