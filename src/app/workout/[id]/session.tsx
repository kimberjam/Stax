"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { StaxLogo } from "@/components/stax-logo";
import { cn } from "@/lib/utils";
import { muscleLabel } from "@/lib/exercises";
import { saveWorkout, swapExercise } from "../actions";

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
  exerciseId: string;
  name: string;
  primaryMuscle: string;
  cue: string | null;
  note: string | null;
  sets: SessionSet[];
};
export type SwapCandidate = {
  id: string;
  name: string;
  primary_muscle: string;
  mechanic: string;
};

type Editable = { weight: string; reps: string; done: boolean };

const numInput =
  "w-full bg-obsidian border border-white/10 rounded-lg px-3 py-2 text-cream text-center placeholder-steel focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition";

function fmtTime(total: number) {
  const s = Math.floor(total);
  const sec = s % 60;
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) {
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function WorkoutSession({
  workoutId,
  label,
  unit,
  exercises,
  candidates,
  deload = false,
}: {
  workoutId: string;
  label: string;
  unit: string;
  exercises: SessionExercise[];
  candidates: SwapCandidate[];
  deload?: boolean;
}) {
  const [pending, start] = useTransition();
  const [swapPos, setSwapPos] = useState<number | null>(null);
  const [swapSearch, setSwapSearch] = useState("");
  const [swapAll, setSwapAll] = useState(false);

  // Session stopwatch — in-memory, timestamp-based so it stays accurate even
  // if the tab is backgrounded.
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const accRef = useRef(0);
  useEffect(() => {
    if (!running) return;
    startedAtRef.current = Date.now();
    const tick = () => {
      const since = startedAtRef.current
        ? (Date.now() - startedAtRef.current) / 1000
        : 0;
      setElapsed(accRef.current + since);
    };
    tick();
    const t = setInterval(tick, 250);
    return () => {
      if (startedAtRef.current) {
        accRef.current += (Date.now() - startedAtRef.current) / 1000;
        startedAtRef.current = null;
      }
      clearInterval(t);
    };
  }, [running]);
  function resetTimer() {
    startedAtRef.current = null;
    accRef.current = 0;
    setElapsed(0);
    setRunning(false);
  }

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

  function buildPayload() {
    return Object.entries(vals).map(([id, v]) => {
      const weight = v.weight.trim() === "" ? null : Number(v.weight);
      const reps = v.reps.trim() === "" ? null : parseInt(v.reps, 10);
      return {
        id,
        weight: weight != null && !Number.isNaN(weight) ? weight : null,
        reps: reps != null && !Number.isNaN(reps) ? reps : null,
        done: v.done,
      };
    });
  }

  function submit(finish: boolean) {
    const payload = buildPayload();
    start(async () => {
      await saveWorkout(workoutId, payload, finish);
    });
  }

  function doSwap(candidateId: string) {
    if (swapPos == null) return;
    const pos = swapPos;
    const payload = buildPayload();
    setSwapPos(null);
    start(async () => {
      await swapExercise(workoutId, pos, candidateId, payload);
    });
  }

  const swapGroup =
    swapPos !== null ? exercises.find((e) => e.position === swapPos) : null;
  const swapMuscle = swapGroup?.primaryMuscle ?? "";
  const swapList = candidates.filter((c) => {
    if (c.id === swapGroup?.exerciseId) return false;
    if (!swapAll && c.primary_muscle !== swapMuscle) return false;
    const q = swapSearch.trim().toLowerCase();
    if (q && !c.name.toLowerCase().includes(q)) return false;
    return true;
  });

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
        <p className="text-xs text-steel mb-4">
          {doneCount} of {totalSets} sets done
        </p>

        {/* Session timer */}
        <div className="flex items-center gap-3 mb-6 bg-slate800 border border-white/5 rounded-xl px-4 py-2.5">
          <span className="text-2xl font-bold tabular-nums tracking-wide text-cream">
            {fmtTime(elapsed)}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition active:scale-[0.97]",
                running
                  ? "bg-amber/20 border border-amber/40 text-amber"
                  : "bg-lime text-obsidian",
              )}
            >
              {running ? "Pause" : "Start"}
            </button>
            <button
              type="button"
              onClick={resetTimer}
              className="rounded-lg px-4 py-2 text-sm font-medium border border-white/15 text-cream hover:bg-white/5 transition active:scale-[0.97]"
            >
              Reset
            </button>
          </div>
        </div>

        {deload && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-amber/15 border border-amber/40 text-amber text-sm">
            Recovery week — fewer sets and lighter loads on purpose. Take it
            easy and let your body rebound.
          </div>
        )}

        {/* Exercises */}
        <div className="space-y-4">
          {exercises.map((ex) => (
            <section
              key={ex.position}
              className="bg-slate800 border border-white/5 rounded-2xl overflow-hidden"
            >
              <div className="px-4 pt-3 pb-2 border-b border-white/5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-cream truncate">{ex.name}</h2>
                  <p className="text-xs text-steel mt-0.5">
                    {muscleLabel(ex.primaryMuscle)}
                  </p>
                  {!deload && ex.note && (
                    <p className="text-[11px] text-lime mt-1">{ex.note}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSwapPos(ex.position);
                    setSwapSearch("");
                    setSwapAll(false);
                  }}
                  className="shrink-0 text-xs text-violet border border-violet/40 rounded-full px-3 py-1 hover:bg-violet/10 transition"
                >
                  Swap
                </button>
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

      {/* Swap picker overlay */}
      {swapPos !== null && (
        <div className="fixed inset-0 z-50 bg-obsidian/95 backdrop-blur flex flex-col">
          <div className="w-full max-w-xl mx-auto flex flex-col flex-1 min-h-0 p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold tracking-wide">Swap exercise</h2>
              <button
                type="button"
                onClick={() => setSwapPos(null)}
                className="text-sm text-steel hover:text-cream transition"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-steel mb-4">
              Replaces it for this workout only — your program stays the same.
            </p>

            <input
              type="search"
              value={swapSearch}
              onChange={(e) => setSwapSearch(e.target.value)}
              placeholder="Search exercises…"
              className="w-full bg-slate800 border border-white/10 rounded-xl px-4 py-3 text-cream placeholder-steel focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition mb-3"
            />

            <button
              type="button"
              onClick={() => setSwapAll((v) => !v)}
              className={cn(
                "self-start rounded-full px-4 py-1.5 text-sm font-medium border transition mb-4",
                swapAll
                  ? "border-white/15 bg-slate800 text-cream"
                  : "border-lime bg-lime text-obsidian",
              )}
            >
              {swapAll ? "Showing all muscles" : `${muscleLabel(swapMuscle)} only`}
            </button>

            <div className="flex-1 overflow-y-auto space-y-2 pb-4">
              {swapList.length === 0 ? (
                <p className="text-sm text-steel text-center py-8">
                  Nothing matches. Try “Showing all muscles” or a different search.
                </p>
              ) : (
                swapList.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={pending}
                    onClick={() => doSwap(c.id)}
                    className="w-full text-left rounded-xl border border-white/10 bg-slate800 px-4 py-3 hover:border-white/25 transition active:scale-[0.99] disabled:opacity-50"
                  >
                    <span className="font-medium text-cream">{c.name}</span>
                    <span className="block text-xs text-steel mt-0.5">
                      {muscleLabel(c.primary_muscle)} · {c.mechanic}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
