"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase/server";
import {
  weightIncrement,
  roundWeight,
  deloadSets,
  DELOAD_WEIGHT_FACTOR,
  unitLabel,
} from "@/lib/programs/progression";

type DayExercise = {
  id: string;
  position: number;
  sets: number;
  rep_low: number;
  rep_high: number;
  rir: number;
  exercise_id: string;
  exercises?: { primary_muscle: string } | null;
};

// Start a session for a program day: create the workout and seed its sets
// from the day's prescription, applying double progression (and the deload
// when it's a recovery week).
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
      "id, label, program_id, programs(user_id, current_week, deload_interval), program_exercises(id, position, sets, rep_low, rep_high, rir, exercise_id, exercises(primary_muscle))",
    )
    .eq("id", dayId)
    .single();

  const program = day?.programs as unknown as {
    user_id: string;
    current_week: number;
    deload_interval: number;
  } | null;
  if (!day || !program || program.user_id !== user.id) {
    redirect("/program");
  }

  const exercises = ((day.program_exercises as unknown as DayExercise[]) ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);
  const exIds = exercises.map((e) => e.exercise_id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_units")
    .eq("user_id", user.id)
    .single();
  const unit = ((profile?.preferred_units as string) ?? "imperial") as
    | "imperial"
    | "metric";

  const currentWeek = program.current_week ?? 1;
  const deloadInterval = program.deload_interval ?? 6;
  const isDeload = currentWeek >= deloadInterval;

  // Gather the most recent completed performance per exercise.
  const byEx = new Map<
    string,
    Array<{ weight: number | null; reps: number | null; done: boolean }>
  >();
  try {
    const { data: recent } = await supabase
      .from("workouts")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(20);
    const ids = (recent ?? []).map((w) => w.id as string);
    if (ids.length && exIds.length) {
      const { data: prior } = await supabase
        .from("workout_sets")
        .select("exercise_id, weight, reps, done, workout_id")
        .in("workout_id", ids)
        .in("exercise_id", exIds);
      const rank = new Map(ids.map((id, i) => [id, i]));
      const bestRank = new Map<string, number>();
      for (const s of prior ?? []) {
        const exId = s.exercise_id as string;
        const r = rank.get(s.workout_id as string) ?? 999;
        if (!bestRank.has(exId) || r < (bestRank.get(exId) as number)) {
          bestRank.set(exId, r);
        }
      }
      for (const s of prior ?? []) {
        const exId = s.exercise_id as string;
        const r = rank.get(s.workout_id as string) ?? 999;
        if (r === bestRank.get(exId)) {
          const arr = byEx.get(exId) ?? [];
          arr.push({
            weight: s.weight != null ? Number(s.weight) : null,
            reps: s.reps != null ? Number(s.reps) : null,
            done: !!s.done,
          });
          byEx.set(exId, arr);
        }
      }
    }
  } catch {
    // progression is best-effort; never block starting a workout on it
  }

  // Keep only one live session.
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
      program_week: currentWeek,
    })
    .select("id")
    .single();

  if (wErr || !workout) {
    redirect("/program?error=" + encodeURIComponent(wErr?.message ?? "Could not start workout."));
  }

  const setRows: Array<Record<string, unknown>> = [];
  for (const ex of exercises) {
    const primaryMuscle =
      (ex.exercises as unknown as { primary_muscle: string } | null)
        ?.primary_muscle ?? "";
    const prior = byEx.get(ex.exercise_id) ?? [];
    const weights = prior
      .filter((s) => s.weight != null)
      .map((s) => s.weight as number);
    const last = weights.length ? Math.max(...weights) : null;
    const doneSets = prior.filter((s) => s.done && s.reps != null);
    const topped =
      doneSets.length > 0 &&
      doneSets.every((s) => (s.reps as number) >= ex.rep_high);

    let suggested: number | null = last;
    let note: string | null = null;

    if (isDeload) {
      if (last != null) suggested = roundWeight(last * DELOAD_WEIGHT_FACTOR, unit);
      note = "Recovery week — lighter on purpose";
    } else if (last != null && topped) {
      const inc = weightIncrement(primaryMuscle, unit);
      suggested = roundWeight(last + inc, unit);
      note = `Up ${inc} ${unitLabel(unit)} — you topped the range last time`;
    } else if (last != null) {
      note = "Same weight — aim for the top of the range";
    }

    const baseSets = Math.max(1, Math.min(ex.sets, 10));
    const setCount = isDeload ? deloadSets(baseSets) : baseSets;
    const rir = isDeload ? ex.rir + 1 : ex.rir;

    for (let i = 1; i <= setCount; i++) {
      setRows.push({
        workout_id: workout.id,
        exercise_id: ex.exercise_id,
        program_exercise_id: ex.id,
        position: ex.position,
        set_index: i,
        target_rep_low: ex.rep_low,
        target_rep_high: ex.rep_high,
        target_rir: rir,
        weight: suggested,
        reps: null,
        done: false,
        notes: note,
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

  // Auto-advance the program week once all of this week's days are logged.
  if (finish) {
    const { data: w } = await supabase
      .from("workouts")
      .select("program_id, program_week")
      .eq("id", workoutId)
      .single();
    const programId = (w?.program_id as string) ?? null;
    const week = (w?.program_week as number) ?? null;
    if (programId && week != null) {
      const { data: prog } = await supabase
        .from("programs")
        .select("days_per_week, current_week, deload_interval")
        .eq("id", programId)
        .single();
      if (prog && week === (prog.current_week as number)) {
        const { data: doneDays } = await supabase
          .from("workouts")
          .select("program_day_id")
          .eq("user_id", user.id)
          .eq("program_id", programId)
          .eq("program_week", week)
          .eq("status", "completed");
        const distinct = new Set(
          (doneDays ?? [])
            .map((d) => d.program_day_id as string | null)
            .filter((x): x is string => !!x),
        );
        if (distinct.size >= (prog.days_per_week as number)) {
          const next =
            (prog.current_week as number) >= (prog.deload_interval as number)
              ? 1
              : (prog.current_week as number) + 1;
          await supabase
            .from("programs")
            .update({ current_week: next })
            .eq("id", programId);
        }
      }
    }
  }

  redirect(finish ? "/workouts" : "/program");
}

// Swap one exercise for another within this session only (does NOT touch the
// program). Persists current edits first so nothing typed is lost.
export async function swapExercise(
  workoutId: string,
  position: number,
  newExerciseId: string,
  sets: Array<z.infer<typeof setSchema>>,
) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ex } = await supabase
    .from("exercises")
    .select("id")
    .eq("id", newExerciseId)
    .maybeSingle();
  if (!ex) redirect(`/workout/${workoutId}`);

  const parsed = z.array(setSchema).safeParse(sets);
  if (parsed.success) {
    await Promise.all(
      parsed.data.map((s) =>
        supabase
          .from("workout_sets")
          .update({ weight: s.weight, reps: s.reps, done: s.done })
          .eq("id", s.id),
      ),
    );
  }

  await supabase
    .from("workout_sets")
    .update({
      exercise_id: newExerciseId,
      program_exercise_id: null,
      weight: null,
      reps: null,
      done: false,
      notes: null,
    })
    .eq("workout_id", workoutId)
    .eq("position", position);

  redirect(`/workout/${workoutId}`);
}
