"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function encodeMessage(value: string) {
  return encodeURIComponent(value);
}

export async function bootstrapOrganizationAction(formData: FormData) {
  const profile = await requireUser(["owner", "member"]);
  const supabase = await createClient();

  const gymName = String(formData.get("gym_name") ?? "").trim();
  const branchName = String(formData.get("branch_name") ?? "Main Branch").trim() || "Main Branch";
  if (!gymName) redirect(`/onboarding?error=${encodeMessage("Gym name is required.")}`);

  const { error } = await supabase.rpc("bootstrap_owner_tenant", {
    p_gym_name: gymName,
    p_branch_name: branchName,
    p_logo_url: String(formData.get("logo_url") ?? "").trim() || null,
    p_address: String(formData.get("address") ?? "").trim() || null,
    p_city: String(formData.get("city") ?? "").trim() || null,
    p_state: String(formData.get("state") ?? "").trim() || null,
    p_postal_code: String(formData.get("postal_code") ?? "").trim() || null,
    p_country: String(formData.get("country") ?? "India").trim() || "India",
    p_phone: String(formData.get("phone") ?? profile.phone ?? "").trim() || null,
    p_email: profile.email,
    p_gst_number: String(formData.get("gst_number") ?? "").trim() || null,
    p_currency: String(formData.get("currency") ?? "INR").trim() || "INR",
    p_timezone: String(formData.get("timezone") ?? "Asia/Kolkata").trim() || "Asia/Kolkata",
  });

  if (error) redirect(`/onboarding?error=${encodeMessage(error.message)}`);
  revalidatePath("/onboarding");
  redirect("/onboarding?created=1");
}

export async function updateOnboardingStepAction(formData: FormData) {
  const profile = await requireUser(["owner"]);
  if (!profile.tenant_id) redirect("/onboarding?error=Finish%20gym%20creation%20first.");

  const currentStep = String(formData.get("current_step") ?? "membership_plans");
  const completedSteps = JSON.parse(String(formData.get("completed_steps") ?? "[]"));
  const supabase = await createClient();
  const { error } = await supabase.from("tenant_onboarding_progress").upsert({
    tenant_id: profile.tenant_id,
    current_step: currentStep,
    completed_steps: completedSteps,
  });
  if (error) redirect(`/onboarding?error=${encodeMessage(error.message)}`);
  revalidatePath("/onboarding");
  redirect("/onboarding");
}

export async function skipMachineStepAction() {
  const profile = await requireUser(["owner"]);
  if (!profile.tenant_id) redirect("/onboarding");
  const supabase = await createClient();
  const { error } = await supabase.from("tenant_onboarding_progress").upsert({
    tenant_id: profile.tenant_id,
    current_step: "complete",
    machine_skipped: true,
    completed_steps: ["gym_profile", "main_branch", "membership_plans", "trainers", "staff", "machine"],
  });
  if (error) redirect(`/onboarding?error=${encodeMessage(error.message)}`);
  revalidatePath("/onboarding");
  redirect("/onboarding");
}

export async function completeOnboardingAction() {
  await requireUser(["owner"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_owner_onboarding", { p_machine_skipped: true });
  if (error) redirect(`/onboarding?error=${encodeMessage(error.message)}`);
  revalidatePath("/onboarding");
  redirect("/admin/dashboard?onboarding=complete");
}
