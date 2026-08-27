"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingSchemaError } from "@/lib/supabase/schema";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validations/auth";
import { PORTAL_DASHBOARD } from "@/lib/portals";
import type { UserRole } from "@/types";

export type AuthState = { error?: string; success?: string; redirectTo?: string };

async function getRedirectForCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("users").select("tenant_id, role:roles(slug)").eq("id", user.id).single();
  const roleValue = profile?.role as { slug?: UserRole } | { slug?: UserRole }[] | null;
  const slug = Array.isArray(roleValue) ? roleValue[0]?.slug : roleValue?.slug;
  const tenantId = (profile as { tenant_id?: string | null } | null)?.tenant_id ?? null;

  if (slug === "owner") {
    if (!tenantId) return "/onboarding";
    const { data: tenant, error } = await supabase.from("tenants").select("onboarding_completed_at").eq("id", tenantId).maybeSingle();
    if (error && !isMissingSchemaError(error)) {
      console.error("[getRedirectForCurrentUser] Unable to load tenant onboarding status", error);
    }
    if (!tenant?.onboarding_completed_at) return "/onboarding";
  }

  return slug ? PORTAL_DASHBOARD[slug] : null;
}

export async function registerAction(_: AuthState, formData: FormData): Promise<AuthState> {
  try {
    const parsed = registerSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Enter valid registration details." };

    const supabase = await createClient();
    const email = parsed.data.email.toLowerCase();

    const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
    if (existingUser) return { error: "An account with this email already exists." };

    const admin = createAdminClient();
    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.full_name, phone: parsed.data.phone || null },
    });

    if (createError || !createdUser.user) return { error: createError?.message ?? "Unable to create your account." };

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    });

    if (signInError) {
      await admin.auth.admin.deleteUser(createdUser.user.id);
      return { error: signInError.message };
    }

    return { success: "Account created. Redirecting to gym setup.", redirectTo: "/onboarding" };
  } catch (err) {
    console.error("[registerAction]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function loginAction(_: AuthState, formData: FormData): Promise<AuthState> {
  try {
    const parsed = loginSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: "Enter a valid email and password (minimum 8 characters)." };

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: error.message };

    const dest = await getRedirectForCurrentUser();
    if (dest) redirect(dest);

    await supabase.auth.signOut();
    return { error: "This account has not been assigned an active portal role. Please contact an administrator." };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) throw err;
    console.error("[loginAction]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function forgotPasswordAction(_: AuthState, formData: FormData): Promise<AuthState> {
  try {
    const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: "Enter a valid email address." };

    const supabase = await createClient();
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${origin}/reset-password`,
    });
    if (error) return { error: error.message };

    return { success: "If an account exists, a reset link has been sent." };
  } catch (err) {
    console.error("[forgotPasswordAction]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function resetPasswordAction(_: AuthState, formData: FormData): Promise<AuthState> {
  try {
    const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: "Use at least 8 characters with an uppercase letter and number." };

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return { error: error.message };

    const dest = await getRedirectForCurrentUser();
    if (dest) redirect(dest);

    await supabase.auth.signOut();
    return { error: "This account has not been assigned an active portal role. Please contact an administrator." };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) throw err;
    console.error("[resetPasswordAction]", err);
    return { error: "Something went wrong. Please try again." };
  }
}
