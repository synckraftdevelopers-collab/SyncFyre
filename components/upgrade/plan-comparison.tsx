"use client";

import { CheckCircle2, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COMMERCIAL_PLANS,
  COMMERCIAL_PLAN_ORDER,
  type CommercialPlanKey,
} from "@/lib/plans/config";
import type { SaaSFeatureKey } from "@/lib/entitlements/registry";

type ComparisonRow = {
  label: string;
  featureKey: SaaSFeatureKey;
  /** Which plans include this feature (cumulative) */
  includedIn: CommercialPlanKey[];
};

// Build comparison rows from the canonical plan config (no duplication)
const COMPARISON_ROWS: ComparisonRow[] = COMMERCIAL_PLAN_ORDER.flatMap((planKey) =>
  COMMERCIAL_PLANS[planKey].deltaFeatures.map((f) => {
    // A feature is included in all plans at or above its plan
    const planIdx = COMMERCIAL_PLAN_ORDER.indexOf(planKey);
    const includedIn = COMMERCIAL_PLAN_ORDER.slice(planIdx) as CommercialPlanKey[];
    return {
      label: f.label,
      featureKey: f.featureKey,
      includedIn,
    };
  }),
);

type PlanComparisonProps = {
  currentPlanKey: CommercialPlanKey;
};

/**
 * Responsive plan comparison.
 * On mobile: stacked rows per feature showing ✓ / – per plan.
 * On desktop: traditional comparison table layout.
 */
export function PlanComparison({ currentPlanKey }: PlanComparisonProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Full plan comparison</h2>

      {/* Mobile: card-based comparison */}
      <div className="md:hidden space-y-3">
        {COMPARISON_ROWS.map((row) => (
          <div
            key={row.featureKey}
            className="rounded-xl border bg-card px-4 py-3"
          >
            <p className="text-sm font-medium">{row.label}</p>
            <div className="mt-2 flex gap-4">
              {COMMERCIAL_PLAN_ORDER.map((planKey) => {
                const included = row.includedIn.includes(planKey);
                const isCurrent = planKey === currentPlanKey;
                return (
                  <div key={planKey} className="flex flex-1 flex-col items-center gap-1">
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wide",
                        isCurrent ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {COMMERCIAL_PLANS[planKey].name}
                    </span>
                    {included ? (
                      <CheckCircle2 className="size-5 text-emerald-500" />
                    ) : (
                      <Minus className="size-5 text-muted-foreground/40" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: grid table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-1/2 px-5 py-4 text-left font-semibold text-muted-foreground">
                Feature
              </th>
              {COMMERCIAL_PLAN_ORDER.map((planKey) => {
                const isCurrent = planKey === currentPlanKey;
                return (
                  <th
                    key={planKey}
                    className={cn(
                      "px-5 py-4 text-center font-semibold",
                      isCurrent ? "text-primary" : "text-foreground",
                    )}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      {COMMERCIAL_PLANS[planKey].name}
                      {isCurrent && (
                        <span className="rounded-full border border-emerald-500/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                          Current
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Group by plan section */}
            {COMMERCIAL_PLAN_ORDER.map((sectionPlanKey) => {
              const sectionFeatures = COMPARISON_ROWS.filter(
                (r) => r.includedIn[0] === sectionPlanKey,
              );
              if (!sectionFeatures.length) return null;
              const planName = COMMERCIAL_PLANS[sectionPlanKey].name;
              return [
                <tr key={`header-${sectionPlanKey}`} className="border-b bg-muted/20">
                  <td
                    colSpan={4}
                    className="px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    {planName} features
                  </td>
                </tr>,
                ...sectionFeatures.map((row, rowIdx) => (
                  <tr
                    key={row.featureKey}
                    className={cn(
                      "border-b last:border-0",
                      rowIdx % 2 === 0 ? "bg-background" : "bg-muted/10",
                    )}
                  >
                    <td className="px-5 py-3 font-medium">{row.label}</td>
                    {COMMERCIAL_PLAN_ORDER.map((planKey) => {
                      const included = row.includedIn.includes(planKey);
                      return (
                        <td key={planKey} className="px-5 py-3 text-center">
                          {included ? (
                            <CheckCircle2 className="mx-auto size-5 text-emerald-500" />
                          ) : (
                            <Minus className="mx-auto size-5 text-muted-foreground/30" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
