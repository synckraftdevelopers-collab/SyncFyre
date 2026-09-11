import Link from "next/link";
import { ArrowLeft, Lock, CheckCircle2, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getFeatureDisplay,
  getPlanForFeature,
  COMMERCIAL_PLANS,
} from "@/lib/plans/config";
import type { SaaSFeatureKey } from "@/lib/entitlements/registry";

const PHASE_LABELS: Record<string, string> = {
  PHASE_1: "Essential",
  PHASE_2: "Growth",
  PHASE_3: "Scale",
  phase_1: "Essential",
  phase_2: "Growth",
  phase_3: "Scale",
};

function phaseLabel(phase: string) {
  return PHASE_LABELS[phase] ?? phase;
}

export function PhaseLocked({
  featureName,
  requiredPhase,
  currentPhase,
  message,
  backHref = "/admin/dashboard",
  featureKey,
  nextHref,
}: {
  featureName: string;
  requiredPhase: string;
  currentPhase: string;
  message?: string;
  backHref?: string;
  /** Optional SaaS feature key to load rich display content */
  featureKey?: string;
  /** URL to return to after upgrade */
  nextHref?: string;
}) {
  const requiredLabel = phaseLabel(requiredPhase);
  const currentLabel = phaseLabel(currentPhase);

  // Try to load rich feature display info
  const saasKey = featureKey as SaaSFeatureKey | undefined;
  const featureDisplay = saasKey ? getFeatureDisplay(saasKey) : null;
  const requiredPlan = saasKey ? getPlanForFeature(saasKey) : null;
  const planConfig = requiredPlan ?? COMMERCIAL_PLANS[requiredLabel.toLowerCase() as keyof typeof COMMERCIAL_PLANS] ?? COMMERCIAL_PLANS.growth;

  const upgradeHref = nextHref
    ? `/admin/upgrade?feature=${encodeURIComponent(featureKey ?? featureName)}&next=${encodeURIComponent(nextHref)}`
    : `/admin/upgrade?feature=${encodeURIComponent(featureKey ?? featureName)}`;

  return (
    <div className="grid min-h-[70vh] place-items-center px-4 py-10">
      <Card className="w-full max-w-xl border-dashed bg-gradient-to-br from-background via-background to-muted/25 shadow-xl">
        <CardContent className="space-y-6 p-8">
          {/* Lock icon + header */}
          <div className="text-center">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="size-8" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {requiredLabel} Plan Required
            </p>
            <h1 className="mt-1 text-2xl font-bold">{featureName}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {featureName} is included in the{" "}
              <strong className="text-foreground">{requiredLabel} Plan</strong>. Your gym is
              currently on the{" "}
              <strong className="text-foreground">{currentLabel} Plan</strong>.
            </p>
          </div>

          {/* Feature bullets if available */}
          {featureDisplay?.bullets && featureDisplay.bullets.length > 0 && (
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                What you unlock
              </p>
              <ul className="space-y-1.5">
                {featureDisplay.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Price hint */}
          <p className="text-center text-xs text-muted-foreground">
            {requiredLabel} plan from{" "}
            <span className="font-semibold text-foreground">
              {planConfig.price}
              {planConfig.period}
            </span>
          </p>

          {/* CTA */}
          <p className="text-center text-sm text-muted-foreground">
            {message ?? `Ask your administrator to upgrade to the ${requiredLabel} Plan.`}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href={backHref}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <ArrowLeft className="size-4" />
              Back
            </Link>
            <Link
              href={upgradeHref}
              className={cn(buttonVariants({ variant: "default" }))}
            >
              View {requiredLabel} Plan
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
