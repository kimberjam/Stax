"use server";

import { redirect } from "next/navigation";
import { getServerClient, getServiceRoleClient } from "@/lib/supabase/server";
import {
  generateProgramPlan,
  type Candidate,
  type GenContext,
} from "@/lib/programs/generate";

export async function generateProgram() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [prefsRes, profileRes, equipRes, exRes] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("goal, days_per_week, session_minutes, favorite_muscles, rep_range_pref, notes")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("profiles")
      .select("experience_level")
      .eq("user_id", user.id)
      .single(),
    supabase.from("user_equipment").select("category").eq("user_id", user.id),
    supabase
      .from("exercises")
      .select("id, slug, name, primary_muscle, secondary_muscles, equipment, mechanic, pattern"),
  ]);

  const prefs = prefsRes.data;
  if (!prefs) {
    // No preferences yet — they need to finish onboarding first.
    redirect("/onboarding");
  }

  const owned = new Set((equipRes.data ?? []).map((e) => e.category as string));
  const allExercises = exRes.data ?? [];

  const candidates: Candidate[] = allExercises
    .filter((e) => ((e.equipment as string[]) ?? []).every((t) => owned.has(t)))
    .map((e) => ({
      id: e.id as string,
      slug: e.slug as string,
      name: e.name as string,
      primary_muscle: e.primary_muscle as string,
      secondary_muscles: (e.secondary_muscles as string[]) ?? [],
      equipment: (e.equipment as string[]) ?? [],
      mechanic: e.mechanic as "compound" | "isolation",
      pattern: e.pattern as string,
    }));

  const ctx: GenContext = {
    goal: prefs.goal as string,
    experience: (profileRes.data?.experience_level as string) ?? "intermediate",
    daysPerWeek: prefs.days_per_week as number,
    sessionMinutes: prefs.session_minutes as number,
    repPref: (prefs.rep_range_pref as string) ?? "moderate",
    emphasis: (prefs.favorite_muscles as string[]) ?? [],
    injuries: (prefs.notes as string) ?? "",
  };

  const plan = await generateProgramPlan(ctx, candidates);
  const slugToId = new Map(allExercises.map((e) => [e.slug as string, e.id as string]));

  // Persist with the service role (bypasses RLS; we only ever write this
  // authenticated user's own rows).
  const admin = getServiceRoleClient();

  await admin
    .from("programs")
    .update({ status: "archived" })
    .eq("user_id", user.id)
    .eq("status", "active");

  const { data: program, error: progErr } = await admin
    .from("programs")
    .insert({
      user_id: user.id,
      name: plan.split_name,
      goal: ctx.goal,
      split_name: plan.split_name,
      days_per_week: ctx.daysPerWeek,
      session_minutes: ctx.sessionMinutes,
      deload_interval: 6,
      current_week: 1,
      status: "active",
      generated_by: plan.generated_by,
    })
    .select("id")
    .single();

  if (progErr || !program) {
    redirect(
      "/program?error=" +
        encodeURIComponent(progErr?.message ?? "Could not save the program."),
    );
  }

  for (let i = 0; i < plan.days.length; i++) {
    const d = plan.days[i];
    const { data: day } = await admin
      .from("program_days")
      .insert({
        program_id: program.id,
        day_index: i + 1,
        label: d.label,
        focus: d.focus,
      })
      .select("id")
      .single();
    if (!day) continue;

    const exRows: Array<{
      program_day_id: string;
      exercise_id: string;
      position: number;
      sets: number;
      rep_low: number;
      rep_high: number;
      rir: number;
    }> = [];
    for (let idx = 0; idx < d.exercises.length; idx++) {
      const ex = d.exercises[idx];
      const exId = slugToId.get(ex.slug);
      if (!exId) continue;
      exRows.push({
        program_day_id: day.id as string,
        exercise_id: exId,
        position: idx,
        sets: ex.sets,
        rep_low: ex.rep_low,
        rep_high: ex.rep_high,
        rir: ex.rir,
      });
    }
    if (exRows.length) {
      await admin.from("program_exercises").insert(exRows);
    }
  }

  redirect("/program");
}
