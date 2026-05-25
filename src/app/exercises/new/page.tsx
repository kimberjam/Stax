import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerClient } from "@/lib/supabase/server";
import { StaxLogo } from "@/components/stax-logo";
import {
  MUSCLE_GROUPS,
  EQUIPMENT_OPTIONS,
  MECHANICS,
  PATTERNS,
} from "@/lib/exercises";
import { addCustomExercise } from "./actions";

export const metadata = { title: "Add exercise — Stax" };

const labelCls = "block text-xs uppercase tracking-widest text-steel mb-2";
const inputCls =
  "w-full bg-slate800 border border-white/10 rounded-xl px-4 py-3 text-cream placeholder-steel focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition";

export default async function NewExercisePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: appUser } = await supabase
    .from("app_users")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = appUser?.role === "admin";

  return (
    <main className="min-h-screen px-5 py-8">
      <div className="w-full max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <StaxLogo size={40} />
            <h1 className="text-lg font-bold tracking-wide">Add exercise</h1>
          </div>
          <Link
            href="/exercises"
            className="text-sm text-steel hover:text-cream transition"
          >
            Cancel
          </Link>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-coral/20 border border-coral/40 text-coral text-sm">
            {decodeURIComponent(error)}
          </div>
        )}

        <form action={addCustomExercise} className="space-y-5">
          <div>
            <label htmlFor="name" className={labelCls}>
              Exercise name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={80}
              placeholder="e.g. Cable Y-Raise"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="primary_muscle" className={labelCls}>
              Primary muscle
            </label>
            <select
              id="primary_muscle"
              name="primary_muscle"
              required
              defaultValue=""
              className={inputCls}
            >
              <option value="" disabled>
                Choose a muscle…
              </option>
              {MUSCLE_GROUPS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className={labelCls}>Equipment needed</span>
            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT_OPTIONS.map((e) => (
                <label
                  key={e.value}
                  className="flex items-center gap-2 bg-slate800 border border-white/10 rounded-xl px-3 py-2.5 cursor-pointer hover:border-white/20 transition"
                >
                  <input
                    type="checkbox"
                    name="equipment"
                    value={e.value}
                    className="accent-lime"
                  />
                  <span className="text-sm text-cream">{e.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-steel mt-1.5">
              Leave all unchecked for a bodyweight movement.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="mechanic" className={labelCls}>
                Type
              </label>
              <select
                id="mechanic"
                name="mechanic"
                defaultValue="compound"
                className={inputCls}
              >
                {MECHANICS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pattern" className={labelCls}>
                Pattern
              </label>
              <select
                id="pattern"
                name="pattern"
                defaultValue="other"
                className={inputCls}
              >
                {PATTERNS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="is_unilateral"
              className="accent-lime"
            />
            <span className="text-sm text-cream">
              One side at a time (unilateral)
            </span>
          </label>

          <div>
            <label htmlFor="cue" className={labelCls}>
              Form cue <span className="text-steel/70 lowercase tracking-normal">(optional)</span>
            </label>
            <textarea
              id="cue"
              name="cue"
              rows={2}
              maxLength={500}
              placeholder="A short reminder for how to do it well."
              className={`${inputCls} resize-none`}
            />
          </div>

          {isAdmin && (
            <label className="flex items-start gap-2.5 cursor-pointer bg-violet/10 border border-violet/30 rounded-xl px-3 py-3">
              <input
                type="checkbox"
                name="shared"
                className="accent-violet mt-0.5"
              />
              <span className="text-sm text-cream">
                Add to the shared library
                <span className="block text-xs text-steel mt-0.5">
                  Everyone in Stax will see this exercise. Leave off to keep it
                  private to you.
                </span>
              </span>
            </label>
          )}

          <button
            type="submit"
            className="w-full bg-lime text-obsidian font-bold py-3 rounded-xl hover:bg-lime-dark transition active:scale-[0.98]"
          >
            Save exercise
          </button>
        </form>
      </div>
    </main>
  );
}
