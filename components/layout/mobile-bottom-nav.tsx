"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";
import { getPortalNavItems, type PortalKey } from "@/lib/nav";
import type { CommercialPlanTier } from "@/lib/entitlements";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import { PhaseLockedMenuItem } from "@/components/phase/phase-locked-menu-item";
import { FEATURE_REGISTRY as PHASE_FEATURE_REGISTRY } from "@/lib/phases/registry";
import type { PhaseSnapshot } from "@/services/phase.service";
import type { CommercialPlanKey } from "@/lib/plans/config";

export function MobileBottomNav({
  portal,
  userRole,
  onMore,
  visibleNavHrefs,
  commercialPlanTier = "paid",
  phaseSnapshot,
  currentPlanKey = "essential",
}: {
  portal: PortalKey;
  userRole?: UserRole | null;
  onMore: () => void;
  visibleNavHrefs?: string[] | null;
  commercialPlanTier?: CommercialPlanTier;
  phaseSnapshot?: PhaseSnapshot;
  currentPlanKey?: CommercialPlanKey;
}) {
  const pathname = usePathname();
  const items = getPortalNavItems(portal, userRole);
  const filteredItems =
    visibleNavHrefs === undefined || visibleNavHrefs === null
      ? items
      : items.filter((item) => visibleNavHrefs.includes(item.href));
  const visibleItems = filteredItems.slice(0, 4);

  const isScale = currentPlanKey === "scale";
  const isGrowthOrAbove = currentPlanKey === "growth" || currentPlanKey === "scale";

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_24px_rgba(7,29,56,.08)] backdrop-blur lg:hidden print:hidden"
    >
      {visibleItems.map(({ label, href, icon: Icon, featureKey }) => {
        // Required tier comes from the static feature registry — the same
        // source middleware.ts uses to actually enforce access — compared
        // against this tenant's own plan (currentPlanKey), not the
        // platform-wide phase rollout status (which is the same for every
        // tenant regardless of what plan any one of them is on).
        const requiredPhase = featureKey ? PHASE_FEATURE_REGISTRY[featureKey]?.phase : null;
        const isPhase3Feature = requiredPhase === "PHASE_3";
        const isPhase2Feature = requiredPhase === "PHASE_2";

        // Three-tier locking:
        // Phase 3 items locked unless Scale; Phase 2 items locked unless Growth+
        const phaseLocked = (isPhase3Feature && !isScale) || (isPhase2Feature && !isGrowthOrAbove);

        const active = pathname === href || pathname.startsWith(`${href}/`);

        if (phaseLocked) {
          return (
            <PhaseLockedMenuItem
              key={href}
              href={href}
              label={label}
              active={active}
              icon={Icon}
              featureKey={featureKey}
              phaseSnapshot={phaseSnapshot}
              desktopExpanded={false}
              mobile
              currentPlanKey={currentPlanKey}
              locked={phaseLocked}
            />
          );
        }

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            <span className="max-w-[68px] truncate">{label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium text-muted-foreground"
      >
        <MoreHorizontal className="size-5" />
        <span>More</span>
      </button>
    </nav>
  );
}
