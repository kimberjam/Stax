import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerClient } from "@/lib/supabase/server";
import { StaxLogo } from "@/components/stax-logo";
import { sendInvite } from "./actions";

export default async function AdminInvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const errorMsg = params.error;
  const successMsg = params.success;

  const supabase = await getServerClient();
  const { data: users } = await supabase
    .from("app_users")
    .select("id, display_name, email, role, created_at")
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <StaxLogo size={44} />
            <div>
              <h1 className="text-2xl font-extrabold tracking-wide">STAX</h1>
              <p className="text-steel text-xs">Admin · Invites</p>
            </div>
          </div>
          <Link href="/" className="text-sm text-steel hover:text-cream transition">
            ← Home
          </Link>
        </div>

        {errorMsg && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-coral/20 border border-coral/40 text-coral text-sm">
            {decodeURIComponent(errorMsg)}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-mint/10 border border-mint/30 text-mint text-sm">
            Invite sent to {decodeURIComponent(successMsg)}.
          </div>
        )}

        <section className="bg-slate800 border border-white/5 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Invite someone</h2>
          <form action={sendInvite} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs uppercase tracking-widest text-steel mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="friend@example.com"
                className="w-full bg-obsidian border border-white/10 rounded-xl px-4 py-3 text-cream placeholder-steel focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition"
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-xs uppercase tracking-widest text-steel mb-2">
                Role
              </label>
              <select
                id="role"
                name="role"
                defaultValue="user"
                className="w-full bg-obsidian border border-white/10 rounded-xl px-4 py-3 text-cream focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition"
              >
                <option value="user">User</option>
                <option value="coach">Coach</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-lime text-obsidian font-bold py-3 rounded-xl hover:bg-lime-dark transition active:scale-[0.98]"
            >
              Send invite
            </button>
          </form>
        </section>

        <section className="bg-slate800 border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">
            People in Stax ({users?.length ?? 0})
          </h2>
          <div className="space-y-2">
            {(users ?? []).map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between px-4 py-3 bg-obsidian rounded-xl"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {u.display_name || "—"}
                  </p>
                  <p className="text-xs text-steel truncate">{u.email}</p>
                </div>
                <span
                  className={
                    "text-xs font-semibold px-2 py-1 rounded-full " +
                    (u.role === "admin"
                      ? "bg-violet/20 text-violet"
                      : u.role === "coach"
                        ? "bg-amber/20 text-amber"
                        : "bg-white/5 text-steel")
                  }
                >
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
