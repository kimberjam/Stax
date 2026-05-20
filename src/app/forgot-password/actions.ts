"use server";

import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect(
      "/forgot-password?error=" + encodeURIComponent("Email is required."),
    );
  }

  const supabase = await getServerClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  // Deliberately don't reveal whether the email exists; we always show
  // success to prevent account enumeration.
  if (error) {
    console.error("resetPasswordForEmail error:", error.message);
  }

  redirect("/forgot-password?success=" + encodeURIComponent(email));
}
