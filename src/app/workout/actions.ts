"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase/server";

type DayExercise = {
  id: string;
  position: number;
  sets: number;
  rep_low: number;
  rep_high: number;
  rir: number;
  exercise_id: string;
};

// Start a session for a program day: create the workout and seed its sets
// from the day's prescription, pre-filling weight from the most recent
// completed session for each exercise.
export async function startWorkout(formData: FormData) {
  const dayId = String(formData.get("day_id") ?? "");
  if (!dayId) redirect("/program");

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: day } = await supabase
    .from("program_days")
    .select(
      "id, label, program_id, programs(user_id), program_exercises(id, position, sets, rep_low, rep_high, rir, exercise_id)",
    )
    .eq("id", dayId)
    .single();

  const program = day?.programs as unknown as { user_id: string } | null;
  if (!day || !program || program.user_id !== user.id) {
    redirect("/program");
  }

  const exercises = ((day.program_exercises as unknown as DayExercise[]) ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);
  const exIds = exercises.map((e) => e.exercise_id);

  // preferred units for this session
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_units")
    .eq("user_id", user.id)
    .single();
  const unit = (profile?.preferred_units as string) ?? "imperial";

  // best-effort: last weight used per exercise (most recent completed session)
  const lastWeight = new Map<string, number>();
  try {
    const { data: recent } = await supabase
      .from("workouts")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(15);
    const ids = (recent ?? []).map((w) => w.id as string);
    if (ids.length && exIds.length) {
      const { data: priorSets } = await supabase
        .from("workout_sets")
        .select("exercise_id, weight, workout_id")
        .in("workout_id", ids)
        .in("exercise_id", exIds)
        .not("weight", "is", null);
      const rank = new Map(ids.map((id, i) => [id, i]));
      const bestRank = new Map<string, number>();
      for (const s of priorSets ?? []) {
        const exId = s.exercise_id as string;
        const r = rank.get(s.workout_id as string) ?? 999;
        if (!bestRank.has(exId) || r < (bestRank.get(exId) as number)) {
          bestRank.set(exId, r);
          lastWeight.set(exId, Number(s.weight));
        }
      }
    }
  } catch {
    // prefill is a nicety; never block starting a workout on it
  }

  // Keep only one live session: retire any other in-progress workouts.
  await supabase
    .from("workouts")
    .update({ status: "abandoned" })
    .eq("user_id", user.id)
    .eq("status", "in_progress");

  const { data: workout, error: wErr } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      program_id: day.program_id,
      program_day_id: day.id,
      label: day.label,
      status: "in_progress",
      unit,
    })
    .select("id")
    .single();

  if (wErr || !workout) {
    redirect("/program?error=" + encodeURIComponent(wErr?.message ?? "Could not start workout."));
  }

  const setRows: Array<Record<string, unknown>> = [];
  for (const ex of exercises) {
    const w = lastWeight.get(ex.exercise_id) ?? null;
    const setCount = Math.max(1, Math.min(ex.sets, 10));
    for (let i = 1; i <= setCount; i++) {
      setRows.push({
        workout_id: workout.id,
        exercise_id: ex.exercise_id,
        program_exercise_id: ex.id,
        position: ex.position,
        set_index: i,
        target_rep_low: ex.rep_low,
        target_rep_high: ex.rep_high,
        target_rir: ex.rir,
        weight: w,
        reps: null,
        done: false,
      });
    }
  }
  if (setRows.length) {
    await supabase.from("workout_sets").insert(setRows);
  }

  redirect(`/workout/${workout.id}`);
}

// Persist edited sets and optionally finish the session.
const setSchema = z.object({
  id: z.string().uuid(),
  weight: z.number().nonnegative().max(2000).nullable(),
  reps: z.number().int().min(0).max(1000).nullable(),
  done: z.boolean(),
});

export async function saveWorkout(
  workoutId: string,
  sets: Array<z.infer<typeof setSchema>>,
  finish: boolean,
) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = z.array(setSchema).safeParse(sets);
  if (!parsed.success) {
    redirect(`/workout/${workoutId}?error=` + encodeURIComponent("Some entries weren't valid."));
  }

  // RLS ensures only this user's own sets can be updated.
  await Promise.all(
    parsed.data.map((s) =>
      supabase
        .from("workout_sets")
        .update({ weight: s.weight, reps: s.reps, done: s.done })
        .eq("id", s.id),
    ),
  );

  await supabase
    .from("workouts")
    .update(
      finish
        ? { status: "completed", completed_at: new Date().toISOString() }
        : { status: "in_progress" },
    )
    .eq("id", workoutId)
    .eq("user_id", user.id);

  redirect(finish ? "/workouts" : "/program");
}
