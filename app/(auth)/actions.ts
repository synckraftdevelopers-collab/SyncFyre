"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from "@/lib/validations/auth";
import { PORTAL_DASHBOARD } from "@/lib/portals";
import type { UserRole } from "@/types";

export type AuthState = { error?: string; success?: string; redirectTo?: string };

export async function loginAction(_: AuthState, formData: FormData): Promise<AuthState> {
  try {
    const parsed = loginSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: "Enter a valid email and password (minimum 8 characters)." };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      return { error: error.message };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase.from("users").select("role:roles(slug)").eq("id", user.id).single();
      const roleValue = profile?.role as unknown as { slug?: UserRole } | { slug?: UserRole }[] | null;
      const slug = Array.isArray(roleValue) ? roleValue[0]?.slug : roleValue?.slug;
      const dest = slug ? (PORTAL_DASHBOARD[slug] ?? "/admin/dashboard") : "/admin/dashboard";
      redirect(dest);
    }

    return { redirectTo: "/admin/dashboard" };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
      throw err;
    }

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
    if (!parsed.success) {
      return { error: "Enter a valid email address." };
    }

    const supabase = await createClient();
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      return { error: error.message };
    }

    return { success: "If an account exists, a reset link has been sent." };
  } catch (err) {
    console.error("[forgotPasswordAction]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function resetPasswordAction(_: AuthState, formData: FormData): Promise<AuthState> {
  try {
    const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: "Use at least 8 characters with an uppercase letter and number." };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      return { error: error.message };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase.from("users").select("role:roles(slug)").eq("id", user.id).single();
      const roleValue = profile?.role as unknown as { slug?: UserRole } | { slug?: UserRole }[] | null;
      const slug = Array.isArray(roleValue) ? roleValue[0]?.slug : roleValue?.slug;
      const dest = slug ? (PORTAL_DASHBOARD[slug] ?? "/admin/dashboard") : "/admin/dashboard";
      redirect(dest);
    }

    redirect("/admin/dashboard");
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
      throw err;
    }

    console.error("[resetPasswordAction]", err);
    return { error: "Something went wrong. Please try again." };
  }
}
