import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { WorkoutSession, type SessionExercise } from "./session";

export const metadata = { title: "Workout — Stax" };

type SetRow = {
  id: string;
  position: number;
  set_index: number;
  target_rep_low: number | null;
  target_rep_high: number | null;
  target_rir: number | null;
  weight: number | null;
  reps: number | null;
  done: boolean;
  exercises: { name: string; primary_muscle: string; cue: string | null } | null;
};
type WorkoutRow = {
  id: string;
  user_id: string;
  label: string;
  status: string;
  unit: string;
  workout_sets: SetRow[];
};

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

  const res = await supabase
    .from("workouts")
    .select(
      "id, user_id, label, status, unit, workout_sets(id, position, set_index, target_rep_low, target_rep_high, target_rir, weight, reps, done, exercises(name, primary_muscle, cue))",
    )
    .eq("id", id)
    .single();

  const workout = res.data as unknown as WorkoutRow | null;

  if (!workout || workout.user_id !== user.id) {
    redirect("/program");
  }
  if (workout.status === "completed") {
    redirect("/workouts");
  }

  // Group sets by exercise (one position per exercise within the day).
  const byPos = new Map<number, SessionExercise>();
  for (const s of workout.workout_sets ?? []) {
    let g = byPos.get(s.position);
    if (!g) {
      g = {
        position: s.position,
        name: s.exercises?.name ?? "Exercise",
        primaryMuscle: s.exercises?.primary_muscle ?? "",
        cue: s.exercises?.cue ?? null,
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

  return (
    <WorkoutSession
      workoutId={workout.id}
      label={workout.label}
      unit={workout.unit === "metric" ? "kg" : "lb"}
      exercises={exercises}
    />
  );
}
