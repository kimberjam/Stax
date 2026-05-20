import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerClient } from "@/lib/supabase/server";
import { StaxLogo } from "@/components/stax-logo";
import { requestPasswordReset } from "./actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const errorMsg = params.error;
  const successMsg = params.success;

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="shadow-glow rounded-2xl">
            <StaxLogo size={72} />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-wide">STAX</h1>
          <p className="text-steel text-sm mt-1">Reset your password</p>
        </div>

        {errorMsg && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-coral/20 border border-coral/40 text-coral text-sm">
            {decodeURIComponent(errorMsg)}
          </div>
        )}

        {successMsg ? (
          <div className="px-5 py-4 rounded-xl bg-mint/10 border border-mint/30 text-cream text-sm leading-relaxed">
            <p className="font-semibold text-mint mb-1">Check your inbox.</p>
            <p>
              If an account exists for {decodeURIComponent(successMsg)}, we&rsquo;ve
              sent a one-time password reset link. It expires in about an hour.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-cream/80 mb-6 leading-relaxed">
              Enter the email tied to your Stax account. We&rsquo;ll send you a
              one-time link to set a new password.
            </p>

            <form action={requestPasswordReset} className="space-y-4">
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

              <button
                type="submit"
                className="w-full bg-lime text-obsidian font-bold py-3 rounded-xl hover:bg-lime-dark transition active:scale-[0.98]"
              >
                Send reset link
              </button>
            </form>
          </>
        )}

        <p className="text-center text-sm mt-8">
          <Link
            href="/login"
            className="text-steel hover:text-cream transition"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
