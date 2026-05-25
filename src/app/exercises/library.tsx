"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StaxLogo } from "@/components/stax-logo";
import { cn } from "@/lib/utils";
import {
  MUSCLE_GROUPS,
  muscleLabel,
  equipmentLabel,
  isAvailable,
  type ExerciseRow,
} from "@/lib/exercises";

export function ExerciseLibrary({
  exercises,
  myEquipment,
  currentUserId,
}: {
  exercises: ExerciseRow[];
  myEquipment: string[];
  currentUserId: string;
}) {
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState<string>("all");
  const [availableOnly, setAvailableOnly] = useState(false);

  const presentMuscles = useMemo(() => {
    const set = new Set(exercises.map((e) => e.primary_muscle));
    return MUSCLE_GROUPS.filter((m) => set.has(m.value));
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      if (muscle !== "all" && ex.primary_muscle !== muscle) return false;
      if (availableOnly && !isAvailable(ex.equipment, myEquipment)) return false;
      return true;
    });
  }, [exercises, search, muscle, availableOnly, myEquipment]);

  return (
    <main className="min-h-screen px-5 py-8">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <StaxLogo size={40} />
            <div>
              <h1 className="text-lg font-bold tracking-wide">Exercise library</h1>
              <p className="text-xs text-steel">{exercises.length} movements</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-sm text-steel hover:text-cream transition"
          >
            Home
          </Link>
        </div>

        {/* Search */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises…"
          className="w-full bg-slate800 border border-white/10 rounded-xl px-4 py-3 text-cream placeholder-steel focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition mb-3"
        />

        {/* Toggle + add */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <button
            type="button"
            onClick={() => setAvailableOnly((v) => !v)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium border transition active:scale-[0.97]",
              availableOnly
                ? "border-lime bg-lime text-obsidian"
                : "border-white/10 bg-slate800 text-cream hover:border-white/20",
            )}
          >
            {availableOnly ? "✓ My equipment" : "My equipment"}
          </button>
          <Link
            href="/exercises/new"
            className="rounded-full px-4 py-2 text-sm font-medium bg-violet/20 border border-violet/40 text-violet hover:bg-violet/30 transition"
          >
            + Add exercise
          </Link>
        </div>

        {/* Muscle chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-5 px-5">
          <Chip selected={muscle === "all"} onClick={() => setMuscle("all")}>
            All
          </Chip>
          {presentMuscles.map((m) => (
            <Chip
              key={m.value}
              selected={muscle === m.value}
              onClick={() => setMuscle(m.value)}
            >
              {m.label}
            </Chip>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <p className="text-sm text-steel text-center py-12">
            No exercises match. Try clearing a filter.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((ex) => (
              <ExerciseCard
                key={ex.id}
                ex={ex}
                owned={myEquipment}
                isMine={ex.owner_id === currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium border transition",
        selected
          ? "border-lime bg-lime text-obsidian"
          : "border-white/10 bg-slate800 text-cream hover:border-white/20",
      )}
    >
      {children}
    </button>
  );
}

function ExerciseCard({
  ex,
  owned,
  isMine,
}: {
  ex: ExerciseRow;
  owned: string[];
  isMine: boolean;
}) {
  const available = isAvailable(ex.equipment, owned);
  const equip = ex.equipment.length ? ex.equipment : ["bodyweight"];

  return (
    <details className="group bg-slate800 border border-white/5 rounded-xl overflow-hidden">
      <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-cream truncate">{ex.name}</span>
            {isMine && (
              <span className="text-[10px] uppercase tracking-wider text-violet border border-violet/40 rounded px-1.5 py-0.5 shrink-0">
                Custom
              </span>
            )}
          </div>
          <p className="text-xs text-steel mt-0.5">
            {muscleLabel(ex.primary_muscle)} · {ex.mechanic}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!available && <span className="text-[10px] text-amber">missing gear</span>}
          <span className="text-steel transition-transform group-open:rotate-180">⌄</span>
        </div>
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-3">
        {ex.cue && (
          <p className="text-sm text-cream/80 leading-relaxed">{ex.cue}</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {equip.map((t) => (
            <span
              key={t}
              className="text-[11px] text-steel bg-obsidian border border-white/10 rounded-full px-2 py-0.5"
            >
              {t === "bodyweight" ? "Bodyweight" : equipmentLabel(t)}
            </span>
          ))}
          {ex.is_unilateral && (
            <span className="text-[11px] text-steel bg-obsidian border border-white/10 rounded-full px-2 py-0.5">
              Unilateral
            </span>
          )}
        </div>
        {ex.secondary_muscles.length > 0 && (
          <p className="text-xs text-steel">
            Also works: {ex.secondary_muscles.map(muscleLabel).join(", ")}
          </p>
        )}
      </div>
    </details>
  );
}
