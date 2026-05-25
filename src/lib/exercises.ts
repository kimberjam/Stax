// Shared exercise vocabulary + helpers. No "use client"/"use server" so it
// can be imported from both server and client components.

export const MUSCLE_GROUPS = [
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "lats", label: "Lats" },
  { value: "traps", label: "Traps" },
  { value: "shoulders", label: "Shoulders" },
  { value: "biceps", label: "Biceps" },
  { value: "triceps", label: "Triceps" },
  { value: "forearms", label: "Forearms" },
  { value: "quads", label: "Quads" },
  { value: "hamstrings", label: "Hamstrings" },
  { value: "glutes", label: "Glutes" },
  { value: "calves", label: "Calves" },
  { value: "abs", label: "Abs" },
  { value: "obliques", label: "Obliques" },
] as const;

export const EQUIPMENT_OPTIONS = [
  { value: "barbell", label: "Barbell" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "bench", label: "Bench" },
  { value: "rack", label: "Rack" },
  { value: "cables", label: "Cables" },
  { value: "machines", label: "Machine" },
  { value: "smith_machine", label: "Smith machine" },
  { value: "pull_up_bar", label: "Pull-up bar" },
  { value: "bands", label: "Bands" },
] as const;

export const MECHANICS = [
  { value: "compound", label: "Compound" },
  { value: "isolation", label: "Isolation" },
] as const;

export const PATTERNS = [
  { value: "push", label: "Push" },
  { value: "pull", label: "Pull" },
  { value: "squat", label: "Squat" },
  { value: "hinge", label: "Hinge" },
  { value: "lunge", label: "Lunge" },
  { value: "carry", label: "Carry" },
  { value: "core", label: "Core" },
  { value: "other", label: "Other" },
] as const;

export const muscleLabel = (v: string) =>
  MUSCLE_GROUPS.find((m) => m.value === v)?.label ??
  v.charAt(0).toUpperCase() + v.slice(1);

export const equipmentLabel = (v: string) =>
  EQUIPMENT_OPTIONS.find((e) => e.value === v)?.label ?? v.replace(/_/g, " ");

export type ExerciseRow = {
  id: string;
  slug: string;
  owner_id: string | null;
  name: string;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string[];
  mechanic: "compound" | "isolation";
  pattern: string;
  is_unilateral: boolean;
  cue: string | null;
};

/** An exercise is "available" if every piece of required equipment is owned.
 *  Empty required list means bodyweight, which everyone can always do. */
export function isAvailable(required: string[], owned: string[]) {
  return required.every((t) => owned.includes(t));
}
