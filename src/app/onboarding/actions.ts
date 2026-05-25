"use server";

import { z } from "zod";
import { getServerClient } from "@/lib/supabase/server";

const payloadSchema = z.object({
  preferred_units: z.enum(["imperial", "metric"]),
  sex: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  height_cm: z.number().min(100).max(260),
  starting_weight_kg: z.number().min(25).max(350),
  experience_level: z.enum(["beginner", "intermediate", "advanced"]),
  goal: z.enum([
    "hypertrophy",
    "strength",
    "fat_loss",
    "recomposition",
    "general_fitness",
  ]),
  days_per_week: z.number().int().min(1).max(7),
  session_minutes: z.number().int().min(15).max(180),
  training_days: z.array(z.number().int().min(0).max(6)).max(7),
  equipment_profile: z.enum(["full_gym", "home_gym", "minimal", "bodyweight"]),
  favorite_muscles: z.array(z.string().max(40)).max(12),
  rep_range_pref: z.enum(["low", "moderate", "high", "mixed"]),
  notes: z.string().max(1000),
});

export type OnboardingPayload = z.infer<typeof payloadSchema>;

type SaveResult = { ok: true } | { ok: false; error: string };

// Equipment each preset implies. Stored as individual rows so the AI
// program generator can reason about exactly what's available later.
const EQUIPMENT_PRESETS: Record<
  OnboardingPayload["equipment_profile"],
  Array<[string, string]>
> = {
  full_gym: [
    ["barbell", "Barbell + plates"],
    ["dumbbells", "Full dumbbell rack"],
    ["bench", "Adjustable bench"],
    ["rack", "Squat / power rack"],
    ["cables", "Cable machine"],
    ["machines", "Selectorized machines"],
    ["smith_machine", "Smith machine"],
    ["pull_up_bar", "Pull-up bar"],
  ],
  home_gym: [
    ["barbell", "Barbell + plates"],
    ["dumbbells", "Adjustable dumbbells"],
    ["bench", "Adjustable bench"],
    ["pull_up_bar", "Pull-up bar"],
    ["bands", "Resistance bands"],
  ],
  minimal: [
    ["dumbbells", "Dumbbells"],
    ["bench", "Bench or sturdy surface"],
    ["bands", "Resistance bands"],
  ],
  bodyweight: [
    ["bodyweight", "Bodyweight only"],
    ["bands", "Resistance bands (optional)"],
  ],
};

export async function saveOnboarding(raw: OnboardingPayload): Promise<SaveResult> {
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some answers didn't look right. Please review them and try again.",
    };
  }
  const data = parsed.data;

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your session expired — please sign in again." };
  }

  // 1. profile basics
  const { error: profErr } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      sex: data.sex,
      birth_date: data.birth_date,
      height_cm: data.height_cm,
      starting_weight_kg: data.starting_weight_kg,
      experience_level: data.experience_level,
      preferred_units: data.preferred_units,
    },
    { onConflict: "user_id" },
  );
  if (profErr) return { ok: false, error: profErr.message };

  // 2. training preferences
  const { error: prefErr } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      goal: data.goal,
      days_per_week: data.days_per_week,
      session_minutes: data.session_minutes,
      training_days: data.training_days,
      equipment_profile: data.equipment_profile,
      favorite_muscles: data.favorite_muscles,
      rep_range_pref: data.rep_range_pref,
      notes: data.notes.trim() ? data.notes.trim() : null,
    },
    { onConflict: "user_id" },
  );
  if (prefErr) return { ok: false, error: prefErr.message };

  // 3. equipment — replace the preset-sourced rows for this user
  await supabase
    .from("user_equipment")
    .delete()
    .eq("user_id", user.id)
    .eq("source", "preset");

  const equipmentRows = EQUIPMENT_PRESETS[data.equipment_profile].map(
    ([category, item_name]) => ({
      user_id: user.id,
      category,
      item_name,
      source: "preset" as const,
    }),
  );
  const { error: equipErr } = await supabase
    .from("user_equipment")
    .insert(equipmentRows);
  if (equipErr) return { ok: false, error: equipErr.message };

  // 4. flip the onboarding flag — this releases the gate
  const { error: doneErr } = await supabase
    .from("app_users")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id);
  if (doneErr) return { ok: false, error: doneErr.message };

  return { ok: true };
}
