"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function refresh() { revalidatePath("/admin/pt"); }
export async function createPtPackageAction(formData: FormData) {
  const profile = await requireUser(["owner", "admin", "manager"]);
  if (!profile.tenant_id || !profile.branch_id) return { error: "Organization and branch are required." };
  const name = String(formData.get("name") ?? "").trim(); const sessionCount = Number(formData.get("session_count")); const price = Number(formData.get("price")); const validityDays = Number(formData.get("validity_days"));
  if (!name || name.length > 120 || !Number.isInteger(sessionCount) || sessionCount < 1 || !Number.isFinite(price) || price < 0 || !Number.isInteger(validityDays) || validityDays < 1) return { error: "Enter a valid package name, sessions, price, and validity." };
  const supabase = await createClient(); const { error } = await supabase.from("pt_packages").insert({ tenant_id: profile.tenant_id, branch_id: profile.branch_id, name, session_count: sessionCount, price, validity_days: validityDays, created_by: profile.id }); if (error) return { error: error.message }; refresh(); return { success: "PT package created." };
}
export async function sellPtPackageAction(formData: FormData) {
  const profile = await requireUser(["owner", "admin", "manager", "reception"]);
  if (!profile.tenant_id || !profile.branch_id) return { error: "Organization and branch are required." };
  const memberId = String(formData.get("member_id") ?? ""); const packageId = String(formData.get("package_id") ?? ""); const trainerId = String(formData.get("trainer_id") ?? "") || null;
  const supabase = await createClient(); const [{ data: member }, { data: pkg }] = await Promise.all([supabase.from("members").select("id").eq("id", memberId).eq("tenant_id", profile.tenant_id).eq("branch_id", profile.branch_id).eq("status", "active").maybeSingle(), supabase.from("pt_packages").select("id, session_count, price, validity_days").eq("id", packageId).eq("tenant_id", profile.tenant_id).eq("branch_id", profile.branch_id).eq("status", "active").maybeSingle()]); if (!member || !pkg) return { error: "Select an active member and PT package from this branch." };
  if (trainerId) { const { data: trainer } = await supabase.from("trainers").select("id").eq("id", trainerId).eq("branch_id", profile.branch_id).eq("status", "active").maybeSingle(); if (!trainer) return { error: "Select an active trainer from this branch." }; }
  const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + Number(pkg.validity_days)); const { error } = await supabase.from("pt_member_packages").insert({ tenant_id: profile.tenant_id, branch_id: profile.branch_id, member_id: member.id, trainer_id: trainerId, package_id: pkg.id, purchased_sessions: pkg.session_count, amount: pkg.price, expires_at: expiresAt.toISOString().slice(0, 10), created_by: profile.id }); if (error) return { error: error.message }; refresh(); return { success: "PT credits added." };
}
export async function schedulePtSessionAction(formData: FormData) {
  const profile = await requireUser(["owner", "admin", "manager", "reception", "trainer"]); if (!profile.tenant_id || !profile.branch_id) return { error: "Organization and branch are required." };
  const memberPackageId = String(formData.get("member_package_id") ?? ""); const sessionAt = String(formData.get("session_at") ?? ""); const trainerId = String(formData.get("trainer_id") ?? "") || null; const parsedDate = new Date(sessionAt); if (!memberPackageId || Number.isNaN(parsedDate.getTime())) return { error: "Choose PT credits and a valid session time." };
  const supabase = await createClient(); const { data: credit } = await supabase.from("pt_member_packages").select("id, trainer_id, purchased_sessions, used_sessions, expires_at, status").eq("id", memberPackageId).eq("tenant_id", profile.tenant_id).eq("branch_id", profile.branch_id).maybeSingle(); if (!credit || credit.status !== "active" || credit.used_sessions >= credit.purchased_sessions || credit.expires_at < new Date().toISOString().slice(0, 10)) return { error: "The selected PT credits are unavailable or expired." }; const { error } = await supabase.from("pt_sessions").insert({ tenant_id: profile.tenant_id, branch_id: profile.branch_id, member_package_id: credit.id, trainer_id: trainerId ?? credit.trainer_id, session_at: parsedDate.toISOString() }); if (error) return { error: error.message }; refresh(); return { success: "PT session scheduled." };
}
export async function completePtSessionAction(sessionId: string) { const profile = await requireUser(["owner", "admin", "manager", "reception", "trainer"]); const supabase = await createClient(); const { error } = await supabase.rpc("complete_pt_session", { p_session_id: sessionId, p_user_id: profile.id }); if (error) return { error: error.message }; refresh(); return { success: "Session completed and one credit used." }; }