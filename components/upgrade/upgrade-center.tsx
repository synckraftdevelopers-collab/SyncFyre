"use client";

import { CheckCircle2, Lock, ArrowRight, Star, Zap, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  COMMERCIAL_PLANS,
  COMMERCIAL_PLAN_ORDER,
  getNextPlan,
  type CommercialPlanKey,
  type CommercialPlanConfig,
} from "@/lib/plans/config";

/**
 * The real SyncFyre upgrade/demo-request destination.
 *
 * Opens the pricing & demo-request section on the SyncFyre landing page.
 * No sensitive tenant data is embedded in this URL.
 */
const SYNCFYRE_PRICING_URL = "https://syncfyre.com/#pricing";

type UpgradeCenterProps = {
  currentPlanKey: CommercialPlanKey;
  /** Feature that triggered the upgrade flow, if any */
  featureLabel?: string;
  /** URL to return to after upgrade is activated (kept for display context only) */
  nextHref?: string;
};

function PlanCard({
  plan,
  isCurrent,
  isRecommended,
  currentPlanKey,
}: {
  plan: CommercialPlanConfig;
  isCurrent: boolean;
  isRecommended: boolean;
  currentPlanKey: CommercialPlanKey;
}) {
  const planOrder = COMMERCIAL_PLAN_ORDER;
  const currentIdx = planOrder.indexOf(currentPlanKey);
  const planIdx = planOrder.indexOf(plan.key);
  const isHigher = planIdx > currentIdx;

  const handleUpgradeClick = () => {
    window.open(SYNCFYRE_PRICING_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-card transition-all",
        isRecommended &&
          "border-primary shadow-[0_0_0_2px_hsl(var(--primary))] shadow-primary/20",
        isCurrent && "border-emerald-500/50 bg-emerald-500/5",
      )}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="rounded-full px-3 py-0.5 text-xs font-semibold shadow-sm">
            <Star className="mr-1 size-3" />
            Recommended
          </Badge>
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold">{plan.name}</h3>
            {isCurrent && (
              <Badge
                variant="outline"
                className="border-emerald-500/60 text-emerald-600 text-xs"
              >
                Current Plan
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{plan.targetCustomer}</p>
        </div>

        {/* Price */}
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-extrabold">{plan.price}</span>
          <span className="text-sm text-muted-foreground">{plan.period}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>

        {/* CTA */}
        <div className="mt-5">
          {isCurrent ? (
            <Button variant="outline" className="w-full" disabled>
              <CheckCircle2 className="mr-2 size-4 text-emerald-500" />
              Current Plan
            </Button>
          ) : isHigher ? (
            <Button
              className="w-full"
              variant={isRecommended ? "default" : "outline"}
              onClick={handleUpgradeClick}
              aria-label={`Upgrade to ${plan.name} — opens SyncFyre pricing page`}
            >
              {isRecommended ? (
                <>
                  <Zap className="mr-2 size-4" />
                  Upgrade to {plan.name}
                  <ExternalLink className="ml-1.5 size-3 opacity-70" />
                </>
              ) : (
                <>
                  Explore {plan.name}
                  <ExternalLink className="ml-1.5 size-3 opacity-70" />
                </>
              )}
            </Button>
          ) : (
            <Button variant="ghost" className="w-full" disabled>
              Included in your plan
            </Button>
          )}
        </div>

        {/* Upgrade clarification — only shown for higher plans */}
        {isHigher && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Opens syncfyre.com/#pricing
          </p>
        )}

        {/* Feature delta */}
        <div className="mt-5 space-y-2">
          {planIdx > 0 && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {isCurrent || planIdx <= currentIdx
                ? "Included features"
                : `Everything in ${COMMERCIAL_PLANS[COMMERCIAL_PLAN_ORDER[planIdx - 1]].name}, plus`}
            </p>
          )}
          {planIdx === 0 && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Included features
            </p>
          )}
          <ul className="space-y-1.5">
            {plan.deltaFeatures.slice(0, 7).map((feature) => (
              <li key={feature.featureKey} className="flex items-start gap-2 text-sm">
                {isCurrent || planIdx <= currentIdx ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                ) : (
                  <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
                )}
                <span
                  className={cn(
                    isCurrent || planIdx <= currentIdx
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {feature.label}
                </span>
              </li>
            ))}
            {plan.deltaFeatures.length > 7 && (
              <li className="pl-6 text-xs text-muted-foreground">
                + {plan.deltaFeatures.length - 7} more features
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Professional SaaS Upgrade Center component.
 *
 * Shows current plan, recommended next plan, and higher plan with feature lists.
 *
 * The "Upgrade to [Plan]" CTA opens the real SyncFyre pricing page on the
 * public landing site (syncfyre.com/#pricing) in a new tab.
 *
 * No plan change is made automatically — activation only happens after the
 * customer contacts the SyncFyre team and a SuperAdmin runs assignTenantPlan().
 */
export function UpgradeCenter({
  currentPlanKey,
  featureLabel,
  nextHref,
}: UpgradeCenterProps) {
  const currentPlan = COMMERCIAL_PLANS[currentPlanKey];
  const nextPlan = getNextPlan(currentPlanKey);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">
          {featureLabel ? `Unlock ${featureLabel}` : "Upgrade your plan"}
        </h1>
        <p className="text-muted-foreground">
          {featureLabel
            ? `${featureLabel} is included in the ${nextPlan?.name ?? "Growth"} plan. Compare all plans below.`
            : "Choose the right plan to grow your gym with SyncFyre."}
        </p>
      </div>

      {/* Current plan summary */}
      <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3">
        <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
        <div>
          <p className="text-sm font-medium">
            You&apos;re on the{" "}
            <span className="font-bold">{currentPlan.name}</span> plan
          </p>
          <p className="text-xs text-muted-foreground">
            {currentPlan.price}
            {currentPlan.period}
          </p>
        </div>
      </div>

      {/* How upgrades work — honest notice */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/20">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
          How upgrades work
        </p>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-500">
          Clicking &ldquo;Upgrade to {nextPlan?.name ?? "Growth"}&rdquo; opens the
          SyncFyre pricing page. Our team will contact you to complete the upgrade and
          activate your new plan. Your current{" "}
          <strong>{currentPlan.name}</strong> plan stays active until then.
        </p>
      </div>

      {/* Plan cards grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {COMMERCIAL_PLAN_ORDER.map((planKey) => {
          const plan = COMMERCIAL_PLANS[planKey];
          const isCurrent = planKey === currentPlanKey;
          const isRecommended = nextPlan?.key === planKey;
          return (
            <PlanCard
              key={planKey}
              plan={plan}
              isCurrent={isCurrent}
              isRecommended={isRecommended}
              currentPlanKey={currentPlanKey}
            />
          );
        })}
      </div>

      {/* Context note when there's a next destination */}
      {nextHref && nextHref !== "/admin/dashboard" && (
        <p className="text-center text-xs text-muted-foreground">
          After your upgrade is activated, you&apos;ll be able to access the feature
          you requested.
        </p>
      )}
    </div>
  );
}
