import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerClient } from "@/lib/supabase/server";
import { StaxLogo } from "@/components/stax-logo";
import { WorkoutSession, type SessionExercise } from "./session";

export const metadata = { title: "Workout — Stax" };

type SetRow = {
  id: string;
  position: number;
  set_index: number;
  exercise_id: string;
  notes: string | null;
  target_rep_low: number | null;
  target_rep_high: number | null;
  target_rir: number | null;
  weight: number | null;
  reps: number | null;
  done: boolean;
  exercises: { name: string; primary_muscle: string; cue: string | null } | null;
};

function LoadError({ message }: { message: string }) {
  return (
    <main className="min-h-screen px-5 py-8">
      <div className="w-full max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <StaxLogo size={36} />
            <h1 className="text-lg font-bold tracking-wide">Workout</h1>
          </div>
          <Link href="/program" className="text-sm text-steel hover:text-cream transition">
            Back
          </Link>
        </div>
        <div className="px-4 py-3 rounded-xl bg-coral/20 border border-coral/40 text-coral text-sm">
          Couldn&rsquo;t load this workout: {message}
        </div>
      </div>
    </main>
  );
}

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Core workout row — simple columns only, no embeds.
  const { data: workout, error: wErr } = await supabase
    .from("workouts")
    .select("id, user_id, label, status, unit, program_id, program_week")
    .eq("id", id)
    .maybeSingle();

  if (wErr) return <LoadError message={wErr.message} />;
  if (!workout) redirect("/program");
  if ((workout.user_id as string) !== user.id) redirect("/program");
  if (workout.status === "completed") redirect("/workouts");

  // Sets for this workout (with each set's exercise).
  const { data: setData, error: sErr } = await supabase
    .from("workout_sets")
    .select(
      "id, position, set_index, exercise_id, notes, target_rep_low, target_rep_high, target_rir, weight, reps, done, exercises(name, primary_muscle, cue)",
    )
    .eq("workout_id", id);
  if (sErr) return <LoadError message={sErr.message} />;

  // Candidate exercises for swapping — the user's available library.
  const [equipRes, exRes] = await Promise.all([
    supabase.from("user_equipment").select("category").eq("user_id", user.id),
    supabase
      .from("exercises")
      .select("id, name, primary_muscle, equipment, mechanic")
      .order("name"),
  ]);
  const owned = new Set((equipRes.data ?? []).map((e) => e.category as string));
  const candidates = (exRes.data ?? [])
    .filter((e) => ((e.equipment as string[]) ?? []).every((t) => owned.has(t)))
    .map((e) => ({
      id: e.id as string,
      name: e.name as string,
      primary_muscle: e.primary_muscle as string,
      mechanic: e.mechanic as string,
    }));

  // Deload interval, looked up directly (no embed).
  let deloadInterval: number | null = null;
  if (workout.program_id) {
    const { data: prog } = await supabase
      .from("programs")
      .select("deload_interval")
      .eq("id", workout.program_id as string)
      .maybeSingle();
    deloadInterval = (prog?.deload_interval as number) ?? null;
  }

  // Group sets by exercise (one position per exercise within the day).
  const rows = (setData ?? []) as unknown as SetRow[];
  const byPos = new Map<number, SessionExercise>();
  for (const s of rows) {
    let g = byPos.get(s.position);
    if (!g) {
      g = {
        position: s.position,
        exerciseId: s.exercise_id,
        name: s.exercises?.name ?? "Exercise",
        primaryMuscle: s.exercises?.primary_muscle ?? "",
        cue: s.exercises?.cue ?? null,
        note: s.notes ?? null,
        sets: [],
      };
      byPos.set(s.position, g);
    }
    g.sets.push({
      id: s.id,
      setIndex: s.set_index,
      targetRepLow: s.target_rep_low,
      targetRepHigh: s.target_rep_high,
      targetRir: s.target_rir,
      weight: s.weight,
      reps: s.reps,
      done: s.done,
    });
  }
  const exercises = Array.from(byPos.values()).sort(
    (a, b) => a.position - b.position,
  );
  for (const ex of exercises) ex.sets.sort((a, b) => a.setIndex - b.setIndex);

  const wk = workout.program_week as number | null;
  const isDeload = wk != null && deloadInterval != null && wk >= deloadInterval;

  return (
    <WorkoutSession
      workoutId={workout.id as string}
      label={workout.label as string}
      unit={workout.unit === "metric" ? "kg" : "lb"}
      exercises={exercises}
      candidates={candidates}
      deload={isDeload}
    />
  );
}
