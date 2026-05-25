import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./wizard";

export const metadata = {
  title: "Set up Stax",
};

export default async function OnboardingPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: appUser } = await supabase
    .from("app_users")
    .select("display_name, email, onboarded_at")
    .eq("id", user.id)
    .single();

  // Already finished — no need to do it again.
  if (appUser?.onboarded_at) {
    redirect("/");
  }

  const displayName = appUser?.display_name || appUser?.email || "there";

  return <OnboardingWizard displayName={displayName} />;
}
