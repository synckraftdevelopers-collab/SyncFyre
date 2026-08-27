"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export type AccountSettingsState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

const ALLOWED_ROLES = ["owner", "admin", "manager", "reception", "trainer", "dietician", "diet-planner", "diet_planner", "member"] as const;

function deriveNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "";
  const normalized = localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "User";

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

async function verifyCurrentPassword(email: string, currentPassword: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (error) {
    return { ok: false as const, message: "Current password is incorrect." };
  }

  return { ok: true as const, supabase };
}

async function logAccountSecurityEvent(input: {
  userId: string;
  branchId: string | null;
  action: string;
  description: string;
  changes?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from("activity_logs").insert({
    user_id: input.userId,
    branch_id: input.branchId,
    action: input.action,
    entity_type: "account",
    entity_id: input.userId,
    description: input.description,
    changes: input.changes ?? {},
  });
}

export async function updateOwnEmailAction(_: AccountSettingsState, formData: FormData): Promise<AccountSettingsState> {
  const profile = await requireUser([...ALLOWED_ROLES]);
  const currentPassword = String(formData.get("current_password") ?? "");
  const newEmail = String(formData.get("new_email") ?? "").trim().toLowerCase();

  if (!profile.email) return { error: "This account does not have an email address configured." };

  const fieldErrors: Record<string, string> = {};
  if (!currentPassword) fieldErrors.current_password = "Current password is required.";
  if (!/^\S+@\S+\.\S+$/.test(newEmail)) fieldErrors.new_email = "Enter a valid email address.";
  if (profile.email.toLowerCase() === newEmail) fieldErrors.new_email = "Use a different email address.";
  if (Object.keys(fieldErrors).length) return { error: "Fix the highlighted fields and try again.", fieldErrors };

  const verified = await verifyCurrentPassword(profile.email, currentPassword);
  if (!verified.ok) return { error: verified.message, fieldErrors: { current_password: verified.message } };

  const nextFullName = deriveNameFromEmail(newEmail);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await verified.supabase.auth.updateUser(
    { email: newEmail, data: { full_name: nextFullName } },
    { emailRedirectTo: `${origin}/auth/callback?next=/admin/settings?tab=profile` },
  );

  if (error) return { error: error.message };

  const { error: profileError } = await verified.supabase
    .from("users")
    .update({ full_name: nextFullName })
    .eq("id", profile.id);

  if (profileError) return { error: profileError.message };

  await logAccountSecurityEvent({
    userId: profile.id,
    branchId: profile.branch_id,
    action: "account_email_change_requested",
    description: "Account email change requested",
    changes: {
      previous_email: profile.email,
      requested_email: newEmail,
      previous_full_name: profile.full_name,
      requested_full_name: nextFullName,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/reception/settings");
  revalidatePath("/trainer/settings");
  revalidatePath("/member/profile");
  return { success: `Verification sent to ${newEmail}. Display name updated to ${nextFullName}.` };
}

export async function updateOwnPasswordAction(_: AccountSettingsState, formData: FormData): Promise<AccountSettingsState> {
  const profile = await requireUser([...ALLOWED_ROLES]);
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!profile.email) return { error: "This account does not have an email address configured." };

  const fieldErrors: Record<string, string> = {};
  if (!currentPassword) fieldErrors.current_password = "Current password is required.";
  if (newPassword.length < 8) fieldErrors.new_password = "Use at least 8 characters.";
  if (!/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) fieldErrors.new_password = "Include at least one uppercase letter and one number.";
  if (newPassword !== confirmPassword) fieldErrors.confirm_password = "Passwords do not match.";
  if (currentPassword && newPassword && currentPassword === newPassword) fieldErrors.new_password = "Use a new password instead of the current one.";
  if (Object.keys(fieldErrors).length) return { error: "Fix the highlighted fields and try again.", fieldErrors };

  const verified = await verifyCurrentPassword(profile.email, currentPassword);
  if (!verified.ok) return { error: verified.message, fieldErrors: { current_password: verified.message } };

  const { error } = await verified.supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  await logAccountSecurityEvent({
    userId: profile.id,
    branchId: profile.branch_id,
    action: "account_password_changed",
    description: "Account password updated",
  });

  revalidatePath("/admin/settings");
  return { success: "Password updated successfully." };
}
