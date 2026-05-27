import Link from "next/link";
import { redirect } from "next/navigation";
import { StaxLogo } from "@/components/stax-logo";
import { getServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: appUser } = await supabase
    .from("app_users")
    .select("display_name, email, role, onboarded_at")
    .eq("id", user.id)
    .single();

  const display = appUser?.display_name || appUser?.email || user.email;
  const role = appUser?.role ?? "user";

  // First-time gate: send non-admins through onboarding until they finish.
  if (role !== "admin" && !appUser?.onboarded_at) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-4 mb-10">
          <div className="shadow-glow rounded-2xl">
            <StaxLogo size={80} />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-wide">STAX</h1>
            <p className="text-steel text-sm mt-1">
              Stack the plates. Stack the gains.
            </p>
          </div>
        </div>

        <section className="bg-slate800 border border-white/5 rounded-2xl p-6 mb-6">
          <p className="uppercase text-[11px] tracking-widest text-steel mb-3">
            Signed in
          </p>
          <h2 className="text-xl font-semibold mb-1">Hello, {display}.</h2>
          <p className="text-sm text-steel mb-5">
            Role: <span className="text-lime font-medium">{role}</span>
          </p>

          <Link
            href="/program"
            className="block w-full text-center bg-lime text-obsidian font-bold py-3 rounded-xl hover:bg-lime-dark transition mb-3"
          >
            Start Workout
          </Link>

          <Link
            href="/exercises"
            className="block w-full text-center bg-lime/10 border border-lime/30 text-lime font-medium py-3 rounded-xl hover:bg-lime/20 transition mb-3"
          >
            Exercise library
          </Link>

          <Link
            href="/workouts"
            className="block w-full text-center bg-obsidian border border-white/10 text-cream font-medium py-3 rounded-xl hover:bg-white/5 transition mb-3"
          >
            Workout history
          </Link>

          <Link
            href="/progress"
            className="block w-full text-center bg-obsidian border border-white/10 text-cream font-medium py-3 rounded-xl hover:bg-white/5 transition mb-3"
          >
            Progress
          </Link>

          {role === "admin" && (
            <Link
              href="/admin/invites"
              className="block w-full text-center bg-violet/20 border border-violet/40 text-violet font-medium py-3 rounded-xl hover:bg-violet/30 transition mb-3"
            >
              Admin · Invites
            </Link>
          )}

          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="w-full bg-obsidian border border-white/10 text-cream font-medium py-3 rounded-xl hover:bg-white/5 transition active:scale-[0.98]"
            >
              Sign out
            </button>
          </form>
        </section>

        <section className="bg-slate800 border border-white/5 rounded-2xl p-6">
          <p className="uppercase text-[11px] tracking-widest text-steel mb-3">
            Status
          </p>
          <h2 className="text-xl font-semibold mb-2">Ready to train.</h2>
          <p className="text-sm text-cream/80 mb-5 leading-relaxed">
            Your account, exercise library, and AI program builder are live.
            Generate a program and start stacking.
          </p>

          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span>Sign in / sign out</span>
              <span className="text-lime">ready</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Password reset</span>
              <span className="text-lime">ready</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Invite system</span>
              <span className="text-lime">ready</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Onboarding wizard</span>
              <span className="text-lime">ready</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Exercise library</span>
              <span className="text-lime">ready</span>
            </li>
            <li className="flex items-center justify-between">
              <span>AI program builder</span>
              <span className="text-lime">ready</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Workout logging</span>
              <span className="text-lime">ready</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Progress dashboard</span>
              <span className="text-lime">ready</span>
            </li>
          </ul>
        </section>

        <p className="text-center text-xs text-steel mt-10">
          Private. Invite-only. Built for family and friends.
        </p>
      </div>
    </main>
  );
}
