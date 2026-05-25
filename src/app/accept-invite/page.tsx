import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { StaxLogo } from "@/components/stax-logo";
import { acceptInvite } from "./actions";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMsg = params.error;

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="shadow-glow rounded-2xl">
            <StaxLogo size={72} />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-wide">STAX</h1>
          <p className="text-steel text-sm mt-1">Welcome — finish setting up</p>
        </div>

        {errorMsg && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-coral/20 border border-coral/40 text-coral text-sm">
            {decodeURIComponent(errorMsg)}
          </div>
        )}

        <p className="text-sm text-cream/80 mb-6 leading-relaxed">
          You&rsquo;ve been invited to Stax. Pick a display name and a password to
          finish creating your account.
        </p>

        <form action={acceptInvite} className="space-y-4">
          <div>
            <label htmlFor="display_name" className="block text-xs uppercase tracking-widest text-steel mb-2">
              Display name
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              required
              maxLength={40}
              placeholder="e.g. Alex"
              className="w-full bg-slate800 border border-white/10 rounded-xl px-4 py-3 text-cream placeholder-steel focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition"
            />
            <p className="text-xs text-steel mt-1">
              This is what shows on the leaderboard.
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs uppercase tracking-widest text-steel mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full bg-slate800 border border-white/10 rounded-xl px-4 py-3 text-cream placeholder-steel focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-xs uppercase tracking-widest text-steel mb-2">
              Confirm
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full bg-slate800 border border-white/10 rounded-xl px-4 py-3 text-cream placeholder-steel focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-lime text-obsidian font-bold py-3 rounded-xl hover:bg-lime-dark transition active:scale-[0.98]"
          >
            Create my account
          </button>
        </form>
      </div>
    </main>
  );
}
