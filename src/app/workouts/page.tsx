import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerClient } from "@/lib/supabase/server";
import { StaxLogo } from "@/components/stax-logo";

export const metadata = { title: "Workout history — Stax" };

type SetLite = { weight: number | null; reps: number | null; done: boolean };
type WorkoutLite = {
  id: string;
  label: string;
  status: string;
  unit: string;
  started_at: string;
  completed_at: string | null;
  workout_sets: SetLite[];
};

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default async function WorkoutsPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("workouts")
    .select(
      "id, label, status, unit, started_at, completed_at, workout_sets(weight, reps, done)",
    )
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(60);

  const workouts = (data ?? []) as unknown as WorkoutLite[];
  const completed = workouts.filter((w) => w.status === "completed");
  const active = workouts.filter((w) => w.status === "in_progress");

  return (
    <main className="min-h-screen px-5 py-8">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <StaxLogo size={40} />
            <h1 className="text-lg font-bold tracking-wide">Workout history</h1>
          </div>
          <Link href="/" className="text-sm text-steel hover:text-cream transition">
            Home
          </Link>
        </div>

        {active.length > 0 && (
          <Link
            href={`/workout/${active[0].id}`}
            className="block mb-5 px-4 py-3 rounded-xl bg-lime/10 border border-lime/30 text-lime text-sm font-medium hover:bg-lime/20 transition"
          >
            Resume your {active[0].label} workout →
          </Link>
        )}

        {completed.length === 0 ? (
          <section className="bg-slate800 border border-white/5 rounded-2xl p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">No workouts logged yet</h2>
            <p className="text-sm text-cream/80 leading-relaxed mb-6">
              Start a session from your program and it&rsquo;ll show up here.
            </p>
            <Link
              href="/program"
              className="inline-block bg-lime text-obsidian font-bold py-3 px-6 rounded-xl hover:bg-lime-dark transition"
            >
              Go to my program
            </Link>
          </section>
        ) : (
          <div className="space-y-2">
            {completed.map((w) => {
              const doneSets = w.workout_sets.filter((s) => s.done);
              const volume = doneSets.reduce(
                (n, s) => n + (Number(s.weight) || 0) * (s.reps || 0),
                0,
              );
              const unit = w.unit === "metric" ? "kg" : "lb";
              return (
                <div
                  key={w.id}
                  className="bg-slate800 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-cream">{w.label}</p>
                    <p className="text-xs text-steel mt-0.5">
                      {fmtDate(w.completed_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-lime">
                      {doneSets.length} sets
                    </p>
                    {volume > 0 && (
                      <p className="text-[11px] text-steel">
                        {Math.round(volume).toLocaleString()} {unit} volume
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
