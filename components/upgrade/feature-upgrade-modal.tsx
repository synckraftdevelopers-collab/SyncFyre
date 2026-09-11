"use client";

import { Lock, CheckCircle2, ArrowRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { CommercialPlanConfig, PlanDisplayFeature } from "@/lib/plans/config";

/**
 * The single upgrade destination used across all upgrade CTAs.
 * Opens the SyncFyre pricing/demo-request section. No tenant data in URL.
 */
export const UPGRADE_DESTINATION_URL = "https://syncfyre.com/#pricing";

type FeatureUpgradeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The feature the user is trying to access */
  feature: PlanDisplayFeature & { label: string };
  /** Plan required to unlock this feature */
  requiredPlan: CommercialPlanConfig;
  /** Current plan name */
  currentPlanName: string;
  /**
   * @deprecated No longer used — the primary CTA opens syncfyre.com/#pricing directly.
   * Kept for API compatibility; will be removed in a future cleanup.
   */
  upgradeHref?: string;
};

/**
 * Contextual upgrade modal shown when a locked feature is clicked.
 *
 * "Upgrade to [Plan]" opens syncfyre.com/#pricing in a new tab — no internal
 * navigation, no mailto, no about:blank.
 *
 * On mobile it anchors to the bottom of the viewport via CSS.
 * On desktop it centers as a standard dialog.
 */
export function FeatureUpgradeModal({
  open,
  onOpenChange,
  feature,
  requiredPlan,
  currentPlanName,
}: FeatureUpgradeModalProps) {
  const handleUpgrade = () => {
    window.open(UPGRADE_DESTINATION_URL, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Desktop: centered, constrained width
          "sm:max-w-md sm:rounded-2xl",
          // Mobile: anchored to bottom, full width, rounded top only
          "max-sm:fixed max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:top-auto max-sm:translate-x-0 max-sm:translate-y-0",
          "max-sm:w-full max-sm:max-w-none max-sm:rounded-t-2xl max-sm:rounded-b-none",
          "overflow-hidden p-0",
        )}
        aria-describedby="feature-modal-desc"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{feature.label} — Upgrade Required</DialogTitle>
          <DialogDescription id="feature-modal-desc">
            Upgrade to {requiredPlan.name} to access {feature.label}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 p-6">
          {/* Feature icon + title */}
          <div className="flex items-start gap-4">
            <div className="mt-0.5 grid shrink-0 size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {requiredPlan.name} Feature
              </p>
              <h2 className="mt-0.5 text-xl font-bold leading-tight">{feature.label}</h2>
              {feature.description && (
                <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
              )}
            </div>
          </div>

          {/* Feature bullets */}
          {feature.bullets && feature.bullets.length > 0 && (
            <div className="rounded-xl border bg-muted/40 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                What you unlock
              </p>
              <ul className="space-y-1.5">
                {feature.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Plan pills */}
          <div className="flex items-center gap-3 rounded-xl border px-4 py-3">
            <div className="flex-1 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Current plan
              </p>
              <p className="mt-0.5 text-sm font-semibold">{currentPlanName}</p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Unlock with
              </p>
              <Badge
                variant="default"
                className="mt-0.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              >
                {requiredPlan.name}
              </Badge>
            </div>
          </div>

          {/* Price hint */}
          <p className="text-center text-xs text-muted-foreground">
            {requiredPlan.name} plan from{" "}
            <span className="font-semibold text-foreground">
              {requiredPlan.price}
              {requiredPlan.period}
            </span>
          </p>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Maybe Later
            </Button>
            <Button
              size="sm"
              onClick={handleUpgrade}
              aria-label={`Upgrade to ${requiredPlan.name} — opens SyncFyre pricing page`}
            >
              Upgrade to {requiredPlan.name}
              <ExternalLink className="ml-1.5 size-3.5 opacity-80" />
            </Button>
          </div>

          <p className="text-center text-[11px] text-muted-foreground">
            Opens syncfyre.com — no plan change until our team activates it
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
