"use client";

import { useState, useTransition } from "react";
import { StaxLogo } from "@/components/stax-logo";
import { cn } from "@/lib/utils";
import { muscleLabel } from "@/lib/exercises";
import { saveWorkout } from "../actions";

export type SessionSet = {
  id: string;
  setIndex: number;
  targetRepLow: number | null;
  targetRepHigh: number | null;
  targetRir: number | null;
  weight: number | null;
  reps: number | null;
  done: boolean;
};
export type SessionExercise = {
  position: number;
  name: string;
  primaryMuscle: string;
  cue: string | null;
  sets: SessionSet[];
};

type Editable = { weight: string; reps: string; done: boolean };

const numInput =
  "w-full bg-obsidian border border-white/10 rounded-lg px-3 py-2 text-cream text-center placeholder-steel focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition";

export function WorkoutSession({
  workoutId,
  label,
  unit,
  exercises,
}: {
  workoutId: string;
  label: string;
  unit: string;
  exercises: SessionExercise[];
}) {
  const [pending, start] = useTransition();
  const [vals, setVals] = useState<Record<string, Editable>>(() => {
    const init: Record<string, Editable> = {};
    for (const ex of exercises) {
      for (const s of ex.sets) {
        init[s.id] = {
          weight: s.weight != null ? String(s.weight) : "",
          reps: s.reps != null ? String(s.reps) : "",
          done: s.done,
        };
      }
    }
    return init;
  });

  const totalSets = exercises.reduce((n, e) => n + e.sets.length, 0);
  const doneCount = Object.values(vals).filter((v) => v.done).length;

  function update(id: string, patch: Partial<Editable>) {
    setVals((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function submit(finish: boolean) {
    const payload = Object.entries(vals).map(([id, v]) => {
      const weight = v.weight.trim() === "" ? null : Number(v.weight);
      const reps = v.reps.trim() === "" ? null : parseInt(v.reps, 10);
      return {
        id,
        weight: weight != null && !Number.isNaN(weight) ? weight : null,
        reps: reps != null && !Number.isNaN(reps) ? reps : null,
        done: v.done,
      };
    });
    start(async () => {
      await saveWorkout(workoutId, payload, finish);
    });
  }

  return (
    <main className="min-h-screen px-5 py-8 pb-32">
      <div className="w-full max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <StaxLogo size={36} />
          <div>
            <p className="text-[11px] uppercase tracking-widest text-steel">
              Workout
            </p>
            <h1 className="text-lg font-bold tracking-wide">{label}</h1>
          </div>
        </div>
        <p className="text-xs text-steel mb-6">
          {doneCount} of {totalSets} sets done
        </p>

        {/* Exercises */}
        <div className="space-y-4">
          {exercises.map((ex) => (
            <section
              key={ex.position}
              className="bg-slate800 border border-white/5 rounded-2xl overflow-hidden"
            >
              <div className="px-4 pt-3 pb-2 border-b border-white/5">
                <h2 className="font-semibold text-cream">{ex.name}</h2>
                <p className="text-xs text-steel mt-0.5">
                  {muscleLabel(ex.primaryMuscle)}
                </p>
              </div>

              {/* column labels */}
              <div className="grid grid-cols-[2.2rem_1fr_1fr_2.5rem] gap-2 px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-steel">
                <span>Set</span>
                <span className="text-center">Weight ({unit})</span>
                <span className="text-center">Reps</span>
                <span className="text-center">Done</span>
              </div>

              <div className="px-4 pb-3 space-y-2">
                {ex.sets.map((s) => {
                  const v = vals[s.id];
                  const target =
                    s.targetRepLow && s.targetRepHigh
                      ? `${s.targetRepLow}–${s.targetRepHigh}${
                          s.targetRir != null ? ` @ ${s.targetRir} RIR` : ""
                        }`
                      : "";
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "grid grid-cols-[2.2rem_1fr_1fr_2.5rem] gap-2 items-center rounded-lg transition",
                        v.done && "bg-lime/5",
                      )}
                    >
                      <div className="text-sm text-steel">
                        <div className="font-semibold text-cream">{s.setIndex}</div>
                        {target && (
                          <div className="text-[9px] leading-tight text-steel">
                            {target}
                          </div>
                        )}
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        placeholder="—"
                        value={v.weight}
                        onChange={(e) => update(s.id, { weight: e.target.value })}
                        className={numInput}
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder={
                          s.targetRepLow ? String(s.targetRepLow) : "—"
                        }
                        value={v.reps}
                        onChange={(e) => update(s.id, { reps: e.target.value })}
                        className={numInput}
                      />
                      <button
                        type="button"
                        aria-label="Mark set done"
                        onClick={() => update(s.id, { done: !v.done })}
                        className={cn(
                          "h-9 w-9 mx-auto rounded-lg border flex items-center justify-center transition",
                          v.done
                            ? "bg-lime border-lime text-obsidian"
                            : "border-white/15 text-steel hover:border-white/30",
                        )}
                      >
                        ✓
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 inset-x-0 bg-obsidian/95 border-t border-white/10 backdrop-blur px-5 py-3">
        <div className="w-full max-w-xl mx-auto flex gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => submit(false)}
            className="flex-1 bg-obsidian border border-white/15 text-cream font-medium py-3 rounded-xl hover:bg-white/5 transition active:scale-[0.98] disabled:opacity-50"
          >
            Save &amp; exit
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => submit(true)}
            className="flex-[2] bg-lime text-obsidian font-bold py-3 rounded-xl hover:bg-lime-dark transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait"
          >
            {pending ? "Saving…" : "Finish workout"}
          </button>
        </div>
      </div>
    </main>
  );
}
