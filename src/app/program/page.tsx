import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerClient } from "@/lib/supabase/server";
import { StaxLogo } from "@/components/stax-logo";
import { muscleLabel } from "@/lib/exercises";
import { GenerateButton } from "./generate-button";
import { startWorkout } from "@/app/workout/actions";

export const metadata = { title: "My program — Stax" };
// AI generation can take several seconds; give the server action room.
export const maxDuration = 60;

type ExRow = {
  id: string;
  position: number;
  sets: number;
  rep_low: number;
  rep_high: number;
  rir: number;
  exercises: {
    slug: string;
    name: string;
    primary_muscle: string;
    cue: string | null;
    mechanic: string;
  } | null;
};
type DayRow = {
  id: string;
  day_index: number;
  label: string;
  focus: string | null;
  program_exercises: ExRow[];
};
type ProgramRow = {
  id: string;
  name: string;
  split_name: string;
  goal: string;
  days_per_week: number;
  session_minutes: number;
  deload_interval: number;
  current_week: number;
  generated_by: string;
  program_days: DayRow[];
};

const GOAL_LABELS: Record<string, string> = {
  hypertrophy: "Build muscle",
  strength: "Get stronger",
  fat_loss: "Lose fat",
  recomposition: "Build & lean",
  general_fitness: "General fitness",
};

const primaryBtn =
  "w-full bg-lime text-obsidian font-bold py-3 rounded-xl hover:bg-lime-dark transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait";

export default async function ProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const res = await supabase
    .from("programs")
    .select(
      "id, name, split_name, goal, days_per_week, session_minutes, deload_interval, current_week, generated_by, program_days(id, day_index, label, focus, program_exercises(id, position, sets, rep_low, rep_high, rir, exercises(slug, name, primary_muscle, cue, mechanic)))",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const program = res.data as unknown as ProgramRow | null;

  const { data: inProgress } = await supabase
    .from("workouts")
    .select("id, label")
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen px-5 py-8">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <StaxLogo size={40} />
            <h1 className="text-lg font-bold tracking-wide">My program</h1>
          </div>
          <Link href="/" className="text-sm text-steel hover:text-cream transition">
            Home
          </Link>
        </div>

        {error && !program && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-coral/20 border border-coral/40 text-coral text-sm">
            {decodeURIComponent(error)}
          </div>
        )}

        {inProgress && (
          <Link
            href={`/workout/${inProgress.id}`}
            className="block mb-5 px-4 py-3 rounded-xl bg-lime/10 border border-lime/30 text-lime text-sm font-medium hover:bg-lime/20 transition"
          >
            Resume your {inProgress.label} workout →
          </Link>
        )}

        {!program ? (
          <EmptyState />
        ) : (
          <ProgramView program={program} />
        )}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <section className="bg-slate800 border border-white/5 rounded-2xl p-6 text-center">
      <h2 className="text-xl font-semibold mb-2">No program yet</h2>
      <p className="text-sm text-cream/80 leading-relaxed mb-6">
        Stax will build you a weekly split from your goal, schedule, and
        available equipment — picking exercises from your library and setting
        your reps and effort. It repeats each week, with a lighter recovery
        week every sixth week.
      </p>
      <GenerateButton className={primaryBtn} pendingLabel="Building your program… (~10s)">
        Generate my program
      </GenerateButton>
    </section>
  );
}

function ProgramView({ program }: { program: ProgramRow }) {
  const days = [...(program.program_days ?? [])].sort(
    (a, b) => a.day_index - b.day_index,
  );
  const goalLabel = GOAL_LABELS[program.goal] ?? program.goal;

  return (
    <>
      {/* Summary */}
      <section className="bg-slate800 border border-white/5 rounded-2xl p-5 mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{program.split_name}</h2>
            <p className="text-sm text-steel mt-1">
              {goalLabel} · {program.days_per_week}× / week ·{" "}
              {program.session_minutes} min
            </p>
          </div>
          <span
            className={
              program.generated_by === "ai"
                ? "text-[10px] uppercase tracking-wider text-violet border border-violet/40 rounded px-1.5 py-0.5 shrink-0"
                : "text-[10px] uppercase tracking-wider text-steel border border-white/15 rounded px-1.5 py-0.5 shrink-0"
            }
          >
            {program.generated_by === "ai" ? "AI" : "Template"}
          </span>
        </div>
        {program.current_week >= program.deload_interval ? (
          <p className="text-xs text-amber mt-3">
            Recovery week (week {program.current_week}) — your sessions are
            lighter on purpose this week.
          </p>
        ) : (
          <p className="text-xs text-steel mt-3">
            Week {program.current_week} of {program.deload_interval} · week{" "}
            {program.deload_interval} is a lighter recovery week.
          </p>
        )}
      </section>

      {/* Days */}
      <div className="space-y-4">
        {days.map((day) => {
          const exs = [...(day.program_exercises ?? [])].sort(
            (a, b) => a.position - b.position,
          );
          return (
            <section
              key={day.id}
              className="bg-slate800 border border-white/5 rounded-2xl overflow-hidden"
            >
              <div className="px-5 pt-4 pb-3 border-b border-white/5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] uppercase tracking-widest text-steel">
                    Day {day.day_index}
                  </span>
                  <h3 className="text-lg font-semibold text-cream">{day.label}</h3>
                </div>
                {day.focus && (
                  <p className="text-xs text-steel mt-0.5">{day.focus}</p>
                )}
              </div>

              {exs.length === 0 ? (
                <p className="px-5 py-4 text-sm text-steel">
                  No exercises matched your equipment yet — add gear or a custom
                  exercise, then regenerate.
                </p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {exs.map((ex) => (
                    <li key={ex.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-cream">
                            {ex.exercises?.name ?? "Exercise"}
                          </p>
                          <p className="text-xs text-steel mt-0.5">
                            {ex.exercises
                              ? muscleLabel(ex.exercises.primary_muscle)
                              : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-lime">
                            {ex.sets} × {ex.rep_low}–{ex.rep_high}
                          </p>
                          <p className="text-[11px] text-steel">{ex.rir} RIR</p>
                        </div>
                      </div>
                      {ex.exercises?.cue && (
                        <p className="text-xs text-cream/70 mt-1.5 leading-relaxed">
                          {ex.exercises.cue}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {exs.length > 0 && (
                <form
                  action={startWorkout}
                  className="px-5 py-3 border-t border-white/5"
                >
                  <input type="hidden" name="day_id" value={day.id} />
                  <button
                    type="submit"
                    className="w-full bg-lime/10 border border-lime/30 text-lime font-medium py-2.5 rounded-xl hover:bg-lime/20 transition active:scale-[0.99]"
                  >
                    Start workout
                  </button>
                </form>
              )}
            </section>
          );
        })}
      </div>

      {/* Regenerate */}
      <div className="mt-7">
        <GenerateButton
          className="w-full bg-obsidian border border-white/10 text-cream font-medium py-3 rounded-xl hover:bg-white/5 transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait"
          pendingLabel="Rebuilding your program… (~10s)"
        >
          Regenerate program
        </GenerateButton>
        <p className="text-center text-xs text-steel mt-2">
          Regenerating replaces this program with a fresh one.
        </p>
      </div>
    </>
  );
}
