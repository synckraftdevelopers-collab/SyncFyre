"use client";

import { useState } from "react";
import { CheckCircle2, Lock, ArrowRight, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  COMMERCIAL_PLANS,
  COMMERCIAL_PLAN_ORDER,
  getNextPlan,
  type CommercialPlanKey,
  type CommercialPlanConfig,
} from "@/lib/plans/config";

type UpgradeCenterProps = {
  currentPlanKey: CommercialPlanKey;
  /** Feature that triggered the upgrade flow, if any */
  featureLabel?: string;
  /** URL to return to after upgrade/request */
  nextHref?: string;
};

function PlanCard({
  plan,
  isCurrent,
  isRecommended,
  currentPlanKey,
  onRequestUpgrade,
}: {
  plan: CommercialPlanConfig;
  isCurrent: boolean;
  isRecommended: boolean;
  currentPlanKey: CommercialPlanKey;
  onRequestUpgrade: (plan: CommercialPlanConfig) => void;
}) {
  const planOrder = COMMERCIAL_PLAN_ORDER;
  const currentIdx = planOrder.indexOf(currentPlanKey);
  const planIdx = planOrder.indexOf(plan.key);
  const isHigher = planIdx > currentIdx;

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-card transition-all",
        isRecommended && "border-primary shadow-[0_0_0_2px_hsl(var(--primary))] shadow-primary/20",
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
              <Badge variant="outline" className="border-emerald-500/60 text-emerald-600 text-xs">
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
              onClick={() => onRequestUpgrade(plan)}
            >
              {isRecommended ? (
                <>
                  <Zap className="mr-2 size-4" />
                  Upgrade to {plan.name}
                </>
              ) : (
                <>
                  Explore {plan.name}
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          ) : (
            <Button variant="ghost" className="w-full" disabled>
              Included in your plan
            </Button>
          )}
        </div>

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
              <li className="text-xs text-muted-foreground pl-6">
                + {plan.deltaFeatures.length - 7} more features
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function UpgradeRequestPanel({
  plan,
  featureLabel,
  nextHref,
  onBack,
}: {
  plan: CommercialPlanConfig;
  featureLabel?: string;
  nextHref?: string;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl space-y-6 py-6 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Zap className="size-8" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Upgrade to {plan.name}</h2>
        <p className="text-muted-foreground">
          {featureLabel
            ? `To access ${featureLabel}, your gym needs the ${plan.name} plan.`
            : `Upgrade to ${plan.name} to unlock more features for your gym.`}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-extrabold">{plan.price}</span>
            <span className="text-muted-foreground">{plan.period}</span>
          </div>
          <p className="text-sm text-muted-foreground">{plan.tagline}</p>

          <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 p-4 text-left text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-400">
              How upgrades work
            </p>
            <p className="mt-1 text-amber-700 dark:text-amber-500">
              Plan upgrades are processed by our team. Click the button below to
              initiate your upgrade request. Our team will contact you within 24 hours
              to complete the process and activate your {plan.name} plan.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              size="default"
              className="w-full"
              onClick={() => {
                const subject = encodeURIComponent(`Upgrade request — ${plan.name} plan`);
                const body = encodeURIComponent(
                  `Hi SyncFyre team,\n\nI'd like to upgrade my gym to the ${plan.name} plan (${plan.price}/year).\n\nPlease contact me to complete the upgrade.\n\nThank you.`,
                );
                window.open(`mailto:support@syncfyre.com?subject=${subject}&body=${body}`, "_blank");
              }}
            >
              <Zap className="mr-2 size-4" />
              Request Upgrade to {plan.name}
            </Button>
            <Button variant="outline" size="default" className="w-full" onClick={onBack}>
              Back to plans
            </Button>
          </div>
        </CardContent>
      </Card>

      {nextHref && nextHref !== "/admin/dashboard" && (
        <p className="text-xs text-muted-foreground">
          After your upgrade is activated, you&apos;ll be taken directly to your requested feature.
        </p>
      )}
    </div>
  );
}

/**
 * Professional SaaS Upgrade Center component.
 *
 * Shows current plan, recommended next plan, and higher plan with feature lists.
 * Handles the "request upgrade" flow without fake payment simulation.
 */
export function UpgradeCenter({
  currentPlanKey,
  featureLabel,
  nextHref,
}: UpgradeCenterProps) {
  const [requestingPlan, setRequestingPlan] = useState<CommercialPlanConfig | null>(null);

  const currentPlan = COMMERCIAL_PLANS[currentPlanKey];
  const nextPlan = getNextPlan(currentPlanKey);

  if (requestingPlan) {
    return (
      <UpgradeRequestPanel
        plan={requestingPlan}
        featureLabel={featureLabel}
        nextHref={nextHref}
        onBack={() => setRequestingPlan(null)}
      />
    );
  }

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
        <CheckCircle2 className="size-5 text-emerald-500" />
        <div>
          <p className="text-sm font-medium">
            You&apos;re on the <span className="font-bold">{currentPlan.name}</span> plan
          </p>
          <p className="text-xs text-muted-foreground">{currentPlan.price}{currentPlan.period}</p>
        </div>
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
              onRequestUpgrade={(p) => setRequestingPlan(p)}
            />
          );
        })}
      </div>
    </div>
  );
}
