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
  assignedTo?: string | null;
  createdBy: string;
}

export async function listLeads(tenantId: string, branchId?: string | null, stage?: LeadStage | "all") {
  const supabase = await createClient();
  let query = supabase.from("leads").select("id, branch_id, full_name, phone, email, source, plan_interest, stage, follow_up_at, trial_at, lost_reason, converted_member_id, created_at, assigned_to, branches(name), users!leads_assigned_to_fkey(full_name)").eq("tenant_id", tenantId).order("follow_up_at", { ascending: true, nullsFirst: false });
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
  const payload = { tenant_id: input.tenantId, branch_id: input.branchId, full_name: input.fullName.trim(), phone: input.phone?.trim() || null, email: input.email?.trim().toLowerCase() || null, source: input.source?.trim() || "walk_in", plan_interest: input.planInterest?.trim() || null, follow_up_at: input.followUpAt || null, trial_at: input.trialAt || null, notes: input.notes?.trim() || null, assigned_to: input.assignedTo || null, created_by: input.createdBy, updated_by: input.createdBy };
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
/**
 * Assigns (or unassigns, when assignedTo is null) a lead to a salesperson.
 * The assignee must be an active staff member of the same tenant/branch —
 * checked here rather than trusted from the caller, since this is settable
 * by any of the roles that can work leads (owner/admin/manager/reception),
 * not just the person the lead is being handed to.
 */
export async function assignLead(input: { leadId: string; tenantId: string; branchId: string; assignedTo: string | null; performedBy: string }) {
  const supabase = await createClient();
  const { data: lead, error: lookupError } = await supabase.from("leads").select("id, stage, assigned_to").eq("id", input.leadId).eq("tenant_id", input.tenantId).eq("branch_id", input.branchId).maybeSingle();
  if (lookupError || !lead) throw new Error("Lead not found or you do not have access.");
  if (input.assignedTo) {
    const { data: assignee, error: assigneeError } = await supabase.from("users").select("id, full_name, status").eq("id", input.assignedTo).eq("tenant_id", input.tenantId).eq("branch_id", input.branchId).maybeSingle();
    if (assigneeError || !assignee) throw new Error("Select a staff member from your branch.");
    if (assignee.status !== "active") throw new Error("That staff member's account is not active.");
  }
  const { error } = await supabase.from("leads").update({ assigned_to: input.assignedTo, updated_by: input.performedBy }).eq("id", lead.id).eq("tenant_id", input.tenantId).eq("branch_id", input.branchId);
  if (error) throw new Error(error.message);
  const { error: activityError } = await supabase.from("lead_activities").insert({ lead_id: lead.id, tenant_id: input.tenantId, branch_id: input.branchId, activity_type: "note", description: input.assignedTo ? "Lead assigned" : "Lead unassigned", previous_stage: lead.stage, next_stage: lead.stage, performed_by: input.performedBy });
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


// ─── Advanced CRM Analytics (Phase 3 / Scale) ────────────────────────────────

export type StageConversionRate = {
  stage: string;
  count: number;
  convertedCount: number;
  conversionRate: number; // 0-100
};

export type AdvancedCrmAnalyticsResult = {
  totalLeads: number;
  wonLeads: number;
  overallConversionRate: number;        // 0-100 percentage
  avgDaysToConvert: number | null;      // null if no conversions yet
  stageBreakdown: StageConversionRate[];
  pipelineVelocity: Record<string, number>; // stage -> avg days spent there
};

/**
 * Scale-exclusive CRM analytics.
 *
 * Computes:
 *  - Overall lead-to-member conversion rate
 *  - Average days to convert (created_at → converted_at)
 *  - Per-stage breakdown with conversion counts
 *  - Pipeline velocity (avg days a lead spends in each stage)
 *
 * Uses existing leads and lead_activities tables — no new DB tables.
 */
export async function getAdvancedCrmAnalytics(
  tenantId: string,
  branchId?: string | null,
): Promise<AdvancedCrmAnalyticsResult> {
  const supabase = await createClient();

  // Fetch all leads for this tenant/branch
  let leadsQuery = supabase
    .from("leads")
    .select("id,stage,created_at,converted_at,lost_reason")
    .eq("tenant_id", tenantId);

  if (branchId) leadsQuery = leadsQuery.eq("branch_id", branchId);

  const { data: leads, error } = await leadsQuery;
  if (error) throw new Error(error.message);

  const allLeads = leads ?? [];
  const totalLeads = allLeads.length;
  const wonLeads = allLeads.filter((l) => l.stage === "won").length;
  const overallConversionRate =
    totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // Average days to convert (only for won leads with converted_at)
  const convertedWithTime = allLeads.filter(
    (l) => l.stage === "won" && l.converted_at && l.created_at,
  );
  let avgDaysToConvert: number | null = null;
  if (convertedWithTime.length > 0) {
    const totalDays = convertedWithTime.reduce((sum, l) => {
      const diff =
        new Date(l.converted_at as string).getTime() -
        new Date(l.created_at as string).getTime();
      return sum + diff / (1000 * 60 * 60 * 24);
    }, 0);
    avgDaysToConvert = Math.round(totalDays / convertedWithTime.length);
  }

  // Per-stage breakdown
  const stageCounts: Record<string, number> = {};
  for (const l of allLeads) {
    stageCounts[l.stage] = (stageCounts[l.stage] ?? 0) + 1;
  }

  const stageBreakdown: StageConversionRate[] = LEAD_STAGES.map((stage) => {
    const count = stageCounts[stage] ?? 0;
    // For conversion rate per stage: % of leads that reached this stage and later became "won"
    const reachedStage = allLeads.filter((l) => {
      const stageOrder = LEAD_STAGES.indexOf(l.stage as typeof LEAD_STAGES[number]);
      const thisOrder = LEAD_STAGES.indexOf(stage);
      return stageOrder >= thisOrder || l.stage === "won";
    }).length;
    const stageWon = allLeads.filter((l) => l.stage === "won").length;
    const conversionRate =
      reachedStage > 0 ? Math.round((stageWon / reachedStage) * 100) : 0;
    return { stage, count, convertedCount: stageWon, conversionRate };
  });

  // Pipeline velocity: avg days spent in each stage (from lead_activities transitions)
  let activitiesQuery = supabase
    .from("lead_activities")
    .select("lead_id,previous_stage,next_stage,created_at")
    .eq("tenant_id", tenantId)
    .eq("activity_type", "stage_changed")
    .order("created_at", { ascending: true });

  if (branchId) activitiesQuery = activitiesQuery.eq("branch_id", branchId);

  const { data: activities } = await activitiesQuery;

  // Group transitions by lead
  const transitionsByLead = new Map<
    string,
    Array<{ prevStage: string | null; nextStage: string | null; at: Date }>
  >();
  for (const act of activities ?? []) {
    const arr = transitionsByLead.get(act.lead_id) ?? [];
    arr.push({
      prevStage: act.previous_stage as string | null,
      nextStage: act.next_stage as string | null,
      at: new Date(act.created_at as string),
    });
    transitionsByLead.set(act.lead_id, arr);
  }

  // Calculate days per stage
  const stageDaysTotal: Record<string, number> = {};
  const stageDaysCount: Record<string, number> = {};

  for (const [leadId, transitions] of transitionsByLead.entries()) {
    const lead = allLeads.find((l) => l.id === leadId);
    if (!lead) continue;
    let prevTime = new Date(lead.created_at as string);
    for (const t of transitions) {
      if (t.prevStage) {
        const days =
          (t.at.getTime() - prevTime.getTime()) / (1000 * 60 * 60 * 24);
        stageDaysTotal[t.prevStage] =
          (stageDaysTotal[t.prevStage] ?? 0) + days;
        stageDaysCount[t.prevStage] =
          (stageDaysCount[t.prevStage] ?? 0) + 1;
      }
      prevTime = t.at;
    }
  }

  const pipelineVelocity: Record<string, number> = {};
  for (const stage of LEAD_STAGES) {
    const total = stageDaysTotal[stage] ?? 0;
    const count = stageDaysCount[stage] ?? 0;
    pipelineVelocity[stage] = count > 0 ? Math.round(total / count) : 0;
  }

  return {
    totalLeads,
    wonLeads,
    overallConversionRate,
    avgDaysToConvert,
    stageBreakdown,
    pipelineVelocity,
  };
}

// ─── Sales Targets (CRM) ──────────────────────────────────────────────────
// A target is either per-salesperson (assigned_to set) or branch-wide
// (assigned_to null). "Actual" is tracked as won-leads count only —
// target_revenue is stored but left target-only (no computed "actual"),
// which keeps this pragmatic rather than reaching into
// subscriptions/payments for the converted member's initial value.

export interface SalesTargetRow {
  id: string;
  tenant_id: string;
  branch_id: string;
  assigned_to: string | null;
  period_month: string;
  target_leads_count: number | null;
  target_revenue: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  assignee?: { full_name: string } | { full_name: string }[] | null;
}

export interface SalesTargetProgress {
  id: string;
  assignedTo: string | null;
  assigneeName: string | null; // null for a branch-wide target
  periodMonth: string;
  targetLeadsCount: number | null;
  targetRevenue: number | null;
  actualWonCount: number;
  progressPct: number | null; // null when no leads-count target is set
  notes: string | null;
}

export interface SetSalesTargetInput {
  tenantId: string;
  branchId: string;
  assignedTo?: string | null;
  periodMonth: string; // always the 1st of a month, e.g. "2026-09-01"
  targetLeadsCount?: number | null;
  targetRevenue?: number | null;
  notes?: string | null;
  performedBy: string;
}

/** "2026-09-01" for the current month (server local time). */
export function currentPeriodMonth(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export async function getSalesTargets(tenantId: string, branchId: string, periodMonth: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_targets")
    .select("id, tenant_id, branch_id, assigned_to, period_month, target_leads_count, target_revenue, notes, created_at, updated_at, assignee:users!sales_targets_assigned_to_fkey(full_name)")
    .eq("tenant_id", tenantId)
    .eq("branch_id", branchId)
    .eq("period_month", periodMonth)
    .order("assigned_to", { ascending: true, nullsFirst: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SalesTargetRow[];
}

export async function setSalesTarget(input: SetSalesTargetInput) {
  const supabase = await createClient();
  const { data: branch, error: branchError } = await supabase.from("branches").select("id").eq("id", input.branchId).eq("tenant_id", input.tenantId).eq("status", "active").maybeSingle();
  if (branchError || !branch) throw new Error("Select an active branch in your organization.");
  if (input.assignedTo) {
    const { data: assignee, error: assigneeError } = await supabase.from("users").select("id, status").eq("id", input.assignedTo).eq("tenant_id", input.tenantId).eq("branch_id", input.branchId).maybeSingle();
    if (assigneeError || !assignee) throw new Error("Select a staff member from your branch.");
  }
  if (input.targetLeadsCount == null && input.targetRevenue == null) throw new Error("Set a leads target, a revenue target, or both.");

  // Find any existing target for this natural key ourselves rather than
  // relying on a Supabase upsert(onConflict:...) — keeps the null-assignee
  // ("branch-wide") case explicit and matches the rest of this file's
  // find-then-update-or-insert style.
  let existingQuery = supabase.from("sales_targets").select("id").eq("tenant_id", input.tenantId).eq("branch_id", input.branchId).eq("period_month", input.periodMonth);
  existingQuery = input.assignedTo ? existingQuery.eq("assigned_to", input.assignedTo) : existingQuery.is("assigned_to", null);
  const { data: existing, error: existingError } = await existingQuery.maybeSingle();
  if (existingError) throw new Error(existingError.message);

  const payload = {
    tenant_id: input.tenantId,
    branch_id: input.branchId,
    assigned_to: input.assignedTo || null,
    period_month: input.periodMonth,
    target_leads_count: input.targetLeadsCount ?? null,
    target_revenue: input.targetRevenue ?? null,
    notes: input.notes?.trim() || null,
    updated_by: input.performedBy,
  };

  if (existing) {
    const { error } = await supabase.from("sales_targets").update(payload).eq("id", existing.id).eq("tenant_id", input.tenantId).eq("branch_id", input.branchId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("sales_targets").insert({ ...payload, created_by: input.performedBy });
    if (error) throw new Error(error.message);
  }
}

/**
 * Sets targets against actual performance for the given month.
 *
 * "Actual" = leads with stage 'won' and converted_at within the month.
 * A per-salesperson target (assigned_to set) is measured against that
 * salesperson's own won count; a branch-wide target (assigned_to null) is
 * measured against the whole branch's won count, not just unassigned leads.
 */
export async function getSalesTargetProgress(tenantId: string, branchId: string, periodMonth: string): Promise<SalesTargetProgress[]> {
  const supabase = await createClient();
  const targets = await getSalesTargets(tenantId, branchId, periodMonth);
  if (!targets.length) return [];

  const start = new Date(`${periodMonth}T00:00:00.000Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));

  const { data: wonLeads, error } = await supabase
    .from("leads")
    .select("id, assigned_to")
    .eq("tenant_id", tenantId)
    .eq("branch_id", branchId)
    .eq("stage", "won")
    .gte("converted_at", start.toISOString())
    .lt("converted_at", end.toISOString());
  if (error) throw new Error(error.message);

  const won = wonLeads ?? [];
  const branchWonCount = won.length;
  const wonCountByAssignee = new Map<string, number>();
  for (const lead of won) {
    if (!lead.assigned_to) continue;
    wonCountByAssignee.set(lead.assigned_to, (wonCountByAssignee.get(lead.assigned_to) ?? 0) + 1);
  }

  return targets.map((target) => {
    const assignee = Array.isArray(target.assignee) ? target.assignee[0] : target.assignee;
    const actualWonCount = target.assigned_to ? (wonCountByAssignee.get(target.assigned_to) ?? 0) : branchWonCount;
    const progressPct = target.target_leads_count ? Math.min(100, Math.round((actualWonCount / target.target_leads_count) * 100)) : null;
    return {
      id: target.id,
      assignedTo: target.assigned_to,
      assigneeName: assignee?.full_name ?? null,
      periodMonth: target.period_month,
      targetLeadsCount: target.target_leads_count,
      targetRevenue: target.target_revenue,
      actualWonCount,
      progressPct,
      notes: target.notes,
    };
  });
}
