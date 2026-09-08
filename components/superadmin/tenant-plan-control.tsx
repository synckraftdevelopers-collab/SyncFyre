"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { assignTenantPlanAction, type PlanActionState } from "@/app/(superadmin)/superadmin/tenants/plan-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  { id: "plan_1", label: "Plan 1", detail: "Essential Operations" },
  { id: "plan_2", label: "Plan 2", detail: "Growth & Automation" },
  { id: "plan_3", label: "Plan 3", detail: "Scale & Intelligence" },
] as const;

type ProductPlan = (typeof plans)[number]["id"];

function productPlanFromStored(value: string): ProductPlan {
  if (value === "professional") return "plan_2";
  if (value === "enterprise") return "plan_3";
  return "plan_1";
}

export function TenantPlanControl({ tenantId, storedPlan }: { tenantId: string; storedPlan: string }) {
  const initial = productPlanFromStored(storedPlan);
  const [currentPlan, setCurrentPlan] = useState<ProductPlan>(initial);
  const [state, action, pending] = useActionState<PlanActionState, FormData>(assignTenantPlanAction, {});

  function submit(formData: FormData) {
    const selected = String(formData.get("plan_id")) as ProductPlan;
    const plan = plans.find((item) => item.id === selected);
    if (!plan || !window.confirm(`Change this tenant to ${plan.label}? This changes only the SaaS plan.`)) return;
    setCurrentPlan(selected);
    action(formData);
  }

  const selected = plans.find((plan) => plan.id === currentPlan) ?? plans[0];
  return (
    <Card className="min-w-72">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4" />SaaS plan control</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">Current plan: <strong>{selected.label}</strong> <span className="text-muted-foreground">({selected.detail})</span></p>
        <form action={submit} className="space-y-2">
          <input type="hidden" name="tenant_id" value={tenantId} />
          <label className="text-xs font-medium" htmlFor={`plan-${tenantId}`}>Product plan</label>
          <select id={`plan-${tenantId}`} name="plan_id" defaultValue={currentPlan} className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm">
            {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.label} — {plan.detail}</option>)}
          </select>
          <Button type="submit" size="sm" disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : null}Change plan</Button>
        </form>
        {state.success ? <p className="text-xs text-emerald-700">{state.success} Resulting plan: {selected.label}.</p> : null}
        {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      </CardContent>
    </Card>
  );
}