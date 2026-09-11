"use client";

import { useState, type ReactNode } from "react";
import { FeatureUpgradeModal } from "@/components/upgrade/feature-upgrade-modal";
import {
  COMMERCIAL_PLANS,
  getFeatureDisplay,
  getPlanForFeature,
  type CommercialPlanKey,
} from "@/lib/plans/config";
import type { SaaSFeatureKey } from "@/lib/entitlements/registry";

type LockedFeatureLinkProps = {
  featureKey: SaaSFeatureKey;
  /** The "next" URL to preserve for post-upgrade redirect */
  nextHref: string;
  /** Current plan key — used to label "Current plan: X" in the modal */
  currentPlanKey: CommercialPlanKey;
  /** Render prop — receives onClick handler */
  children: (props: { onClick: (e: React.MouseEvent) => void }) => ReactNode;
};

/**
 * Wraps any clickable element that opens a locked feature.
 * Intercepts clicks, prevents navigation, and shows the contextual upgrade modal.
 */
export function LockedFeatureLink({
  featureKey,
  nextHref,
  currentPlanKey,
  children,
}: LockedFeatureLinkProps) {
  const [open, setOpen] = useState(false);

  const featureDisplay = getFeatureDisplay(featureKey);
  const requiredPlan = getPlanForFeature(featureKey);
  const currentPlan = COMMERCIAL_PLANS[currentPlanKey];

  if (!featureDisplay || !requiredPlan) {
    // Fallback: just render children without interception
    return <>{children({ onClick: () => {} })}</>;
  }

  const upgradeHref = `/admin/upgrade?feature=${encodeURIComponent(featureKey)}&next=${encodeURIComponent(nextHref)}`;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      {children({ onClick: handleClick })}
      <FeatureUpgradeModal
        open={open}
        onOpenChange={setOpen}
        feature={featureDisplay}
        requiredPlan={requiredPlan}
        currentPlanName={currentPlan.name}
        upgradeHref={upgradeHref}
      />
    </>
  );
}
