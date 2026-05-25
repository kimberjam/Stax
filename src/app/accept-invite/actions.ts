"use server";

import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";

export async function acceptInvite(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!displayName) {
    redirect("/accept-invite?error=" + encodeURIComponent("Display name is required."));
  }
  if (password.length < 8) {
    redirect("/accept-invite?error=" + encodeURIComponent("Password must be at least 8 characters."));
  }
  if (password !== confirm) {
    redirect("/accept-invite?error=" + encodeURIComponent("Passwords don't match."));
  }

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error: pwError } = await supabase.auth.updateUser({ password });
  if (pwError) {
    redirect("/accept-invite?error=" + encodeURIComponent(pwError.message));
  }

  await supabase
    .from("app_users")
    .update({ display_name: displayName })
    .eq("id", user.id);

  redirect("/");
}
