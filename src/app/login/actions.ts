"use server";

import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "/");

  if (!email || !password) {
    redirect(
      "/login?error=" + encodeURIComponent("Email and password are required."),
    );
  }

  const supabase = await getServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  const safeNext =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  redirect(safeNext);
}
