import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerClient } from "@/lib/supabase/server";
import { StaxLogo } from "@/components/stax-logo";
import { muscleLabel } from "@/lib/exercises";

export const metadata = { title: "Workout — Stax" };

type SetRow = {
  position: number;
  set_index: number;
  exercise_id: string;
  weight: number | null;
  reps: number | null;
  done: boolean;
  notes: string | null;
};
type Group = {
  position: number;
  name: string;
  muscle: string;
  note: string | null;
  sets: SetRow[];
};

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, user_id, label, status, unit, completed_at")
    .eq("id", id)
    .maybeSingle();

  if (!workout || (workout.user_id as string) !== user.id) {
    redirect("/workouts");
  }
  if (workout.status === "in_progress") {
    redirect(`/workout/${id}`);
  }

  const unit = workout.unit === "metric" ? "kg" : "lb";

  const { data: sData } = await supabase
    .from("workout_sets")
    .select("position, set_index, exercise_id, weight, reps, done, notes")
    .eq("workout_id", id);
  const rows = (sData ?? []) as SetRow[];

  const exIds = Array.from(new Set(rows.map((r) => r.exercise_id)));
  const nameMap = new Map<string, { name: string; muscle: string }>();
  if (exIds.length) {
    const { data: exRows } = await supabase
      .from("exercises")
      .select("id, name, primary_muscle")
      .in("id", exIds);
    for (const e of exRows ?? [])
      nameMap.set(e.id as string, {
        name: e.name as string,
        muscle: e.primary_muscle as string,
      });
  }

  const byPos = new Map<number, Group>();
  for (const s of rows) {
    let g = byPos.get(s.position);
    if (!g) {
      const meta = nameMap.get(s.exercise_id);
      g = {
        position: s.position,
        name: meta?.name ?? "Exercise",
        muscle: meta?.muscle ?? "",
        note: s.notes ?? null,
        sets: [],
      };
      byPos.set(s.position, g);
    }
    g.sets.push(s);
  }
  const groups = Array.from(byPos.values()).sort(
    (a, b) => a.position - b.position,
  );
  for (const g of groups) g.sets.sort((a, b) => a.set_index - b.set_index);

  return (
    <main className="min-h-screen px-5 py-8">
      <div className="w-full max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <StaxLogo size={36} />
            <div>
              <p className="text-[11px] uppercase tracking-widest text-steel">
                Workout
              </p>
              <h1 className="text-lg font-bold tracking-wide">
                {workout.label}
              </h1>
            </div>
          </div>
          <Link
            href="/workouts"
            className="text-sm text-steel hover:text-cream transition"
          >
            Back
          </Link>
        </div>
        <p className="text-xs text-steel mb-6">{fmtDate(workout.completed_at)}</p>

        <div className="space-y-4">
          {groups.map((g) => (
            <section
              key={g.position}
              className="bg-slate800 border border-white/5 rounded-2xl overflow-hidden"
            >
              <div className="px-4 pt-3 pb-2 border-b border-white/5">
                <h2 className="font-semibold text-cream">{g.name}</h2>
                <p className="text-xs text-steel mt-0.5">
                  {muscleLabel(g.muscle)}
                </p>
              </div>
              <ul className="divide-y divide-white/5">
                {g.sets.map((s) => (
                  <li
                    key={s.set_index}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <span className="text-sm text-steel">Set {s.set_index}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-sm text-cream tabular-nums">
                        {s.weight != null
                          ? `${s.weight} ${unit} × ${s.reps ?? "—"}`
                          : `${s.reps ?? "—"} reps`}
                      </span>
                      <span
                        className={
                          s.done ? "text-lime text-sm" : "text-steel/40 text-sm"
                        }
                      >
                        ✓
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
