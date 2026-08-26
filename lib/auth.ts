import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema";
import type { UserProfile, UserRole } from "@/types";

export type PortalContext = UserProfile & {
  onboarding_completed_at?: string | null;
  tenant_name?: string | null;
};

export const getCurrentProfile = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("users")
    .select("id, full_name, email, phone, avatar_url, branch_id, tenant_id, status, role:roles(name, slug)")
    .eq("id", user.id)
    .single();
  return data as unknown as UserProfile | null;
});

export const getPortalContext = cache(async (): Promise<PortalContext | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, phone, avatar_url, branch_id, tenant_id, status, role:roles(name, slug)")
    .eq("id", user.id)
    .single();
  if (error || !data) return null;

  let tenantName: string | null = null;
  let onboardingCompletedAt: string | null = null;

  if (data.tenant_id) {
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("name, onboarding_completed_at")
      .eq("id", data.tenant_id)
      .maybeSingle();

    if (tenantError && !isMissingSchemaError(tenantError)) {
      console.error("[getPortalContext] Unable to load tenant context", tenantError);
    } else {
      tenantName = tenant?.name ?? null;
      onboardingCompletedAt = tenant?.onboarding_completed_at ?? null;
    }
  }

  return {
    ...(data as unknown as UserProfile),
    onboarding_completed_at: onboardingCompletedAt,
    tenant_name: tenantName,
  };
});

export async function requireUser(allowedRoles?: UserRole[]) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/unauthorized");
  if (allowedRoles && (!profile.role || !allowedRoles.includes(profile.role.slug))) redirect("/unauthorized");
  return profile;
}
