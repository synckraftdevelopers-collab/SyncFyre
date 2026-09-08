"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { updateTenantPlanAction } from "@/app/(superadmin)/superadmin/tenants/actions";
import { getCommercialPlanTier } from "@/lib/entitlements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TenantPlanToggleProps = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  plan: string;
  locked?: boolean;
};

function ToggleSubmitButton({ isPaid, locked }: { isPaid: boolean; locked: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending || locked}
      className={`relative h-auto w-full justify-start overflow-hidden rounded-2xl border px-3 py-3 text-left transition-colors ${
        isPaid ? "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15" : "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15"
      }`}
    >
      <span
        className={`inline-flex size-12 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tracking-[0.24em] ${
          isPaid ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
        }`}
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : isPaid ? "ON" : "OFF"}
      </span>
      <span className="ml-3 flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">Plan</span>
        <span className="text-xs text-muted-foreground">{isPaid ? "Phase 2 / Paid" : "Phase 1 / Free"}</span>
        <span className="truncate text-sm font-semibold">{isPaid ? "Paid plan active" : "Free plan active"}</span>
      </span>
      <span className="ml-3 inline-flex shrink-0 items-center rounded-full bg-background/80 px-3 py-1 text-xs font-semibold text-foreground ring-1 ring-border">
        {pending ? "Updating plan..." : locked ? "Protected tenant" : isPaid ? "Switch to Free" : "Switch to Paid"}
      </span>
    </Button>
  );
}

export function TenantPlanToggle({ tenantId, tenantSlug, tenantName, plan, locked = false }: TenantPlanToggleProps) {
  const tier = getCommercialPlanTier(plan);
  const isPaid = tier === "paid";
  const nextPlan = isPaid ? "trial" : "standard";
  const statusLabel = isPaid ? "Phase 2 / Paid" : "Phase 1 / Free";

  return (
    <div className="min-w-[280px] space-y-2">
      <form action={updateTenantPlanAction} className="space-y-2">
        <input type="hidden" name="tenant_id" value={tenantId} />
        <input type="hidden" name="plan" value={nextPlan} />
        <input type="hidden" name="gym_name" value={tenantName} />
        <input type="hidden" name="gym_slug" value={tenantSlug} />
        <ToggleSubmitButton isPaid={isPaid} locked={locked} />
      </form>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{isPaid ? "Toggle is ON" : "Toggle is OFF"}</p>
        {locked ? <Badge variant="outline">Protected</Badge> : <Badge variant={isPaid ? "success" : "secondary"}>{statusLabel}</Badge>}
      </div>
    </div>
  );
}
