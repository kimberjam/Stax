import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";

/**
 * Guard for admin-only pages. Redirects to /login if signed out,
 * or to / if signed in but not an admin. Returns the user + app_users row.
 */
export async function requireAdmin() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: appUser } = await supabase
    .from("app_users")
    .select("id, display_name, email, role")
    .eq("id", user.id)
    .single();

  if (appUser?.role !== "admin") {
    redirect("/");
  }

  return { user, appUser };
}
