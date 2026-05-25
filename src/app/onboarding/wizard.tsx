"use client";

import { useMemo, useState } from "react";
import { StaxLogo } from "@/components/stax-logo";
import { cn } from "@/lib/utils";
import { saveOnboarding, type OnboardingPayload } from "./actions";

// --- Option data ------------------------------------------------------

const SEXES = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

const EXPERIENCE = [
  { value: "beginner", label: "Beginner", desc: "New to lifting (under a year)" },
  { value: "intermediate", label: "Intermediate", desc: "1–3 years training consistently" },
  { value: "advanced", label: "Advanced", desc: "3+ years, training dialed in" },
] as const;

const GOALS = [
  { value: "hypertrophy", label: "Build muscle", desc: "Maximize size and growth" },
  { value: "strength", label: "Get stronger", desc: "Heavier lifts, more force" },
  { value: "fat_loss", label: "Lose fat", desc: "Lean out while keeping muscle" },
  { value: "recomposition", label: "Build & lean", desc: "Add muscle and drop fat" },
  { value: "general_fitness", label: "General fitness", desc: "Look and feel good" },
] as const;

const EQUIPMENT = [
  { value: "full_gym", label: "Full gym", desc: "Racks, machines, cables, full dumbbells" },
  { value: "home_gym", label: "Home gym", desc: "Barbell, bench, adjustable dumbbells, pull-up bar" },
  { value: "minimal", label: "Minimal", desc: "A few dumbbells, maybe a bench and bands" },
  { value: "bodyweight", label: "Bodyweight", desc: "No equipment — bodyweight (bands optional)" },
] as const;

const REP_RANGES = [
  { value: "low", label: "Heavy & low reps", desc: "Strength-style, ~4–8 reps" },
  { value: "moderate", label: "Moderate", desc: "Classic hypertrophy, ~8–12 reps" },
  { value: "high", label: "High reps & pump", desc: "Higher volume, ~12–20 reps" },
  { value: "mixed", label: "Mix it up", desc: "Variety across rep ranges" },
] as const;

const MUSCLES = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps",
  "Quads", "Hamstrings", "Glutes", "Calves", "Core",
] as const;

// Display order Mon-first; value is the day-of-week number (0=Sun .. 6=Sat).
const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const;

const SESSION_OPTIONS = [30, 45, 60, 75, 90] as const;

const STEP_TITLES = ["Profile", "Goal", "Schedule", "Equipment", "Preferences", "Review"];

// --- Shared styles ----------------------------------------------------

const inputCls =
  "w-full bg-slate800 border border-white/10 rounded-xl px-4 py-3 text-cream placeholder-steel focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition";
const labelCls = "block text-xs uppercase tracking-widest text-steel mb-2";

// --- Small components -------------------------------------------------

function OptionCard({
  selected,
  onClick,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border px-4 py-3 transition active:scale-[0.99]",
        selected
          ? "border-lime bg-lime/10"
          : "border-white/10 bg-slate800 hover:border-white/20",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-cream">{title}</span>
        {selected && <span className="text-lime text-sm">✓</span>}
      </div>
      {desc && <p className="text-xs text-steel mt-0.5">{desc}</p>}
    </button>
  );
}

function Pill({
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
        "rounded-full px-4 py-2 text-sm font-medium border transition active:scale-[0.97]",
        selected
          ? "border-lime bg-lime text-obsidian"
          : "border-white/10 bg-slate800 text-cream hover:border-white/20",
      )}
    >
      {children}
    </button>
  );
}

// --- Helpers ----------------------------------------------------------

const round1 = (n: number) => Math.round(n * 10) / 10;

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

// --- Wizard -----------------------------------------------------------

export function OnboardingWizard({ displayName }: { displayName: string }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile
  const [units, setUnits] = useState<"imperial" | "metric">("imperial");
  const [sex, setSex] = useState<string>("");
  const [birthDate, setBirthDate] = useState<string>("");
  const [heightFeet, setHeightFeet] = useState<string>("");
  const [heightInches, setHeightInches] = useState<string>("");
  const [heightCm, setHeightCm] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [experience, setExperience] = useState<string>("");

  // Goal
  const [goal, setGoal] = useState<string>("");

  // Schedule
  const [daysPerWeek, setDaysPerWeek] = useState<number>(4);
  const [sessionMinutes, setSessionMinutes] = useState<number>(60);
  const [trainingDays, setTrainingDays] = useState<number[]>([]);

  // Equipment
  const [equipment, setEquipment] = useState<string>("");

  // Preferences
  const [focusMuscles, setFocusMuscles] = useState<string[]>([]);
  const [repRange, setRepRange] = useState<string>("moderate");
  const [notes, setNotes] = useState<string>("");

  const metric = useMemo(() => {
    let height_cm = NaN;
    let weight_kg = NaN;
    const w = parseFloat(weight);
    if (units === "imperial") {
      const ft = parseFloat(heightFeet);
      const inch = parseFloat(heightInches) || 0;
      if (!Number.isNaN(ft)) height_cm = round1((ft * 12 + inch) * 2.54);
      if (!Number.isNaN(w)) weight_kg = round1(w / 2.2046226218);
    } else {
      const cm = parseFloat(heightCm);
      if (!Number.isNaN(cm)) height_cm = round1(cm);
      if (!Number.isNaN(w)) weight_kg = round1(w);
    }
    return { height_cm, weight_kg };
  }, [units, heightFeet, heightInches, heightCm, weight]);

  const ageOk = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return false;
    const dob = new Date(birthDate);
    if (Number.isNaN(dob.getTime())) return false;
    const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
    return age >= 13 && age <= 100;
  }, [birthDate]);

  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return (
          sex !== "" &&
          ageOk &&
          experience !== "" &&
          metric.height_cm >= 100 &&
          metric.height_cm <= 260 &&
          metric.weight_kg >= 25 &&
          metric.weight_kg <= 350
        );
      case 1:
        return goal !== "";
      case 2:
        return daysPerWeek >= 1 && daysPerWeek <= 7 && sessionMinutes > 0;
      case 3:
        return equipment !== "";
      case 4:
        return true; // preferences are all optional
      default:
        return true;
    }
  }, [step, sex, ageOk, experience, metric, goal, daysPerWeek, sessionMinutes, equipment]);

  function next() {
    setError(null);
    setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const payload: OnboardingPayload = {
      preferred_units: units,
      sex: sex as OnboardingPayload["sex"],
      birth_date: birthDate,
      height_cm: metric.height_cm,
      starting_weight_kg: metric.weight_kg,
      experience_level: experience as OnboardingPayload["experience_level"],
      goal: goal as OnboardingPayload["goal"],
      days_per_week: daysPerWeek,
      session_minutes: sessionMinutes,
      training_days: [...trainingDays].sort((a, b) => a - b),
      equipment_profile: equipment as OnboardingPayload["equipment_profile"],
      favorite_muscles: focusMuscles.map((m) => m.toLowerCase()),
      rep_range_pref: repRange as OnboardingPayload["rep_range_pref"],
      notes,
    };

    const res = await saveOnboarding(payload);
    if (res.ok) {
      window.location.assign("/");
    } else {
      setError(res.error);
      setSubmitting(false);
    }
  }

  const progress = ((step + 1) / STEP_TITLES.length) * 100;

  return (
    <main className="min-h-screen px-5 py-8">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <StaxLogo size={40} />
          <div>
            <p className="text-[11px] uppercase tracking-widest text-steel">
              Step {step + 1} of {STEP_TITLES.length}
            </p>
            <h1 className="text-lg font-bold tracking-wide">
              {STEP_TITLES[step]}
            </h1>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-slate800 rounded-full mb-7 overflow-hidden">
          <div
            className="h-full bg-lime rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-coral/20 border border-coral/40 text-coral text-sm">
            {error}
          </div>
        )}

        {/* Steps */}
        {step === 0 && (
          <section className="space-y-6">
            <p className="text-sm text-cream/80 leading-relaxed">
              Hi {displayName} — let&rsquo;s set up your training. First, a few
              basics so Stax can size your starting weights.
            </p>

            {/* Units */}
            <div className="grid grid-cols-2 gap-2">
              <Pill selected={units === "imperial"} onClick={() => setUnits("imperial")}>
                Imperial (lbs)
              </Pill>
              <Pill selected={units === "metric"} onClick={() => setUnits("metric")}>
                Metric (kg)
              </Pill>
            </div>

            {/* Sex */}
            <div>
              <span className={labelCls}>Sex</span>
              <div className="grid grid-cols-2 gap-2">
                {SEXES.map((s) => (
                  <OptionCard
                    key={s.value}
                    selected={sex === s.value}
                    onClick={() => setSex(s.value)}
                    title={s.label}
                  />
                ))}
              </div>
            </div>

            {/* Birth date */}
            <div>
              <label htmlFor="birth_date" className={labelCls}>
                Date of birth
              </label>
              <input
                id="birth_date"
                type="date"
                value={birthDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setBirthDate(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Height */}
            <div>
              <span className={labelCls}>Height</span>
              {units === "imperial" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="5"
                      value={heightFeet}
                      onChange={(e) => setHeightFeet(e.target.value)}
                      className={inputCls}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-steel text-sm">
                      ft
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="10"
                      value={heightInches}
                      onChange={(e) => setHeightInches(e.target.value)}
                      className={inputCls}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-steel text-sm">
                      in
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="178"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className={inputCls}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-steel text-sm">
                    cm
                  </span>
                </div>
              )}
            </div>

            {/* Weight */}
            <div>
              <label htmlFor="weight" className={labelCls}>
                Current weight
              </label>
              <div className="relative">
                <input
                  id="weight"
                  type="number"
                  inputMode="decimal"
                  placeholder={units === "imperial" ? "185" : "84"}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className={inputCls}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-steel text-sm">
                  {units === "imperial" ? "lbs" : "kg"}
                </span>
              </div>
            </div>

            {/* Experience */}
            <div>
              <span className={labelCls}>Training experience</span>
              <div className="space-y-2">
                {EXPERIENCE.map((e) => (
                  <OptionCard
                    key={e.value}
                    selected={experience === e.value}
                    onClick={() => setExperience(e.value)}
                    title={e.label}
                    desc={e.desc}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-3">
            <p className="text-sm text-cream/80 leading-relaxed mb-2">
              What are you training for? This shapes how your programs are built.
            </p>
            {GOALS.map((g) => (
              <OptionCard
                key={g.value}
                selected={goal === g.value}
                onClick={() => setGoal(g.value)}
                title={g.label}
                desc={g.desc}
              />
            ))}
          </section>
        )}

        {step === 2 && (
          <section className="space-y-7">
            <div>
              <span className={labelCls}>Days per week</span>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <Pill
                    key={d}
                    selected={daysPerWeek === d}
                    onClick={() => setDaysPerWeek(d)}
                  >
                    {d}
                  </Pill>
                ))}
              </div>
            </div>

            <div>
              <span className={labelCls}>Time per session</span>
              <div className="flex flex-wrap gap-2">
                {SESSION_OPTIONS.map((m) => (
                  <Pill
                    key={m}
                    selected={sessionMinutes === m}
                    onClick={() => setSessionMinutes(m)}
                  >
                    {m} min
                  </Pill>
                ))}
              </div>
            </div>

            <div>
              <span className={labelCls}>
                Which days? <span className="text-steel/70 lowercase tracking-normal">(optional)</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => (
                  <Pill
                    key={d.value}
                    selected={trainingDays.includes(d.value)}
                    onClick={() => setTrainingDays((prev) => toggleInArray(prev, d.value))}
                  >
                    {d.label}
                  </Pill>
                ))}
              </div>
              <p className="text-xs text-steel mt-2">
                Skip this if your schedule changes week to week — we&rsquo;ll just
                plan {daysPerWeek} session{daysPerWeek === 1 ? "" : "s"}.
              </p>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-3">
            <p className="text-sm text-cream/80 leading-relaxed mb-2">
              What do you have to train with? Pick the closest match — you can
              fine-tune it later.
            </p>
            {EQUIPMENT.map((e) => (
              <OptionCard
                key={e.value}
                selected={equipment === e.value}
                onClick={() => setEquipment(e.value)}
                title={e.label}
                desc={e.desc}
              />
            ))}
          </section>
        )}

        {step === 4 && (
          <section className="space-y-7">
            <div>
              <span className={labelCls}>
                Muscles to emphasize{" "}
                <span className="text-steel/70 lowercase tracking-normal">(optional)</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {MUSCLES.map((m) => (
                  <Pill
                    key={m}
                    selected={focusMuscles.includes(m)}
                    onClick={() => setFocusMuscles((prev) => toggleInArray(prev, m))}
                  >
                    {m}
                  </Pill>
                ))}
              </div>
            </div>

            <div>
              <span className={labelCls}>Preferred rep style</span>
              <div className="space-y-2">
                {REP_RANGES.map((r) => (
                  <OptionCard
                    key={r.value}
                    selected={repRange === r.value}
                    onClick={() => setRepRange(r.value)}
                    title={r.label}
                    desc={r.desc}
                  />
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="notes" className={labelCls}>
                Injuries or anything to avoid{" "}
                <span className="text-steel/70 lowercase tracking-normal">(optional)</span>
              </label>
              <textarea
                id="notes"
                rows={3}
                placeholder="e.g. bad left shoulder — go easy on overhead pressing"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={cn(inputCls, "resize-none")}
                maxLength={1000}
              />
            </div>
          </section>
        )}

        {step === 5 && (
          <ReviewStep
            rows={buildReviewRows({
              units,
              sex,
              birthDate,
              heightFeet,
              heightInches,
              heightCm,
              weight,
              experience,
              goal,
              daysPerWeek,
              sessionMinutes,
              trainingDays,
              equipment,
              focusMuscles,
              repRange,
              notes,
            })}
            onEdit={setStep}
          />
        )}

        {/* Nav */}
        <div className="flex items-center gap-3 mt-9">
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              disabled={submitting}
              className="flex-1 bg-obsidian border border-white/10 text-cream font-medium py-3 rounded-xl hover:bg-white/5 transition active:scale-[0.98] disabled:opacity-50"
            >
              Back
            </button>
          )}

          {step < STEP_TITLES.length - 1 ? (
            <button
              type="button"
              onClick={next}
              disabled={!canProceed}
              className="flex-[2] bg-lime text-obsidian font-bold py-3 rounded-xl hover:bg-lime-dark transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-[2] bg-lime text-obsidian font-bold py-3 rounded-xl hover:bg-lime-dark transition active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Finish setup"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

// --- Review step ------------------------------------------------------

type ReviewRow = { label: string; value: string; step: number };

function buildReviewRows(s: {
  units: "imperial" | "metric";
  sex: string;
  birthDate: string;
  heightFeet: string;
  heightInches: string;
  heightCm: string;
  weight: string;
  experience: string;
  goal: string;
  daysPerWeek: number;
  sessionMinutes: number;
  trainingDays: number[];
  equipment: string;
  focusMuscles: string[];
  repRange: string;
  notes: string;
}): ReviewRow[] {
  const labelOf = <T extends string | number>(
    list: ReadonlyArray<{ value: T; label: string }>,
    value: T,
  ) => list.find((o) => o.value === value)?.label ?? "—";

  const height =
    s.units === "imperial"
      ? `${s.heightFeet || "—"}′ ${s.heightInches || "0"}″`
      : `${s.heightCm || "—"} cm`;
  const weightStr = s.weight
    ? `${s.weight} ${s.units === "imperial" ? "lbs" : "kg"}`
    : "—";
  const dayLabels = [...s.trainingDays]
    .sort((a, b) => a - b)
    .map((v) => DAYS.find((d) => d.value === v)?.label)
    .filter(Boolean)
    .join(", ");

  return [
    { label: "Sex", value: labelOf(SEXES, s.sex as (typeof SEXES)[number]["value"]), step: 0 },
    { label: "Date of birth", value: s.birthDate || "—", step: 0 },
    { label: "Height", value: height, step: 0 },
    { label: "Weight", value: weightStr, step: 0 },
    { label: "Experience", value: labelOf(EXPERIENCE, s.experience as (typeof EXPERIENCE)[number]["value"]), step: 0 },
    { label: "Goal", value: labelOf(GOALS, s.goal as (typeof GOALS)[number]["value"]), step: 1 },
    { label: "Days / week", value: String(s.daysPerWeek), step: 2 },
    { label: "Session length", value: `${s.sessionMinutes} min`, step: 2 },
    { label: "Training days", value: dayLabels || "Flexible", step: 2 },
    { label: "Equipment", value: labelOf(EQUIPMENT, s.equipment as (typeof EQUIPMENT)[number]["value"]), step: 3 },
    { label: "Emphasis", value: s.focusMuscles.length ? s.focusMuscles.join(", ") : "Balanced", step: 4 },
    { label: "Rep style", value: labelOf(REP_RANGES, s.repRange as (typeof REP_RANGES)[number]["value"]), step: 4 },
    { label: "Notes", value: s.notes.trim() || "—", step: 4 },
  ];
}

function ReviewStep({
  rows,
  onEdit,
}: {
  rows: ReviewRow[];
  onEdit: (step: number) => void;
}) {
  return (
    <section className="space-y-3">
      <p className="text-sm text-cream/80 leading-relaxed mb-2">
        Quick check — does this look right? Tap any row to fix it.
      </p>
      <div className="bg-slate800 border border-white/5 rounded-2xl divide-y divide-white/5">
        {rows.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => onEdit(r.step)}
            className="w-full flex items-start justify-between gap-4 px-4 py-3 text-left hover:bg-white/5 transition first:rounded-t-2xl last:rounded-b-2xl"
          >
            <span className="text-xs uppercase tracking-widest text-steel pt-0.5 shrink-0">
              {r.label}
            </span>
            <span className="text-sm text-cream text-right">{r.value}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
