import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { StaxLogo } from "@/components/stax-logo";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const errorMsg = params.error;
  const nextPath = params.next ?? "/";

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(
      nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/",
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="shadow-glow rounded-2xl">
            <StaxLogo size={72} />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-wide">STAX</h1>
          <p className="text-steel text-sm mt-1">Sign in to continue</p>
        </div>

        {errorMsg && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-coral/20 border border-coral/40 text-coral text-sm">
            {decodeURIComponent(errorMsg)}
          </div>
        )}

        <form action={signIn} className="space-y-4">
          <input type="hidden" name="next" value={nextPath} />

          <div>
            <label
              htmlFor="email"
              className="block text-xs uppercase tracking-widest text-steel mb-2"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="w-full bg-slate800 border border-white/10 rounded-xl px-4 py-3 text-cream placeholder-steel focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs uppercase tracking-widest text-steel mb-2"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full bg-slate800 border border-white/10 rounded-xl px-4 py-3 text-cream placeholder-steel focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-lime text-obsidian font-bold py-3 rounded-xl hover:bg-lime-dark transition active:scale-[0.98]"
          >
            Sign in
          </button>
        </form>

        <p className="text-center text-xs text-steel mt-8">
          Private. Invite-only. Built for family and friends.
        </p>
      </div>
    </main>
  );
}
