import { BarChart2, Lock } from "lucide-react";
import { createLeadAction, getAdvancedCrmAction } from "@/app/actions/lead-actions";
import { LeadActions } from "@/components/leads/lead-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortalContext } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { createClient } from "@/lib/supabase/server";
import { listLeadActivities, listLeads, LEAD_STAGES } from "@/services/lead.service";
import { SortableTh, readSort } from "@/components/ui/sortable-th";

export const metadata = { title: "Leads" };

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )
    : "—";
}

const SORTABLE_COLUMNS = [
  { label: "Lead", column: "lead" as const },
  { label: "Stage / follow-up", column: "stage" as const },
];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ colSort?: string; colDir?: string }>;
}) {
  const sp = await searchParams;
  const profile = await getPortalContext();
  if (!profile?.tenant_id || !profile.branch_id)
    return (
      <p className="text-sm text-muted-foreground">
        Your account is not assigned to a branch.
      </p>
    );

  const supabase = await createClient();
  const [leads, activities, membersResult, staffResult, isScale] = await Promise.all([
    listLeads(profile.tenant_id, profile.branch_id),
    listLeadActivities(profile.tenant_id, profile.branch_id),
    supabase
      .from("members")
      .select("id, full_name, member_code")
      .eq("tenant_id", profile.tenant_id)
      .eq("branch_id", profile.branch_id)
      .eq("status", "active")
      .order("full_name")
      .limit(300),
    supabase
      .from("users")
      .select("id, full_name, role:roles(slug)")
      .eq("tenant_id", profile.tenant_id)
      .eq("branch_id", profile.branch_id)
      .eq("status", "active")
      .order("full_name")
      .limit(200),
    hasCurrentFeature("advanced_crm"),
  ]);

  const { sort: colSort, dir: colDir } = readSort(
    sp as Record<string, string | undefined>,
    SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "colSort", dir: "colDir" },
  );
  let sortedLeads = leads;
  if (colSort) {
    const dirMul = colDir === "desc" ? -1 : 1;
    const sortValue = (lead: any): string | number => {
      if (colSort === "lead") return lead.full_name ?? "";
      if (colSort === "stage") return lead.follow_up_at ?? "";
      return "";
    };
    sortedLeads = [...leads].sort((a: any, b: any) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      if (av === "" && bv === "") return 0;
      if (av === "") return 1;
      if (bv === "") return -1;
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dirMul;
      return ((av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0) * dirMul;
    });
  }

  const activitiesByLead = new Map<string, any[]>();
  for (const activity of activities as any[]) {
    const current = activitiesByLead.get(activity.lead_id) ?? [];
    if (current.length < 5) current.push(activity);
    activitiesByLead.set(activity.lead_id, current);
  }

  const members = membersResult.data ?? [];
  const SALES_ROLES = new Set(["owner", "admin", "manager", "reception"]);
  const staff = (staffResult.data ?? []).filter((user: any) => {
    const role = Array.isArray(user.role) ? user.role[0] : user.role;
    return role?.slug ? SALES_ROLES.has(role.slug) : false;
  }).map((user: any) => ({ id: user.id as string, full_name: user.full_name as string }));
  const overdue = leads.filter(
    (lead: any) =>
      lead.follow_up_at &&
      new Date(lead.follow_up_at).getTime() < Date.now() &&
      !["won", "lost"].includes(lead.stage),
  ).length;

  // Fetch analytics only for Scale tenants
  const crmAnalytics = isScale ? (await getAdvancedCrmAction()).data : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Capture enquiries, schedule follow-ups, and track conversions.
          </p>
        </div>
        <p
          className={
            overdue
              ? "rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive"
              : "rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
          }
        >
          {overdue
            ? `${overdue} overdue follow-up${overdue === 1 ? "" : "s"}`
            : "No overdue follow-ups"}
        </p>
      </div>

      {/* Lead form + pipeline */}
      <div className="grid gap-6 xl:grid-cols-[350px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>New lead</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={async (formData) => {
                "use server";
                await createLeadAction(formData);
              }}
              className="space-y-3"
            >
              <input name="full_name" required placeholder="Full name" className="h-10 w-full rounded-lg border bg-background px-3 text-sm" />
              <input name="phone" placeholder="Phone" className="h-10 w-full rounded-lg border bg-background px-3 text-sm" />
              <input name="email" type="email" placeholder="Email" className="h-10 w-full rounded-lg border bg-background px-3 text-sm" />
              <select name="source" defaultValue="walk_in" className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
                <option value="walk_in">Walk-in</option>
                <option value="referral">Referral</option>
                <option value="website">Website</option>
                <option value="social">Social media</option>
                <option value="phone">Phone enquiry</option>
              </select>
              <input name="plan_interest" placeholder="Plan interest" className="h-10 w-full rounded-lg border bg-background px-3 text-sm" />
              <label className="block text-sm font-medium">
                Assign to
                <select name="assigned_to" defaultValue="" className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm">
                  <option value="">Unassigned</option>
                  {staff.map((person) => (
                    <option key={person.id} value={person.id}>{person.full_name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Follow-up
                <input name="follow_up_at" type="datetime-local" className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm" />
              </label>
              <textarea name="notes" maxLength={2000} placeholder="Notes" className="min-h-24 w-full rounded-lg border bg-background p-3 text-sm" />
              <button className="h-10 w-full rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
                Create lead
              </button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                <tr>
                  {SORTABLE_COLUMNS.map(({ label, column }) => (
                    <SortableTh
                      key={column}
                      label={label}
                      column={column}
                      basePath="/admin/leads"
                      searchParams={sp as Record<string, string | undefined>}
                      currentSort={colSort}
                      currentDir={colDir}
                      paramNames={{ sort: "colSort", dir: "colDir" }}
                      className="p-3 font-medium"
                    />
                  ))}
                  <th className="p-3">History</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedLeads.map((lead: any) => {
                  const leadActivities = activitiesByLead.get(lead.id) ?? [];
                  const isOverdue =
                    lead.follow_up_at &&
                    new Date(lead.follow_up_at).getTime() < Date.now() &&
                    !["won", "lost"].includes(lead.stage);
                  return (
                    <tr key={lead.id}>
                      <td className="p-3 align-top">
                        <p className="font-medium">{lead.full_name}</p>
                        <p className="text-xs text-muted-foreground">{lead.phone ?? lead.email ?? "No contact"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {lead.source} · {lead.plan_interest ?? "No plan selected"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {(() => {
                            const assignee = Array.isArray(lead.users) ? lead.users[0] : lead.users;
                            return assignee?.full_name ? `Assigned to ${assignee.full_name}` : "Unassigned";
                          })()}
                        </p>
                      </td>
                      <td className="p-3 align-top">
                        <p className="capitalize">{lead.stage.replace(/_/g, " ")}</p>
                        <p className={isOverdue ? "mt-1 text-xs font-medium text-destructive" : "mt-1 text-xs text-muted-foreground"}>
                          {isOverdue ? "Overdue: " : "Follow-up: "}
                          {formatDate(lead.follow_up_at)}
                        </p>
                      </td>
                      <td className="p-3 align-top">
                        <details>
                          <summary className="cursor-pointer text-xs font-medium text-primary">
                            {leadActivities.length
                              ? `${leadActivities.length} recent activit${leadActivities.length === 1 ? "y" : "ies"}`
                              : "No activity yet"}
                          </summary>
                          <div className="mt-2 space-y-2 text-xs">
                            {leadActivities.map((activity: any) => (
                              <div key={activity.id} className="rounded border p-2">
                                <p>{activity.description}</p>
                                <p className="mt-1 text-muted-foreground">
                                  {activity.activity_type.replace(/_/g, " ")} ·{" "}
                                  {activity.performer?.full_name ?? "Staff"} ·{" "}
                                  {formatDate(activity.created_at)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </details>
                      </td>
                      <td className="p-3 align-top">
                        <LeadActions lead={{ id: lead.id, stage: lead.stage, assigned_to: lead.assigned_to ?? null }} members={members} staff={staff} />
                      </td>
                    </tr>
                  );
                })}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-muted-foreground">
                      No leads yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* ── Advanced CRM Analytics — Scale only, hidden for non-Scale plans ── */}
      {!isScale ? null : crmAnalytics ? (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <BarChart2 className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Advanced CRM Analytics</h2>
            <Badge variant="secondary" className="ml-auto">Scale</Badge>
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Total Leads</p>
                <p className="mt-1 text-2xl font-bold">{crmAnalytics.totalLeads}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Converted (Won)</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">{crmAnalytics.wonLeads}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
                <p className="mt-1 text-2xl font-bold">{crmAnalytics.overallConversionRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Avg Days to Convert</p>
                <p className="mt-1 text-2xl font-bold">
                  {crmAnalytics.avgDaysToConvert !== null ? `${crmAnalytics.avgDaysToConvert}d` : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline velocity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pipeline Velocity (avg days per stage)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="pb-3">Stage</th>
                    <th className="pb-3">Leads at Stage</th>
                    <th className="pb-3">Avg Days Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {crmAnalytics.stageBreakdown.map((s) => (
                    <tr key={s.stage}>
                      <td className="py-2 capitalize font-medium">{s.stage.replace(/_/g, " ")}</td>
                      <td className="py-2">{s.count}</td>
                      <td className="py-2 text-muted-foreground">
                        {crmAnalytics.pipelineVelocity[s.stage] > 0
                          ? `${crmAnalytics.pipelineVelocity[s.stage]}d`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
