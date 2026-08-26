"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateGymState = { error?: string; success?: string };

function normalizeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createGymAdminAction(_: CreateGymState, formData: FormData): Promise<CreateGymState> {
  await requireUser(["super_admin"]);
  const supabase = await createClient();

  const gymName = String(formData.get("gym_name") ?? "").trim();
  const slug = normalizeSlug(String(formData.get("gym_slug") ?? gymName));
  const ownerName = String(formData.get("owner_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const ownerPhone = String(formData.get("owner_phone") ?? "").trim() || null;
  const branchName = String(formData.get("branch_name") ?? "Main Branch").trim() || "Main Branch";
  const password = String(formData.get("password") ?? "");

  if (!gymName || !ownerName || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter the gym name, owner name, and a valid email address." };
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return { error: "Use a 3-40 character gym slug containing lowercase letters, numbers, or hyphens." };
  if (password.length < 8) return { error: "Use a temporary password with at least 8 characters." };

  const admin = createAdminClient();
  const [{ data: existingTenant, error: tenantLookupError }, { data: existingUser, error: userLookupError }] = await Promise.all([
    admin.from("tenants").select("id").eq("slug", slug).maybeSingle(),
    admin.from("users").select("id, tenant_id").eq("email", email).maybeSingle(),
  ]);

  if (tenantLookupError) return { error: tenantLookupError.message };
  if (userLookupError) return { error: userLookupError.message };
  if (existingTenant) return { error: "That gym slug is already in use." };
  if (existingUser) return { error: "A platform account already uses that email address." };

  const { data: authUser, error: createAuthError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: ownerName, phone: ownerPhone },
  });

  if (createAuthError || !authUser.user) return { error: createAuthError?.message ?? "The owner account could not be created." };

  const { data: provisioned, error: provisionError } = await supabase.rpc("provision_superadmin_tenant_owner", {
    p_user_id: authUser.user.id,
    p_owner_name: ownerName,
    p_owner_email: email,
    p_owner_phone: ownerPhone,
    p_gym_name: gymName,
    p_gym_slug: slug,
    p_branch_name: branchName,
  });

  if (provisionError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return { error: provisionError.message };
  }

  const tenantInfo = (provisioned ?? {}) as { trial_start_date?: string; trial_end_date?: string; tenant_slug?: string };

  revalidatePath("/superadmin/users");
  revalidatePath("/superadmin/tenants");
  revalidatePath("/superadmin/dashboard");
  revalidatePath("/superadmin/devices");
  revalidatePath("/superadmin/audit-logs");

  return {
    success: `Gym, owner, main branch, and free trial created. Trial: ${tenantInfo.trial_start_date ?? "today"} to ${tenantInfo.trial_end_date ?? "1 year"}. Owner signs in and continues onboarding.`
  };
}
