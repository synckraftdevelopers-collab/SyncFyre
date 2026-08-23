"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateGymState = { error?: string; success?: string };

function normalizeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createGymAdminAction(_: CreateGymState, formData: FormData): Promise<CreateGymState> {
  await requireUser(["super_admin"]);
  const gymName = String(formData.get("gym_name") ?? "").trim();
  const slug = normalizeSlug(String(formData.get("gym_slug") ?? gymName));
  const adminName = String(formData.get("admin_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!gymName || !adminName || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter the gym name, administrator name, and a valid email address." };
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return { error: "Use a 3–40 character gym slug containing lowercase letters, numbers, or hyphens." };
  if (password.length < 8) return { error: "Use a temporary password with at least 8 characters." };

  const admin = createAdminClient();
  const { data: adminRole, error: roleError } = await admin.from("roles").select("id").eq("slug", "admin").single();
  if (roleError || !adminRole) return { error: "The Admin role is not configured in the database." };
  const { data: existingTenant, error: tenantLookupError } = await admin.from("tenants").select("id").eq("slug", slug).maybeSingle();
  if (tenantLookupError) return { error: tenantLookupError.message };
  if (existingTenant) return { error: "That gym slug is already in use." };
  const { data: existingUser, error: userLookupError } = await admin.from("users").select("id").eq("email", email).maybeSingle();
  if (userLookupError) return { error: userLookupError.message };
  if (existingUser) return { error: "A platform account already uses that email address." };

  const { data: tenant, error: createTenantError } = await admin.from("tenants").insert({ name: gymName, slug, owner_email: email, status: "trial" }).select("id").single();
  if (createTenantError || !tenant) return { error: createTenantError?.message ?? "Unable to create the gym." };
  const branchCode = `GYM${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const { data: branch, error: createBranchError } = await admin.from("branches").insert({ name: `${gymName} — Main Branch`, code: branchCode, tenant_id: tenant.id, status: "active" }).select("id").single();
  if (createBranchError || !branch) return { error: createBranchError?.message ?? "Gym created, but its first branch could not be created." };
  const { data: authUser, error: createAuthError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: adminName } });
  if (createAuthError || !authUser.user) return { error: createAuthError?.message ?? "Gym created, but the administrator account could not be created." };
  const { error: createProfileError } = await admin.from("users").insert({ id: authUser.user.id, full_name: adminName, email, role_id: adminRole.id, branch_id: branch.id, tenant_id: tenant.id, status: "active" });
  if (createProfileError) { await admin.auth.admin.deleteUser(authUser.user.id); return { error: createProfileError.message }; }
  revalidatePath("/superadmin/users");
  revalidatePath("/superadmin/tenants");
  revalidatePath("/superadmin/dashboard");
  return { success: "Gym and administrator account created. Share the temporary password securely." };
}