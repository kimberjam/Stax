// Proven split templates keyed by training days per week. Each day lists the
// muscle groups it targets, in rough priority order. The generation engine
// fills these with specific exercises and prescribes sets/reps/RIR.

export type SplitDay = { label: string; focus: string; muscles: string[] };
export type Split = { name: string; days: SplitDay[] };

const FULL_BODY = (label: string, focus: string): SplitDay => ({
  label,
  focus,
  muscles: ["quads", "chest", "back", "shoulders", "hamstrings", "biceps", "triceps", "abs"],
});

export function splitFor(daysPerWeek: number): Split {
  const d = Math.min(Math.max(daysPerWeek, 1), 7);
  switch (d) {
    case 1:
      return { name: "Full Body", days: [FULL_BODY("Full Body", "Whole-body session")] };
    case 2:
      return {
        name: "Upper / Lower",
        days: [
          { label: "Upper", focus: "Chest, back, shoulders, arms", muscles: ["chest", "back", "shoulders", "biceps", "triceps"] },
          { label: "Lower", focus: "Legs and core", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
        ],
      };
    case 3:
      return {
        name: "Push / Pull / Legs",
        days: [
          { label: "Push", focus: "Chest, shoulders, triceps", muscles: ["chest", "shoulders", "triceps"] },
          { label: "Pull", focus: "Back, lats, biceps", muscles: ["back", "lats", "biceps", "traps"] },
          { label: "Legs", focus: "Quads, hamstrings, glutes, calves", muscles: ["quads", "hamstrings", "glutes", "calves"] },
        ],
      };
    case 4:
      return {
        name: "Upper / Lower (x2)",
        days: [
          { label: "Upper A", focus: "Push-focused upper", muscles: ["chest", "shoulders", "triceps", "back", "biceps"] },
          { label: "Lower A", focus: "Quad-focused lower", muscles: ["quads", "glutes", "hamstrings", "calves"] },
          { label: "Upper B", focus: "Pull-focused upper", muscles: ["back", "lats", "biceps", "chest", "shoulders"] },
          { label: "Lower B", focus: "Hamstring & glute focus", muscles: ["hamstrings", "glutes", "quads", "calves", "abs"] },
        ],
      };
    case 5:
      return {
        name: "Push / Pull / Legs + Upper / Lower",
        days: [
          { label: "Push", focus: "Chest, shoulders, triceps", muscles: ["chest", "shoulders", "triceps"] },
          { label: "Pull", focus: "Back, lats, biceps", muscles: ["back", "lats", "biceps", "traps"] },
          { label: "Legs", focus: "Quads, hamstrings, glutes, calves", muscles: ["quads", "hamstrings", "glutes", "calves"] },
          { label: "Upper", focus: "Full upper body", muscles: ["chest", "back", "shoulders", "biceps", "triceps"] },
          { label: "Lower", focus: "Full lower body", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
        ],
      };
    case 6:
      return {
        name: "Push / Pull / Legs (x2)",
        days: [
          { label: "Push A", focus: "Chest-focused push", muscles: ["chest", "shoulders", "triceps"] },
          { label: "Pull A", focus: "Back-focused pull", muscles: ["back", "lats", "biceps"] },
          { label: "Legs A", focus: "Quad-focused legs", muscles: ["quads", "glutes", "hamstrings", "calves"] },
          { label: "Push B", focus: "Shoulder-focused push", muscles: ["shoulders", "chest", "triceps"] },
          { label: "Pull B", focus: "Lat & trap focus", muscles: ["lats", "back", "biceps", "traps"] },
          { label: "Legs B", focus: "Hamstring & glute focus", muscles: ["hamstrings", "glutes", "quads", "calves", "abs"] },
        ],
      };
    default: // 7
      return {
        name: "Push / Pull / Legs (x2) + Arms",
        days: [
          { label: "Push A", focus: "Chest-focused push", muscles: ["chest", "shoulders", "triceps"] },
          { label: "Pull A", focus: "Back-focused pull", muscles: ["back", "lats", "biceps"] },
          { label: "Legs A", focus: "Quad-focused legs", muscles: ["quads", "glutes", "hamstrings", "calves"] },
          { label: "Push B", focus: "Shoulder-focused push", muscles: ["shoulders", "chest", "triceps"] },
          { label: "Pull B", focus: "Lat & trap focus", muscles: ["lats", "back", "biceps", "traps"] },
          { label: "Legs B", focus: "Hamstring & glute focus", muscles: ["hamstrings", "glutes", "quads", "calves", "abs"] },
          { label: "Arms & Core", focus: "Arms, shoulders, abs", muscles: ["biceps", "triceps", "shoulders", "abs"] },
        ],
      };
  }
}

// How many exercises to program per session, scaled to session length.
export function exerciseBudget(sessionMinutes: number): number {
  const n = Math.round(sessionMinutes / 12);
  return Math.min(Math.max(n, 3), 8);
}

// Baseline rep ranges by the user's preferred rep style.
export function repRangeFor(
  repPref: string,
  mechanic: "compound" | "isolation",
): { low: number; high: number } {
  switch (repPref) {
    case "low":
      return mechanic === "compound" ? { low: 4, high: 6 } : { low: 6, high: 10 };
    case "high":
      return mechanic === "compound" ? { low: 10, high: 15 } : { low: 12, high: 20 };
    case "mixed":
      return mechanic === "compound" ? { low: 6, high: 10 } : { low: 10, high: 15 };
    case "moderate":
    default:
      return mechanic === "compound" ? { low: 6, high: 10 } : { low: 10, high: 15 };
  }
}
