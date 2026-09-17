import { AlertTriangle, CheckCircle, TrendingDown, UserMinus, Users } from "lucide-react";
import { requirePortalContext } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { getRetentionIntelligenceAction } from "@/app/actions/report-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Retention Intelligence" };

function riskBadge(level: "high" | "medium" | "low") {
  if (level === "high") return <Badge variant="danger">High Risk</Badge>;
  if (level === "medium") return <Badge variant="warning">Medium Risk</Badge>;
  return <Badge variant="success">Low Risk</Badge>;
}

export default async function RetentionPage() {
  const profile = await requirePortalContext(["owner", "admin", "manager"]);
  const isScale = await hasCurrentFeature("retention_intelligence");

  if (!isScale) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Retention Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            Identify at-risk members before they churn.
          </p>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-muted">
              <UserMinus className="size-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">Retention Intelligence</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Automatically score every active member for churn risk based on their attendance,
                subscription expiry, and payment history. Available on the Scale plan.
              </p>
            </div>
            <Badge variant="secondary">Scale Plan required</Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  const result = await getRetentionIntelligenceAction(200);

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Retention Intelligence</h1>
        <p className="text-sm text-destructive">{result.error ?? "Unable to load data."}</p>
      </div>
    );
  }

  const { summary, atRiskMembers } = result.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <UserMinus className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Retention Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            Members ranked by churn risk based on attendance, expiry, and subscription status.
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto mt-1">Scale</Badge>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Active Members</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{summary.totalActiveMembers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-red-500" />
              <p className="text-xs text-muted-foreground">High Risk</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-red-600">{summary.highRiskCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <TrendingDown className="size-4 text-amber-500" />
              <p className="text-xs text-muted-foreground">Medium Risk</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-600">{summary.mediumRiskCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-500" />
              <p className="text-xs text-muted-foreground">30-Day Renewal Rate</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{summary.renewalRate30d}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-blue-500" />
              <p className="text-xs text-muted-foreground">Avg Tenure</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{summary.avgMembershipDays}d</p>
          </CardContent>
        </Card>
      </div>

      {/* At-risk member list */}
      {atRiskMembers.length === 0 ? (
        <Card>
          <CardContent className="grid min-h-40 place-items-center text-sm text-muted-foreground">
            No at-risk members found. Great retention!
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">At-Risk Members</CardTitle>
            <span className="text-sm text-muted-foreground">
              {atRiskMembers.length} member{atRiskMembers.length !== 1 ? "s" : ""} scored
            </span>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 font-medium">Member</th>
                  <th className="px-3 py-3 font-medium">Risk</th>
                  <th className="px-3 py-3 font-medium">Score</th>
                  <th className="px-3 py-3 font-medium">Expiry</th>
                  <th className="px-3 py-3 font-medium">Last Attendance</th>
                  <th className="px-3 py-3 font-medium">Subscription</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {atRiskMembers.map((m) => (
                  <tr key={m.member_id} className="align-middle hover:bg-muted/30">
                    <td className="px-3 py-3">
                      <p className="font-medium">{m.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.member_code}
                        {m.phone ? ` · ${m.phone}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-3">{riskBadge(m.risk_level)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${
                              m.risk_level === "high"
                                ? "bg-red-500"
                                : m.risk_level === "medium"
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                            }`}
                            style={{ width: `${m.risk_score}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{m.risk_score}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {m.days_until_expiry === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : m.days_until_expiry <= 0 ? (
                        <span className="font-medium text-red-600">Expired</span>
                      ) : (
                        <span
                          className={
                            m.days_until_expiry <= 7
                              ? "font-medium text-red-600"
                              : m.days_until_expiry <= 30
                                ? "text-amber-600"
                                : "text-muted-foreground"
                          }
                        >
                          {m.days_until_expiry}d left
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {m.last_attendance_days_ago === null ? (
                        <span className="text-red-600 font-medium">30d+ ago</span>
                      ) : (
                        <span
                          className={
                            m.last_attendance_days_ago >= 14
                              ? "text-amber-600"
                              : "text-muted-foreground"
                          }
                        >
                          {m.last_attendance_days_ago}d ago
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs capitalize text-muted-foreground">
                      {m.subscription_status?.replace(/_/g, " ") ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
