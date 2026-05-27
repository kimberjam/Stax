// Double-progression + deload helpers for week-to-week auto-progression.

type Unit = "imperial" | "metric";

const LOWER_BODY = new Set(["quads", "hamstrings", "glutes", "calves"]);

/** Weight to add when an exercise tops its rep range. Bigger jumps on
 *  lower-body lifts, which generally handle larger increments. */
export function weightIncrement(primaryMuscle: string, unit: Unit): number {
  const lower = LOWER_BODY.has(primaryMuscle);
  if (unit === "metric") return lower ? 5 : 2.5;
  return lower ? 10 : 5;
}

/** Round to the nearest loadable plate jump (5 lb / 2.5 kg). */
export function roundWeight(w: number, unit: Unit): number {
  const step = unit === "metric" ? 2.5 : 5;
  return Math.round(w / step) * step;
}

/** Roughly a third fewer sets on a deload, floor of 1. */
export function deloadSets(sets: number): number {
  return Math.max(1, Math.round((sets * 2) / 3));
}

export const DELOAD_WEIGHT_FACTOR = 0.9;

export const unitLabel = (unit: Unit) => (unit === "metric" ? "kg" : "lb");
