import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { ExerciseLibrary } from "./library";
import type { ExerciseRow } from "@/lib/exercises";

export const metadata = { title: "Exercise library — Stax" };

export default async function ExercisesPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [exResult, equipResult] = await Promise.all([
    supabase
      .from("exercises")
      .select(
        "id, slug, owner_id, name, primary_muscle, secondary_muscles, equipment, mechanic, pattern, is_unilateral, cue",
      )
      .order("name"),
    supabase.from("user_equipment").select("category").eq("user_id", user.id),
  ]);

  const myEquipment = Array.from(
    new Set((equipResult.data ?? []).map((e) => e.category as string)),
  );

  return (
    <ExerciseLibrary
      exercises={(exResult.data ?? []) as ExerciseRow[]}
      myEquipment={myEquipment}
      currentUserId={user.id}
    />
  );
}
