import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerClient } from "@/lib/supabase/server";
import { StaxLogo } from "@/components/stax-logo";

export const metadata = { title: "Progress — Stax" };

type WorkoutLite = { id: string; completed_at: string | null };
type SetLite = {
  workout_id: string;
  exercise_id: string;
  weight: number | null;
  reps: number | null;
};

const WEEK_MS = 7 * 24 * 3600 * 1000;
const WEEKS = 8;

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate800 border border-white/5 rounded-xl px-4 py-3">
      <p className="text-2xl font-bold text-cream tabular-nums">{value}</p>
      <p className="text-[11px] uppercase tracking-widest text-steel mt-0.5">
        {label}
      </p>
    </div>
  );
}

export default async function ProgressPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_units")
    .eq("user_id", user.id)
    .maybeSingle();
  const unit = profile?.preferred_units === "metric" ? "kg" : "lb";

  const { data: wData } = await supabase
    .from("workouts")
    .select("id, completed_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(200);
  const workouts = (wData ?? []) as WorkoutLite[];

  let sets: SetLite[] = [];
  const nameMap = new Map<string, string>();
  if (workouts.length) {
    const ids = workouts.map((w) => w.id);
    const { data: sData } = await supabase
      .from("workout_sets")
      .select("workout_id, exercise_id, weight, reps")
      .in("workout_id", ids)
      .eq("done", true);
    sets = (sData ?? []) as SetLite[];

    const exIds = Array.from(new Set(sets.map((s) => s.exercise_id)));
    if (exIds.length) {
      const { data: exRows } = await supabase
        .from("exercises")
        .select("id, name")
        .in("id", exIds);
      for (const e of exRows ?? [])
        nameMap.set(e.id as string, e.name as string);
    }
  }

  // --- Stats ---
  const totalWorkouts = workouts.length;
  const totalSets = sets.length;
  let totalVolume = 0;
  const volByWorkout = new Map<string, number>();
  for (const s of sets) {
    if (s.weight == null || s.reps == null) continue;
    const v = Number(s.weight) * Number(s.reps);
    totalVolume += v;
    volByWorkout.set(s.workout_id, (volByWorkout.get(s.workout_id) ?? 0) + v);
  }
  const now = Date.now();
  const thisWeek = workouts.filter(
    (w) => w.completed_at && now - new Date(w.completed_at).getTime() < WEEK_MS,
  ).length;

  // --- Weekly volume buckets (index 0 = oldest, WEEKS-1 = this week) ---
  const buckets = new Array(WEEKS).fill(0) as number[];
  for (const w of workouts) {
    if (!w.completed_at) continue;
    const weeksAgo = Math.floor(
      (now - new Date(w.completed_at).getTime()) / WEEK_MS,
    );
    if (weeksAgo < 0 || weeksAgo >= WEEKS) continue;
    buckets[WEEKS - 1 - weeksAgo] += volByWorkout.get(w.id) ?? 0;
  }
  const maxBucket = Math.max(1, ...buckets);
  const hasVolume = totalVolume > 0;

  // --- Personal records ---
  type PR = { name: string; bestWeight: number; bestReps: number; e1rm: number };
  const prMap = new Map<string, PR>();
  for (const s of sets) {
    if (s.weight == null || s.reps == null) continue;
    const w = Number(s.weight);
    const r = Number(s.reps);
    if (w <= 0) continue;
    const e = w * (1 + r / 30);
    const name = nameMap.get(s.exercise_id) ?? "Exercise";
    const cur = prMap.get(s.exercise_id);
    if (!cur) {
      prMap.set(s.exercise_id, { name, bestWeight: w, bestReps: r, e1rm: e });
    } else {
      if (w > cur.bestWeight || (w === cur.bestWeight && r > cur.bestReps)) {
        cur.bestWeight = w;
        cur.bestReps = r;
      }
      if (e > cur.e1rm) cur.e1rm = e;
    }
  }
  const prs = Array.from(prMap.values())
    .sort((a, b) => b.e1rm - a.e1rm)
    .slice(0, 12);

  return (
    <main className="min-h-screen px-5 py-8">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <StaxLogo size={40} />
            <h1 className="text-lg font-bold tracking-wide">Progress</h1>
          </div>
          <Link href="/" className="text-sm text-steel hover:text-cream transition">
            Home
          </Link>
        </div>

        {totalWorkouts === 0 ? (
          <section className="bg-slate800 border border-white/5 rounded-2xl p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Nothing to show yet</h2>
            <p className="text-sm text-cream/80 leading-relaxed mb-6">
              Finish a workout and your stats, volume trend, and personal records
              will appear here.
            </p>
            <Link
              href="/program"
              className="inline-block bg-lime text-obsidian font-bold py-3 px-6 rounded-xl hover:bg-lime-dark transition"
            >
              Go to my program
            </Link>
          </section>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <Stat label="Workouts" value={totalWorkouts} />
              <Stat label="This week" value={thisWeek} />
              <Stat label="Sets logged" value={totalSets} />
              <Stat
                label={`Volume (${unit})`}
                value={Math.round(totalVolume).toLocaleString()}
              />
            </div>

            {/* Weekly volume */}
            <section className="bg-slate800 border border-white/5 rounded-2xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-cream mb-4">
                Weekly volume
              </h2>
              {hasVolume ? (
                <>
                  <div className="flex items-end gap-1.5 h-40">
                    {buckets.map((v, i) => {
                      const pct = (v / maxBucket) * 100;
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col justify-end h-full"
                          title={`${Math.round(v).toLocaleString()} ${unit}`}
                        >
                          <div
                            className="w-full rounded-t bg-lime"
                            style={{ height: `${v > 0 ? Math.max(pct, 3) : 0}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-steel mt-2">
                    <span>{WEEKS} weeks ago</span>
                    <span>this week</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-steel">
                  Log the weight on your sets and your training volume will chart
                  here.
                </p>
              )}
            </section>

            {/* Personal records */}
            <section>
              <h2 className="text-sm font-semibold text-cream mb-3">
                Personal records
              </h2>
              {prs.length === 0 ? (
                <p className="text-sm text-steel">
                  Once you log weight × reps on a lift, your best sets and
                  estimated 1-rep-max show up here.
                </p>
              ) : (
                <div className="space-y-2">
                  {prs.map((pr) => (
                    <div
                      key={pr.name}
                      className="flex items-center justify-between gap-3 bg-slate800 border border-white/5 rounded-xl px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-cream truncate">
                          {pr.name}
                        </p>
                        <p className="text-xs text-steel mt-0.5">
                          best {pr.bestWeight} × {pr.bestReps} {unit}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-lime">
                          {Math.round(pr.e1rm).toLocaleString()} {unit}
                        </p>
                        <p className="text-[11px] text-steel">est. 1RM</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
