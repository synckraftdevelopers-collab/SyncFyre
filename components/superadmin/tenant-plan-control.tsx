"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { assignTenantPlanAction, type PlanActionState } from "@/app/(superadmin)/superadmin/tenants/plan-actions";
import { normalizePlan } from "@/lib/entitlements/evaluate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Maps the stored DB value to a display-friendly plan name. */
const PLAN_LABELS: Record<string, { name: string; planId: "plan_1" | "plan_2" | "plan_3" }> = {
  plan_1: { name: "Essential", planId: "plan_1" },
  plan_2: { name: "Growth", planId: "plan_2" },
  plan_3: { name: "Scale", planId: "plan_3" },
};

const ALL_PLANS: Array<{ planId: "plan_1" | "plan_2" | "plan_3"; name: string; tagline: string }> = [
  { planId: "plan_1", name: "Essential", tagline: "Phase 1" },
  { planId: "plan_2", name: "Growth", tagline: "Phase 1 + 2" },
  { planId: "plan_3", name: "Scale", tagline: "Phase 1 + 2 + 3" },
];

type TenantPlanControlProps = {
  tenantId: string;
  tenantName: string;
  storedPlan: string;
  locked?: boolean;
};

export function TenantPlanControl({
  tenantId,
  tenantName,
  storedPlan,
  locked = false,
}: TenantPlanControlProps) {
  // Normalize the stored DB value (handles trial/standard/professional/enterprise aliases)
  const resolvedPlanId = normalizePlan(storedPlan as Parameters<typeof normalizePlan>[0]) ?? "plan_1";
  const [activePlanId, setActivePlanId] = useState<"plan_1" | "plan_2" | "plan_3">(resolvedPlanId);
  const [pendingPlanId, setPendingPlanId] = useState<"plan_1" | "plan_2" | "plan_3" | null>(null);
  const [state, formAction, isSubmitting] = useActionState<PlanActionState, FormData>(
    assignTenantPlanAction,
    {},
  );
  // useActionState's dispatch must be called inside a transition when
  // invoked outside a <form action=...>/formAction prop (e.g. from this
  // onClick handler) — otherwise React warns and isSubmitting won't track
  // correctly. See handleSelect below.
  const [, startTransition] = useTransition();

  // Sync back if a successful assignment was confirmed by the server
  useEffect(() => {
    if (state.success && pendingPlanId) {
      setActivePlanId(pendingPlanId);
      setPendingPlanId(null);
    }
    if (state.error && pendingPlanId) {
      // Revert optimistic update on error
      setPendingPlanId(null);
    }
  }, [state.success, state.error, pendingPlanId]);

  async function handleSelect(planId: "plan_1" | "plan_2" | "plan_3") {
    if (locked || isSubmitting || planId === activePlanId) return;

    const targetName = PLAN_LABELS[planId]?.name ?? planId;
    const confirmed = window.confirm(
      `Change ${tenantName} to the ${targetName} plan?\n\nThis updates the tenant's plan immediately. Feature access changes take effect on next page load.`,
    );
    if (!confirmed) return;

    setPendingPlanId(planId);

    const formData = new FormData();
    formData.set("tenant_id", tenantId);
    formData.set("plan_id", planId);
    startTransition(() => {
      formAction(formData);
    });
  }

  const displayPlanId = pendingPlanId ?? activePlanId;

  return (
    <div className="min-w-[260px] space-y-2">
      {/* Plan selector buttons */}
      <div className="flex flex-col gap-1.5">
        {ALL_PLANS.map((plan) => {
          const isActive = plan.planId === displayPlanId;
          const isPending = isSubmitting && pendingPlanId === plan.planId;

          return (
            <button
              key={plan.planId}
              type="button"
              disabled={locked || isSubmitting}
              onClick={() => void handleSelect(plan.planId)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-60",
                isActive
                  ? "border-primary/40 bg-primary/10 font-semibold text-primary"
                  : "border-border hover:bg-muted/60 text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={isActive}
              aria-label={`Set plan to ${plan.name}`}
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border-2 text-[10px]",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 bg-transparent",
                )}
              >
                {isPending ? (
                  <LoaderCircle className="size-3 animate-spin" />
                ) : isActive ? (
                  <CheckCircle2 className="size-3.5" />
                ) : null}
              </span>
              <span className="flex-1">
                <span className="block leading-none">{plan.name}</span>
                <span className="block text-[11px] text-muted-foreground leading-tight mt-0.5">
                  {plan.tagline}
                </span>
              </span>
              {isActive && (
                <Badge
                  variant="outline"
                  className="shrink-0 border-primary/40 text-primary text-[10px] px-1.5 py-0"
                >
                  Active
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Status / feedback */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <p className="text-xs text-muted-foreground">
          {isSubmitting
            ? "Updating plan..."
            : `${PLAN_LABELS[displayPlanId]?.name ?? displayPlanId} active`}
        </p>
        {locked ? (
          <Badge variant="outline">Protected</Badge>
        ) : (
          <Badge variant={displayPlanId === "plan_1" ? "secondary" : "success"}>
            {PLAN_LABELS[displayPlanId]?.name ?? displayPlanId}
          </Badge>
        )}
      </div>

      {state.success ? (
        <p className="text-xs text-emerald-700">{state.success}</p>
      ) : null}
      {state.error ? (
        <p className="text-xs text-red-600">{state.error}</p>
      ) : null}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 shrink-0" />
        <span>
          {locked
            ? "Talwalkar Gym is protected — plan cannot be changed."
            : "SuperAdmin-only plan control."}
        </span>
      </div>
    </div>
  );
}
