import Link from "next/link";
import { Edit, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Membership Plans" };

// Supabase may return features as a JSON string or already-parsed array
function parseFeatures(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as string[]; } catch { return []; }
  }
  return [];
}

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  gst_percent: number;
  discount_percent: number;
  duration_months: number;
  features: string[];
  status: "active" | "inactive";
  created_at: string;
  branch_id: string | null;
}

export default async function MembershipsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "active" } = await searchParams;
  const profile = await requireUser(["admin", "manager"]);
  const branchId = profile.branch_id;

  // membership_plans.status is record_status enum: only "active" | "inactive"
  // Dashboard cards may link with ?status=expired or ?status=expiring — treat those as "all"
  const planStatus: "active" | "inactive" | "all" =
    status === "active" || status === "inactive" ? status : "all";

  const supabase = await createClient();
  let query = supabase
    .from("membership_plans")
    .select("*")
    .order("created_at", { ascending: false });

  if (branchId) query = query.eq("branch_id", branchId);
  if (planStatus !== "all") query = query.eq("status", planStatus);

  const { data: plans, error } = await query;

  const allPlans = (plans ?? []).map((p) => ({
    ...(p as MembershipPlan),
    features: parseFeatures((p as MembershipPlan).features),
  }));

  // Count active subscriptions per plan
  const planIds = allPlans.map((p) => p.id);
  let subCounts: Record<string, number> = {};
  if (planIds.length > 0) {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("status", "active")
      .in("plan_id", planIds);
    for (const s of subs ?? []) {
      subCounts[s.plan_id] = (subCounts[s.plan_id] ?? 0) + 1;
    }
  }

  const activePlans   = allPlans.filter((p) => p.status === "active").length;
  const inactivePlans = allPlans.filter((p) => p.status === "inactive").length;
  const totalSubs     = Object.values(subCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Membership Plans</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage subscription plans offered to members.
          </p>
        </div>
        <Link href="/admin/memberships/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-4" />
          Create Plan
        </Link>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-green-100 text-green-600">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active Plans</p>
              <p className="text-2xl font-bold">{activePlans}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Inactive Plans</p>
              <p className="text-2xl font-bold">{inactivePlans}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active Subscriptions</p>
              <p className="text-2xl font-bold">{totalSubs}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2">
        {(["all", "active", "inactive"] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/memberships?status=${s}`}
            className={buttonVariants({
              variant: planStatus === s ? "default" : "outline",
              size: "sm",
            })}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            Failed to load plans: {error.message}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!error && allPlans.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <ShieldCheck className="mb-4 size-12 text-muted-foreground" />
            <p className="font-semibold text-lg">No plans yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first membership plan to start enrolling members.
            </p>
            <Link href="/admin/memberships/new" className={buttonVariants({ className: "mt-5" })}>
              <Plus className="size-4" />
              Create Plan
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Plans grid */}
      {allPlans.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {allPlans.map((plan) => {
            const effectivePrice = plan.price * (1 - plan.discount_percent / 100);
            const gstAmount      = effectivePrice * (plan.gst_percent / 100);
            const totalPrice     = effectivePrice + gstAmount;
            const activeSubs     = subCounts[plan.id] ?? 0;

            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md ${plan.status === "inactive" ? "opacity-60" : ""}`}
              >
                {/* Top accent bar */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-[#f4b844]" />

                <CardHeader className="pb-3 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {plan.duration_months} month{plan.duration_months !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge variant={plan.status === "active" ? "default" : "secondary"} className="shrink-0">
                      {plan.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Pricing */}
                  <div className="rounded-xl bg-muted/50 p-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
                      <span className="text-sm text-muted-foreground">/ {plan.duration_months}mo</span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {plan.discount_percent > 0 && (
                        <div className="flex justify-between">
                          <span>Discount ({plan.discount_percent}%)</span>
                          <span className="text-green-600">−{formatCurrency(plan.price * plan.discount_percent / 100)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>GST ({plan.gst_percent}%)</span>
                        <span>+{formatCurrency(gstAmount)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 font-semibold text-foreground">
                        <span>Total payable</span>
                        <span>{formatCurrency(totalPrice)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  {plan.features?.length > 0 && (
                    <ul className="space-y-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Subscriber count */}
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Active subscribers</span>
                    <span className="font-semibold">{activeSubs}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/admin/memberships/${plan.id}/edit`}
                      className={buttonVariants({ variant: "outline", size: "sm", className: "flex-1 gap-1.5" })}
                    >
                      <Edit className="size-3.5" />
                      Edit
                    </Link>
                    <ToggleStatusButton
                      planId={plan.id}
                      currentStatus={plan.status}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Client component for status toggle
function ToggleStatusButton({
  planId,
  currentStatus,
}: {
  planId: string;
  currentStatus: string;
}) {
  // Server-rendered — uses a form POST for status toggle
  return (
    <form action={`/api/membership-plans/${planId}/toggle`} method="POST">
      <button
        type="submit"
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className: `gap-1.5 ${currentStatus === "active" ? "text-red-600 hover:bg-red-50 hover:border-red-300" : "text-green-600 hover:bg-green-50 hover:border-green-300"}`,
        })}
      >
        {currentStatus === "active" ? "Deactivate" : "Activate"}
      </button>
    </form>
  );
}
