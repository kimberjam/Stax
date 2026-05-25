"use server";

import { redirect } from "next/navigation";
import { getServerClient, getServiceRoleClient } from "@/lib/supabase/server";

export async function sendInvite(formData: FormData) {
  // 1. Verify the caller is an admin.
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: me } = await supabase
    .from("app_users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") {
    redirect("/");
  }

  // 2. Validate input.
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "user");

  if (!email) {
    redirect("/admin/invites?error=" + encodeURIComponent("Email is required."));
  }
  if (role !== "user" && role !== "coach") {
    redirect("/admin/invites?error=" + encodeURIComponent("Invalid role."));
  }

  // 3. Send the invite via the Supabase admin API.
  const admin = getServiceRoleClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: `${siteUrl}/auth/callback?next=/accept-invite` },
  );

  if (error) {
    redirect("/admin/invites?error=" + encodeURIComponent(error.message));
  }

  // 4. Assign the chosen role and log the action.
  if (invited?.user) {
    await admin.from("app_users").update({ role }).eq("id", invited.user.id);

    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "invite_sent",
      target_user_id: invited.user.id,
      payload: { email, role },
    });
  }

  redirect("/admin/invites?success=" + encodeURIComponent(email));
}
