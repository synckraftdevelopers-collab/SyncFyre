"use client";

import { useActionState, useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { assignTenantPlanAction, type PlanActionState } from "@/app/(superadmin)/superadmin/tenants/plan-actions";
import { getCommercialPlanTier } from "@/lib/entitlements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TenantPlanControlProps = {
  tenantId: string;
  tenantName: string;
  storedPlan: string;
  locked?: boolean;
};

export function TenantPlanControl({ tenantId, tenantName, storedPlan, locked = false }: TenantPlanControlProps) {
  const isPaidPlan = getCommercialPlanTier(storedPlan) === "paid";
  const [currentPaid, setCurrentPaid] = useState(isPaidPlan);
  const [submittedPlan, setSubmittedPlan] = useState<"plan_1" | "plan_2" | null>(null);
  const [state, action, pending] = useActionState<PlanActionState, FormData>(assignTenantPlanAction, {});

  useEffect(() => {
    if (!pending && !submittedPlan) setCurrentPaid(isPaidPlan);
  }, [isPaidPlan, pending, submittedPlan]);

  useEffect(() => {
    if (state.success && submittedPlan) {
      setCurrentPaid(submittedPlan === "plan_2");
      setSubmittedPlan(null);
      return;
    }
    if (state.error && submittedPlan) {
      setCurrentPaid(isPaidPlan);
      setSubmittedPlan(null);
    }
  }, [isPaidPlan, state.error, state.success, submittedPlan]);

  const nextPlanId = currentPaid ? "plan_1" : "plan_2";
  const label = currentPaid ? "Phase 2 / Paid" : "Phase 1 / Free";
  const statusLabel = currentPaid ? "Plan 2 active" : "Plan 1 active";

  async function submit(formData: FormData) {
    if (!window.confirm(`Change ${tenantName} to ${currentPaid ? "Phase 1 / Free" : "Phase 2 / Paid"}?`)) return;
    setSubmittedPlan(nextPlanId);
    await action(formData);
  }

  return (
    <div className="min-w-[280px] space-y-2">
      <form action={submit} className="space-y-2">
        <input type="hidden" name="tenant_id" value={tenantId} />
        <input type="hidden" name="plan_id" value={nextPlanId} />
        <Button
          type="submit"
          variant="outline"
          disabled={pending || locked}
          className={`relative h-auto w-full justify-start overflow-hidden rounded-2xl border px-3 py-3 text-left transition-colors ${
            currentPaid ? "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15" : "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15"
          }`}
        >
          <span className={`inline-flex size-12 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tracking-[0.24em] ${currentPaid ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}>
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : currentPaid ? "ON" : "OFF"}
          </span>
          <span className="ml-3 flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">Plan</span>
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="truncate text-sm font-semibold">{statusLabel}</span>
          </span>
          <span className="ml-3 inline-flex shrink-0 items-center rounded-full bg-background/80 px-3 py-1 text-xs font-semibold text-foreground ring-1 ring-border">
            {pending ? "Updating plan..." : locked ? "Protected tenant" : currentPaid ? "Switch to Free" : "Switch to Paid"}
          </span>
        </Button>
      </form>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{currentPaid ? "Toggle is ON" : "Toggle is OFF"}</p>
        {locked ? <Badge variant="outline">Protected</Badge> : <Badge variant={currentPaid ? "success" : "secondary"}>{label}</Badge>}
      </div>
      {state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" />
        <span>{locked ? "Talwalkar Gym is protected." : "SuperAdmin-only plan control."}</span>
      </div>
    </div>
  );
}
