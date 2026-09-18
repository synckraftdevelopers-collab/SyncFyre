"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPortalNavItems, portalLabel, type PortalKey } from "@/lib/nav";
import type { CommercialPlanTier } from "@/lib/entitlements";
import type { UserRole } from "@/types";
import { PhaseLockedMenuItem } from "@/components/phase/phase-locked-menu-item";
import { FEATURE_REGISTRY as PHASE_FEATURE_REGISTRY } from "@/lib/phases/registry";
import type { CommercialPlanKey } from "@/lib/plans/config";
import type { PhaseSnapshot } from "@/services/phase.service";

interface PortalSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  desktopExpanded: boolean;
  portal: PortalKey;
  userRole?: UserRole | null;
  visibleNavHrefs?: string[] | null;
  commercialPlanTier?: CommercialPlanTier;
  phaseSnapshot?: PhaseSnapshot;
  /**
   * Current commercial plan key — used to power contextual upgrade modals.
   * Defaults to "essential" when not provided.
   */
  currentPlanKey?: CommercialPlanKey;
}

export function PortalSidebar({
  mobileOpen, onMobileClose, desktopExpanded, portal, userRole, visibleNavHrefs,
  commercialPlanTier = "paid",
  phaseSnapshot,
  currentPlanKey = "essential",
}: PortalSidebarProps) {
  const pathname = usePathname();
  const navigation = getPortalNavItems(portal, userRole);
  const filteredNavigation = visibleNavHrefs === undefined || visibleNavHrefs === null
    ? navigation
    : navigation.filter((item) => visibleNavHrefs.includes(item.href));
  const label = portalLabel[portal];

  /**
   * Three-tier nav grouping based on commercial plan:
   *
   *  Essential (plan_1 / "free"):
   *    - Available: Phase 1 items
   *    - "Growth features" separator
   *    - Locked Phase 2 items
   *    - "Scale features" separator
   *    - Locked Phase 3 items
   *
   *  Growth (plan_2):
   *    - All Phase 1 + Phase 2 items (available)
   *    - "Scale features" separator
   *    - Locked Phase 3 items
   *
   *  Scale (plan_3):
   *    - All items available, no separators
   */
  type NavGroup =
    | { type: "item"; item: (typeof filteredNavigation)[number] }
    | { type: "separator"; label: string; key: string };

  const isScale = currentPlanKey === "scale";
  const isGrowthOrAbove = currentPlanKey === "growth" || currentPlanKey === "scale";

  const navGroups: NavGroup[] = (() => {
    // Scale: no locking, no separators
    if (isScale) {
      return filteredNavigation.map((item) => ({ type: "item" as const, item }));
    }

    // Growth: Phase 2 available, Phase 3 hidden (not locked — simply absent)
    if (isGrowthOrAbove) {
      const available: (typeof filteredNavigation)[number][] = [];

      for (const item of filteredNavigation) {
        // Required tier comes from the static feature registry (which plan
        // tier this feature belongs to), not from the platform-wide phase
        // rollout status — that status is the same for every tenant and
        // isn't what decides what THIS tenant's plan includes.
        const requiredPhase = item.featureKey ? PHASE_FEATURE_REGISTRY[item.featureKey]?.phase : null;
        // Phase 3 items are not shown to Growth users at all — they are simply
        // absent from the nav rather than shown as locked upgrade prompts.
        // Backend middleware still protects these routes; this is UI-only.
        const isPhase3 = requiredPhase === "PHASE_3";
        if (!isPhase3) {
          available.push(item);
        }
      }

      return available.map((item) => ({ type: "item" as const, item }));
    }

    // Essential: Phase 2 locked, Phase 3 also locked
    const available: (typeof filteredNavigation)[number][] = [];
    const growthLocked: (typeof filteredNavigation)[number][] = [];
    const scaleLocked: (typeof filteredNavigation)[number][] = [];

    for (const item of filteredNavigation) {
      const requiredPhase = item.featureKey ? PHASE_FEATURE_REGISTRY[item.featureKey]?.phase : null;
      const isPhase3 = requiredPhase === "PHASE_3";
      const isPhase2 = requiredPhase === "PHASE_2";

      if (isPhase3) {
        scaleLocked.push(item);
      } else if (isPhase2) {
        growthLocked.push(item);
      } else {
        available.push(item);
      }
    }

    const groups: NavGroup[] = available.map((item) => ({ type: "item" as const, item }));

    if (growthLocked.length) {
      groups.push({ type: "separator" as const, label: "Growth features", key: "growth-separator" });
      for (const item of growthLocked) groups.push({ type: "item" as const, item });
    }

    if (scaleLocked.length) {
      groups.push({ type: "separator" as const, label: "Scale features", key: "scale-separator" });
      for (const item of scaleLocked) groups.push({ type: "item" as const, item });
    }

    return groups;
  })();

  return (
    <>
      {mobileOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-[#061a31]/70 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          onKeyDown={(event) => event.key === "Enter" && onMobileClose()}
        />
      )}

      <aside
        className={cn(
          "print:hidden",
          "fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden bg-[#071d38] text-white shadow-2xl",
          "transition-[width,transform] duration-300 ease-in-out",
          "w-[272px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          desktopExpanded ? "lg:w-[272px]" : "lg:w-[88px]",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-white/10",
            desktopExpanded ? "gap-3 px-4" : "gap-3 px-4 lg:justify-center",
          )}
        >
          <div
            className={cn(
              "shrink-0 rounded-lg bg-white px-2 py-1 transition-all duration-300",
              desktopExpanded ? "lg:scale-100 lg:opacity-100" : "lg:w-0 lg:scale-75 lg:px-0 lg:py-0 lg:opacity-0",
              "scale-100 opacity-100",
            )}
          >
            <Image
              src="/syncfyre-logo.png"
              width={88}
              height={42}
              alt="SyncFyre"
              className="h-7 w-auto object-contain"
              priority
            />
          </div>
          <div className="flex-1" />
          <button
            onClick={onMobileClose}
            aria-label="Close menu"
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <div
          className={cn(
            "overflow-hidden transition-all duration-300",
            desktopExpanded ? "lg:max-h-12 lg:opacity-100" : "lg:max-h-0 lg:opacity-0",
            "max-h-12 opacity-100",
          )}
        >
          <p className="whitespace-nowrap px-4 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[.22em] text-[#52c7ea]">
            {label}
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-x-hidden overflow-y-auto px-2 py-3">
          {navGroups.map((group) => {
            if (group.type === "separator") {
              return (
                <div key={group.key} className="px-3 pb-1 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-white/10" />
                    <span
                      className={cn(
                        "whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35",
                        desktopExpanded ? "block" : "hidden lg:hidden",
                        "block",
                      )}
                    >
                      {group.label}
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                </div>
              );
            }

            const { label: navLabel, href, icon: Icon, exact, featureKey } = group.item;
            // Required tier comes from the static feature registry — the
            // same source middleware.ts uses to actually enforce access —
            // compared against this tenant's own plan (currentPlanKey).
            // Phase 3 items are filtered out of navGroups before reaching here for Growth users.
            // For Essential users, Phase 3 items appear in the scaleLocked bucket below.
            const requiredPhase = featureKey ? PHASE_FEATURE_REGISTRY[featureKey]?.phase : null;
            const isPhase3Feature = requiredPhase === "PHASE_3";
            const isPhase2Feature = requiredPhase === "PHASE_2";
            const phaseLocked = (isPhase3Feature && !isScale) || (isPhase2Feature && !isGrowthOrAbove);
            const active = pathname === href || (!exact && pathname.startsWith(`${href}/`));

            if (phaseLocked) {
              return (
                <PhaseLockedMenuItem
                  key={href}
                  href={href}
                  label={navLabel}
                  active={active}
                  icon={Icon}
                  featureKey={featureKey}
                  phaseSnapshot={phaseSnapshot}
                  desktopExpanded={desktopExpanded}
                  onClick={onMobileClose}
                  currentPlanKey={currentPlanKey}
                  locked={phaseLocked}
                />
              );
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={onMobileClose}
                title={navLabel}
                aria-label={navLabel}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl text-sm font-medium transition-all duration-150",
                  "min-h-[52px] text-white/70 hover:bg-white/8 hover:text-white",
                  desktopExpanded ? "px-3 py-3" : "px-3 py-3 lg:justify-center lg:px-0",
                  active && "bg-primary text-white shadow-[0_6px_18px_rgba(255,48,36,.2)] hover:bg-primary",
                )}
              >
                <span
                  className={cn(
                    "grid shrink-0 place-items-center rounded-2xl transition-all",
                    desktopExpanded ? "size-10" : "size-12 lg:size-12",
                    active ? "bg-white/12" : "bg-white/5 group-hover:bg-white/10",
                  )}
                >
                  <Icon
                    className={cn(
                      "shrink-0 transition-colors",
                      desktopExpanded ? "size-5" : "size-7 lg:size-7",
                      active ? "text-white" : "group-hover:text-[#52c7ea]",
                    )}
                  />
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap leading-none transition-all duration-300",
                    desktopExpanded ? "lg:block" : "lg:hidden",
                    "block",
                  )}
                >
                  {navLabel}
                </span>
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            "overflow-hidden transition-all duration-300",
            desktopExpanded ? "lg:max-h-28 lg:opacity-100" : "lg:max-h-0 lg:opacity-0",
            "max-h-28 opacity-100",
          )}
        >
          <div className="mx-2 mb-2 rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-semibold text-white">One intelligent platform.</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">
              Every member. Every payment. Every moving part.
            </p>
            <div className="mt-2 h-1 w-8 rounded-full bg-primary" />
          </div>
        </div>
      </aside>
    </>
  );
}
