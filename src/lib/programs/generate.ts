import { z } from "zod";
import { getAnthropic, AI_MODEL } from "@/lib/ai/anthropic";
import { splitFor, exerciseBudget, repRangeFor, type Split } from "./templates";

export type Candidate = {
  id: string;
  slug: string;
  name: string;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string[];
  mechanic: "compound" | "isolation";
  pattern: string;
};

export type GenContext = {
  goal: string;
  experience: string;
  daysPerWeek: number;
  sessionMinutes: number;
  repPref: string;
  emphasis: string[];
  injuries: string;
};

export type GeneratedExercise = {
  slug: string;
  sets: number;
  rep_low: number;
  rep_high: number;
  rir: number;
};
export type GeneratedDay = {
  label: string;
  focus: string;
  exercises: GeneratedExercise[];
};
export type GeneratedPlan = {
  split_name: string;
  generated_by: "ai" | "template";
  days: GeneratedDay[];
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(Math.max(Math.round(n), lo), hi);

// ---------------------------------------------------------------------
// Deterministic backbone: fills each split day from the candidate pool.
// Always produces a valid plan; used as the fallback when AI is off/fails.
// ---------------------------------------------------------------------
function deterministicPlan(
  ctx: GenContext,
  candidates: Candidate[],
  split: Split,
): GeneratedPlan {
  const budget = exerciseBudget(ctx.sessionMinutes);
  const emphasis = new Set(ctx.emphasis);

  const byMuscle = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const arr = byMuscle.get(c.primary_muscle) ?? [];
    arr.push(c);
    byMuscle.set(c.primary_muscle, arr);
  }
  for (const arr of byMuscle.values()) {
    arr.sort((a, b) =>
      a.mechanic === b.mechanic
        ? a.name.localeCompare(b.name)
        : a.mechanic === "compound"
          ? -1
          : 1,
    );
  }

  const days = split.days.map((day) => {
    const muscles = [...day.muscles].sort(
      (a, b) => (emphasis.has(b) ? 1 : 0) - (emphasis.has(a) ? 1 : 0),
    );
    const pointers: Record<string, number> = {};
    const used = new Set<string>();
    const chosen: Candidate[] = [];
    let progress = true;

    while (chosen.length < budget && progress) {
      progress = false;
      for (const m of muscles) {
        if (chosen.length >= budget) break;
        const pool = byMuscle.get(m) ?? [];
        let p = pointers[m] ?? 0;
        while (p < pool.length && used.has(pool[p].slug)) p++;
        if (p < pool.length) {
          chosen.push(pool[p]);
          used.add(pool[p].slug);
          pointers[m] = p + 1;
          progress = true;
        }
      }
    }

    const exercises: GeneratedExercise[] = chosen.map((c) => {
      const r = repRangeFor(ctx.repPref, c.mechanic);
      return {
        slug: c.slug,
        sets: c.mechanic === "compound" ? 4 : 3,
        rep_low: r.low,
        rep_high: r.high,
        rir: ctx.goal === "strength" ? 1 : 2,
      };
    });

    return { label: day.label, focus: day.focus, exercises };
  });

  return { split_name: split.name, generated_by: "template", days };
}

// ---------------------------------------------------------------------
// AI fill-in: ask Claude to pick exercises + prescribe sets/reps/RIR.
// ---------------------------------------------------------------------
const aiSchema = z.object({
  days: z.array(
    z.object({
      exercises: z.array(
        z.object({
          slug: z.string(),
          sets: z.number(),
          rep_low: z.number(),
          rep_high: z.number(),
          rir: z.number(),
        }),
      ),
    }),
  ),
});

function extractJson(text: string): unknown | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function aiPlan(
  ctx: GenContext,
  candidates: Candidate[],
  split: Split,
): Promise<GeneratedPlan | null> {
  const client = getAnthropic();
  if (!client) return null;

  const bySlug = new Map(candidates.map((c) => [c.slug, c]));
  const budget = exerciseBudget(ctx.sessionMinutes);

  const candidateList = candidates
    .map(
      (c) =>
        `${c.slug} | ${c.name} | ${c.primary_muscle}${
          c.secondary_muscles.length ? " (+" + c.secondary_muscles.join(",") + ")" : ""
        } | ${c.mechanic} | ${c.equipment.length ? c.equipment.join("+") : "bodyweight"}`,
    )
    .join("\n");

  const dayList = split.days
    .map((d, i) => `Day ${i + 1} "${d.label}": prioritize ${d.muscles.join(", ")}`)
    .join("\n");

  const system =
    "You are an expert hypertrophy coach. You design a weekly resistance-training " +
    "split by choosing exercises ONLY from a provided candidate list and prescribing " +
    "sets, a rep range, and reps-in-reserve (RIR). Honor the lifter's goal, experience, " +
    "muscle emphasis, and any injuries. Favor compound lifts early in each day. " +
    "Respond with JSON only — no prose, no markdown fences.";

  const user = [
    `Lifter profile:`,
    `- Goal: ${ctx.goal}`,
    `- Experience: ${ctx.experience}`,
    `- Days per week: ${ctx.daysPerWeek}`,
    `- Session length: ${ctx.sessionMinutes} min (~${budget} exercises per day)`,
    `- Preferred rep style: ${ctx.repPref}`,
    `- Muscle emphasis: ${ctx.emphasis.length ? ctx.emphasis.join(", ") : "balanced"}`,
    `- Injuries / avoid: ${ctx.injuries || "none"}`,
    ``,
    `Weekly split (${split.name}):`,
    dayList,
    ``,
    `Candidate exercises (slug | name | primary muscle | mechanic | equipment):`,
    candidateList,
    ``,
    `Build ${split.days.length} day(s), in the same order as above, each with about ${budget} exercises.`,
    `Use ONLY slugs from the candidate list. Give compounds 3-4 sets and isolations 2-4 sets.`,
    `Rep ranges should match the preferred rep style; RIR 1-3 (use 1-2 for compounds, 2-3 for isolations).`,
    `Avoid exercises that conflict with the stated injuries.`,
    ``,
    `Return JSON exactly like:`,
    `{"days":[{"exercises":[{"slug":"barbell-bench-press","sets":4,"rep_low":6,"rep_high":10,"rir":2}]}]}`,
  ].join("\n");

  let text = "";
  try {
    const resp = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: user }],
    });
    text = resp.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  } catch {
    return null;
  }

  const json = extractJson(text);
  if (!json) return null;
  const parsed = aiSchema.safeParse(json);
  if (!parsed.success) return null;

  const days: GeneratedDay[] = split.days.map((day, i) => {
    const aiDay = parsed.data.days[i];
    const seen = new Set<string>();
    const exercises: GeneratedExercise[] = [];
    for (const ex of aiDay?.exercises ?? []) {
      const cand = bySlug.get(ex.slug);
      if (!cand || seen.has(ex.slug)) continue;
      seen.add(ex.slug);
      const low = clamp(ex.rep_low, 1, 30);
      const high = clamp(Math.max(ex.rep_high, low), low, 50);
      exercises.push({
        slug: ex.slug,
        sets: clamp(ex.sets, 1, 8),
        rep_low: low,
        rep_high: high,
        rir: clamp(ex.rir, 0, 5),
      });
    }
    return { label: day.label, focus: day.focus, exercises };
  });

  // If the model under-delivered on any day, the plan is unusable — bail to
  // the deterministic fill so the user always gets a complete program.
  if (days.some((d) => d.exercises.length < 3)) return null;

  return { split_name: split.name, generated_by: "ai", days };
}

// ---------------------------------------------------------------------
// Public entry point: try AI, fall back to the deterministic backbone.
// ---------------------------------------------------------------------
export async function generateProgramPlan(
  ctx: GenContext,
  candidates: Candidate[],
): Promise<GeneratedPlan> {
  const split = splitFor(ctx.daysPerWeek);
  if (candidates.length === 0) {
    // No equipment match at all — return empty days off the template.
    return {
      split_name: split.name,
      generated_by: "template",
      days: split.days.map((d) => ({ label: d.label, focus: d.focus, exercises: [] })),
    };
  }
  const ai = await aiPlan(ctx, candidates, split);
  return ai ?? deterministicPlan(ctx, candidates, split);
}
