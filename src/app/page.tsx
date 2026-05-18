import { StaxLogo } from "@/components/stax-logo";

export default function Home() {
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

        <section className="bg-slate800 border border-white/5 rounded-2xl p-6">
          <p className="uppercase text-[11px] tracking-widest text-steel mb-3">
            Phase 0 — Hello, world
          </p>
          <h2 className="text-xl font-semibold mb-2">You&rsquo;re live locally.</h2>
          <p className="text-sm text-cream/80 mb-5 leading-relaxed">
            This is the Stax shell. Auth, programming, and tracking come next.
            See <code className="text-lime">SETUP.md</code> in the repo for
            account and env steps.
          </p>

          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span>Next.js 14 + Tailwind</span>
              <span className="text-lime">ready</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Supabase client wired</span>
              <span className="text-lime">ready</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Initial migration written</span>
              <span className="text-lime">ready</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Auth flow</span>
              <span className="text-amber">phase 1</span>
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
