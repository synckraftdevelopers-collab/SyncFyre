import { createClient } from "@/lib/supabase/server";

export const LEAD_STAGES = ["new", "contacted", "follow_up", "trial_scheduled", "trial_completed", "won", "lost"] as const;
export type LeadStage = typeof LEAD_STAGES[number];

export interface LeadInput {
  tenantId: string;
  branchId: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  planInterest?: string | null;
  followUpAt?: string | null;
  trialAt?: string | null;
  notes?: string | null;
  createdBy: string;
}

export async function listLeads(tenantId: string, branchId?: string | null, stage?: LeadStage | "all") {
  const supabase = await createClient();
  let query = supabase.from("leads").select("id, branch_id, full_name, phone, email, source, plan_interest, stage, follow_up_at, trial_at, lost_reason, converted_member_id, created_at, branches(name), users!leads_assigned_to_fkey(full_name)").eq("tenant_id", tenantId).order("follow_up_at", { ascending: true, nullsFirst: false });
  if (branchId) query = query.eq("branch_id", branchId);
  if (stage && stage !== "all") query = query.eq("stage", stage);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createLead(input: LeadInput) {
  const supabase = await createClient();
  const { data: branch, error: branchError } = await supabase.from("branches").select("id").eq("id", input.branchId).eq("tenant_id", input.tenantId).eq("status", "active").maybeSingle();
  if (branchError || !branch) throw new Error("Select an active branch in your organization.");
  const payload = { tenant_id: input.tenantId, branch_id: input.branchId, full_name: input.fullName.trim(), phone: input.phone?.trim() || null, email: input.email?.trim().toLowerCase() || null, source: input.source?.trim() || "walk_in", plan_interest: input.planInterest?.trim() || null, follow_up_at: input.followUpAt || null, trial_at: input.trialAt || null, notes: input.notes?.trim() || null, created_by: input.createdBy, updated_by: input.createdBy };
  const { data, error } = await supabase.from("leads").insert(payload).select("id, branch_id, tenant_id, full_name, stage").single();
  if (error || !data) throw new Error(error?.message ?? "Unable to create lead.");
  const { error: activityError } = await supabase.from("lead_activities").insert({ lead_id: data.id, tenant_id: data.tenant_id, branch_id: data.branch_id, activity_type: "created", description: "Lead created", next_stage: data.stage, performed_by: input.createdBy });
  if (activityError) throw new Error(activityError.message);
  return data;
}
export async function updateLeadStage(input: { leadId: string; tenantId: string; branchId: string; stage: LeadStage; lostReason?: string | null; performedBy: string }) {
  const supabase = await createClient();
  const { data: lead, error: lookupError } = await supabase.from("leads").select("id, stage, branch_id").eq("id", input.leadId).eq("tenant_id", input.tenantId).eq("branch_id", input.branchId).maybeSingle();
  if (lookupError || !lead) throw new Error("Lead not found or you do not have access.");
  if (input.stage === "lost" && !input.lostReason?.trim()) throw new Error("A lost reason is required.");
  const update = { stage: input.stage, lost_reason: input.stage === "lost" ? input.lostReason!.trim() : null, updated_by: input.performedBy };
  const { error } = await supabase.from("leads").update(update).eq("id", lead.id).eq("tenant_id", input.tenantId).eq("branch_id", input.branchId);
  if (error) throw new Error(error.message);
  const { error: activityError } = await supabase.from("lead_activities").insert({ lead_id: lead.id, tenant_id: input.tenantId, branch_id: input.branchId, activity_type: input.stage === "lost" ? "lost" : "stage_changed", description: `Stage changed from ${lead.stage} to ${input.stage}`, previous_stage: lead.stage, next_stage: input.stage, performed_by: input.performedBy });
  if (activityError) throw new Error(activityError.message);
}
export async function convertLead(input: { leadId: string; memberId: string; tenantId: string; branchId: string; performedBy: string }) {
  const supabase = await createClient();
  const [{ data: lead, error: leadError }, { data: member, error: memberError }] = await Promise.all([
    supabase.from("leads").select("id, stage").eq("id", input.leadId).eq("tenant_id", input.tenantId).eq("branch_id", input.branchId).maybeSingle(),
    supabase.from("members").select("id").eq("id", input.memberId).eq("tenant_id", input.tenantId).eq("branch_id", input.branchId).maybeSingle(),
  ]);
  if (leadError || !lead) throw new Error("Lead not found or you do not have access.");
  if (memberError || !member) throw new Error("Select a member from your branch.");
  const { error } = await supabase.from("leads").update({ stage: "won", converted_member_id: member.id, converted_at: new Date().toISOString(), lost_reason: null, updated_by: input.performedBy }).eq("id", lead.id).eq("tenant_id", input.tenantId).eq("branch_id", input.branchId);
  if (error) throw new Error(error.message);
  const { error: activityError } = await supabase.from("lead_activities").insert({ lead_id: lead.id, tenant_id: input.tenantId, branch_id: input.branchId, activity_type: "converted", description: "Lead converted to member", previous_stage: lead.stage, next_stage: "won", performed_by: input.performedBy });
  if (activityError) throw new Error(activityError.message);
}
export async function recordLeadActivity(input: { leadId: string; tenantId: string; branchId: string; activityType: "note" | "call" | "message" | "follow_up" | "trial"; description: string; followUpAt?: string | null; performedBy: string }) {
  const supabase = await createClient();
  const { data: lead, error: lookupError } = await supabase
    .from("leads")
    .select("id, stage")
    .eq("id", input.leadId)
    .eq("tenant_id", input.tenantId)
    .eq("branch_id", input.branchId)
    .maybeSingle();
  if (lookupError || !lead) throw new Error("Lead not found or you do not have access.");
  if (["won", "lost"].includes(lead.stage)) throw new Error("Closed leads cannot receive new follow-up activity.");
  const update: Record<string, unknown> = { updated_by: input.performedBy };
  if (input.followUpAt) { update.follow_up_at = input.followUpAt; if (lead.stage === "new" || lead.stage === "contacted") update.stage = "follow_up"; }
  const { error: updateError } = await supabase.from("leads").update(update).eq("id", lead.id).eq("tenant_id", input.tenantId).eq("branch_id", input.branchId);
  if (updateError) throw new Error(updateError.message);
  const { error: activityError } = await supabase.from("lead_activities").insert({ lead_id: lead.id, tenant_id: input.tenantId, branch_id: input.branchId, activity_type: input.activityType, description: input.description.trim(), previous_stage: lead.stage, next_stage: update.stage ?? lead.stage, performed_by: input.performedBy });
  if (activityError) throw new Error(activityError.message);
}

export async function listLeadActivities(tenantId: string, branchId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_activities")
    .select("id, lead_id, activity_type, description, created_at, performer:users!lead_activities_performed_by_fkey(full_name)")
    .eq("tenant_id", tenantId)
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false })
    .limit(150);
  if (error) throw new Error(error.message);
  return data ?? [];
}