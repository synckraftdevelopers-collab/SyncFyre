import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile, UserRole } from "@/types";

export const getCurrentProfile = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("users")
    .select("id, full_name, email, phone, avatar_url, branch_id, status, role:roles(name, slug)")
    .eq("id", user.id)
    .single();
  return data as unknown as UserProfile | null;
});

export async function requireUser(allowedRoles?: UserRole[]) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/unauthorized");
  if (allowedRoles && (!profile.role || !allowedRoles.includes(profile.role.slug))) redirect("/unauthorized");
  return profile;
}
