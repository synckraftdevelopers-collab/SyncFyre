"use client";

import { useState, type ComponentType } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhaseFeatureKey } from "@/lib/phases/registry";
import type { PhaseSnapshot } from "@/services/phase.service";
import { FeatureUpgradeModal } from "@/components/upgrade/feature-upgrade-modal";
import {
  getFeatureDisplay,
  getPlanForFeature,
  COMMERCIAL_PLANS,
  type CommercialPlanKey,
} from "@/lib/plans/config";
import type { SaaSFeatureKey } from "@/lib/entitlements/registry";

type PhaseLockedMenuItemProps = {
  href: string;
  label: string;
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  featureKey?: PhaseFeatureKey;
  phaseSnapshot?: PhaseSnapshot;
  desktopExpanded: boolean;
  onClick?: () => void;
  className?: string;
  mobile?: boolean;
  /** Current commercial plan key — drives the modal's "Current plan" label */
  currentPlanKey?: CommercialPlanKey;
};

function getLockedTarget(featureKey: PhaseFeatureKey | undefined, phaseSnapshot?: PhaseSnapshot) {
  if (!featureKey || !phaseSnapshot) return null;
  const feature = phaseSnapshot.featureMap[featureKey];
  if (!feature) return null;
  return feature.status === "locked" ? feature : null;
}

/**
 * Sidebar navigation item for a locked feature.
 *
 * On click it shows a contextual upgrade modal (FeatureUpgradeModal) instead
 * of hard-navigating to the generic /phase-locked page.
 * Falls back to the phase-locked URL if no display config exists.
 */
export function PhaseLockedMenuItem({
  href,
  label,
  active,
  icon: Icon,
  featureKey,
  phaseSnapshot,
  desktopExpanded,
  onClick,
  className,
  mobile = false,
  currentPlanKey = "essential",
}: PhaseLockedMenuItemProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const locked = getLockedTarget(featureKey, phaseSnapshot);

  // Resolve display info for the upgrade modal
  const saasKey = featureKey as SaaSFeatureKey | undefined;
  const featureDisplay = saasKey ? getFeatureDisplay(saasKey) : null;
  const requiredPlan = saasKey ? getPlanForFeature(saasKey) : null;
  const hasModalData = Boolean(featureDisplay && requiredPlan);

  // Fallback href for when no modal data exists
  const fallbackHref = locked
    ? `/phase-locked?feature=${encodeURIComponent(featureKey ?? "")}&name=${encodeURIComponent(label)}&phase=${encodeURIComponent(locked.phase)}`
    : href;

  const handleClick = (e: React.MouseEvent) => {
    if (locked && hasModalData) {
      e.preventDefault();
      e.stopPropagation();
      if (onClick) onClick();
      setModalOpen(true);
    } else if (onClick) {
      onClick();
    }
  };

  const upgradeHref = `/admin/upgrade?feature=${encodeURIComponent(featureKey ?? "")}&next=${encodeURIComponent(href)}`;

  const sharedLinkProps = {
    href: locked && hasModalData ? "#" : fallbackHref,
    onClick: handleClick,
    title: locked ? `${label} — ${requiredPlan?.name ?? "Growth"} Plan required` : label,
    "aria-label": locked ? `${label} — ${requiredPlan?.name ?? "Growth"} Plan required` : label,
    "aria-disabled": Boolean(locked),
    role: locked && hasModalData ? "button" : undefined,
  } as const;

  const modal =
    locked && hasModalData && featureDisplay && requiredPlan ? (
      <FeatureUpgradeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        feature={featureDisplay}
        requiredPlan={requiredPlan}
        currentPlanName={COMMERCIAL_PLANS[currentPlanKey].name}
        upgradeHref={upgradeHref}
      />
    ) : null;

  if (mobile) {
    return (
      <>
        <a
          {...sharedLinkProps}
          className={cn(
            "flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium",
            locked ? "text-muted-foreground" : active ? "text-primary" : "text-muted-foreground",
            className,
          )}
        >
          <span className={cn("grid place-items-center rounded-xl", locked && "bg-muted/60")}>
            {locked ? <Lock className="size-4" /> : <Icon className="size-5" />}
          </span>
          <span className="max-w-[68px] truncate">{label}</span>
        </a>
        {modal}
      </>
    );
  }

  return (
    <>
      <a
        {...sharedLinkProps}
        className={cn(
          "group flex cursor-pointer items-center gap-3 rounded-2xl text-sm font-medium transition-all duration-150",
          "min-h-[52px] text-white/70 hover:bg-white/8 hover:text-white",
          desktopExpanded ? "px-3 py-3" : "px-3 py-3 lg:justify-center lg:px-0",
          active && !locked && "bg-primary text-white shadow-[0_6px_18px_rgba(255,48,36,.2)] hover:bg-primary",
          locked &&
            "border border-dashed border-white/15 bg-white/4 text-white/45 hover:bg-white/8 hover:text-white/55",
          className,
        )}
      >
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-2xl transition-all",
            desktopExpanded ? "size-10" : "size-12 lg:size-12",
            locked ? "bg-white/5" : active ? "bg-white/12" : "bg-white/5 group-hover:bg-white/10",
          )}
        >
          {locked ? (
            <Lock
              className={cn("shrink-0", desktopExpanded ? "size-4" : "size-6")}
            />
          ) : (
            <Icon
              className={cn(
                "shrink-0 transition-colors",
                desktopExpanded ? "size-5" : "size-7 lg:size-7",
                active ? "text-white" : "group-hover:text-[#52c7ea]",
              )}
            />
          )}
        </span>
        <span
          className={cn(
            "whitespace-nowrap leading-none transition-all duration-300",
            desktopExpanded ? "lg:block" : "lg:hidden",
            "block",
          )}
        >
          {label}
        </span>
        {locked && desktopExpanded && (
          <span className="ml-auto shrink-0 rounded-full border border-white/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/50">
            {requiredPlan?.name ?? "Growth"}
          </span>
        )}
      </a>
      {modal}
    </>
  );
}
