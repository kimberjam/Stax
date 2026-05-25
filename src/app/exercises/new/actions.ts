"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(2).max(80),
  primary_muscle: z.string().min(1),
  equipment: z.array(z.string()),
  mechanic: z.enum(["compound", "isolation"]),
  pattern: z.enum([
    "push",
    "pull",
    "squat",
    "hinge",
    "lunge",
    "carry",
    "core",
    "other",
  ]),
  cue: z.string().max(500),
  is_unilateral: z.boolean(),
  shared: z.boolean(),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function addCustomExercise(formData: FormData) {
  const raw = {
    name: String(formData.get("name") ?? "").trim(),
    primary_muscle: String(formData.get("primary_muscle") ?? ""),
    equipment: formData.getAll("equipment").map(String),
    mechanic: String(formData.get("mechanic") ?? "compound"),
    pattern: String(formData.get("pattern") ?? "other"),
    cue: String(formData.get("cue") ?? "").trim(),
    is_unilateral: formData.get("is_unilateral") === "on",
    shared: formData.get("shared") === "on",
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    redirect(
      "/exercises/new?error=" +
        encodeURIComponent("Please give it a name and pick a primary muscle."),
    );
  }
  const data = parsed.data;

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Only admins can publish to the shared library; everyone else gets a
  // private custom exercise scoped to themselves.
  let ownerId: string | null = user.id;
  if (data.shared) {
    const { data: appUser } = await supabase
      .from("app_users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (appUser?.role === "admin") ownerId = null;
  }

  const slug = `${slugify(data.name) || "exercise"}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

  const { error } = await supabase.from("exercises").insert({
    slug,
    owner_id: ownerId,
    name: data.name,
    primary_muscle: data.primary_muscle,
    equipment: data.equipment,
    mechanic: data.mechanic,
    pattern: data.pattern,
    is_unilateral: data.is_unilateral,
    cue: data.cue || null,
    created_by: user.id,
  });

  if (error) {
    redirect("/exercises/new?error=" + encodeURIComponent(error.message));
  }

  redirect("/exercises");
}
