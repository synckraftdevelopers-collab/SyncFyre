"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { convertLead, createLead, LEAD_STAGES, recordLeadActivity, updateLeadStage } from "@/services/lead.service";

const leadSchema = z.object({
  full_name: z.string().trim().min(2, "Lead name is required.").max(120),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")),
  source: z.string().trim().min(1).max(60),
  plan_interest: z.string().trim().max(120).optional(),
  follow_up_at: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
});

export async function createLeadAction(formData: FormData): Promise<{ error?: string; success?: string }> {
  const profile = await requireUser(["owner", "admin", "manager", "reception"]);
  if (!profile.tenant_id || !profile.branch_id) return { error: "Your account must be assigned to an organization and branch." };
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Review the lead details." };
  try {
    await createLead({ tenantId: profile.tenant_id, branchId: profile.branch_id, fullName: parsed.data.full_name, phone: parsed.data.phone, email: parsed.data.email, source: parsed.data.source, planInterest: parsed.data.plan_interest, followUpAt: parsed.data.follow_up_at || null, notes: parsed.data.notes, createdBy: profile.id });
    revalidatePath("/admin/leads");
    return { success: "Lead created." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create lead." };
  }
}
export async function updateLeadStageAction(formData: FormData): Promise<{ error?: string; success?: string }> {
  const profile = await requireUser(["owner", "admin", "manager", "reception"]);
  if (!profile.tenant_id || !profile.branch_id) return { error: "Your account must be assigned to an organization and branch." };
  const leadId = String(formData.get("lead_id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  const lostReason = String(formData.get("lost_reason") ?? "").trim();
  if (!leadId || !LEAD_STAGES.includes(stage as typeof LEAD_STAGES[number])) return { error: "Choose a valid lead stage." };
  try {
    await updateLeadStage({ leadId, tenantId: profile.tenant_id, branchId: profile.branch_id, stage: stage as typeof LEAD_STAGES[number], lostReason, performedBy: profile.id });
    revalidatePath("/admin/leads");
    return { success: "Lead stage updated." };
  } catch (error) { return { error: error instanceof Error ? error.message : "Unable to update lead." }; }
}
export async function convertLeadAction(formData: FormData): Promise<{ error?: string; success?: string }> {
  const profile = await requireUser(["owner", "admin", "manager", "reception"]);
  if (!profile.tenant_id || !profile.branch_id) return { error: "Your account must be assigned to an organization and branch." };
  const leadId = String(formData.get("lead_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  if (!leadId || !memberId) return { error: "Select a lead and member." };
  try { await convertLead({ leadId, memberId, tenantId: profile.tenant_id, branchId: profile.branch_id, performedBy: profile.id }); revalidatePath("/admin/leads"); return { success: "Lead converted." }; }
  catch (error) { return { error: error instanceof Error ? error.message : "Unable to convert lead." }; }
}
function normalizeDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function recordLeadActivityAction(formData: FormData): Promise<{ error?: string; success?: string }> {
  const profile = await requireUser(["owner", "admin", "manager", "reception"]);
  if (!profile.tenant_id || !profile.branch_id) return { error: "Your account must be assigned to an organization and branch." };
  const leadId = String(formData.get("lead_id") ?? "");
  const activityType = String(formData.get("activity_type") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const followUpRaw = String(formData.get("follow_up_at") ?? "");
  const followUpAt = normalizeDateTime(followUpRaw);
  if (!leadId || !["note", "call", "message", "follow_up", "trial"].includes(activityType)) return { error: "Choose a valid activity." };
  if (!description || description.length > 2000) return { error: "Enter an activity note up to 2,000 characters." };
  if (followUpRaw && !followUpAt) return { error: "Enter a valid follow-up date and time." };
  try {
    await recordLeadActivity({ leadId, tenantId: profile.tenant_id, branchId: profile.branch_id, activityType: activityType as "note" | "call" | "message" | "follow_up" | "trial", description, followUpAt, performedBy: profile.id });
    revalidatePath("/admin/leads");
    return { success: "Lead activity recorded." };
  } catch (error) { return { error: error instanceof Error ? error.message : "Unable to record activity." }; }
}