"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import type { PhaseFeatureKey } from "@/lib/phases/registry";
import type { PhaseSnapshot } from "@/services/phase.service";

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
};

function getLockedTarget(featureKey: PhaseFeatureKey | undefined, phaseSnapshot?: PhaseSnapshot) {
  if (!featureKey || !phaseSnapshot) return null;
  const feature = phaseSnapshot.featureMap[featureKey];
  if (!feature) return null;
  return feature.status === "locked" ? feature : null;
}

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
}: PhaseLockedMenuItemProps) {
  const locked = getLockedTarget(featureKey, phaseSnapshot);
  const targetHref = locked ? `/phase-locked?feature=${encodeURIComponent(featureKey ?? "")}&name=${encodeURIComponent(label)}&phase=${encodeURIComponent(locked.phase)}` : href;

  if (mobile) {
    return (
      <Link
        href={targetHref}
        onClick={onClick}
        title={locked ? `${label} locked in ${locked.phase}` : label}
        aria-label={locked ? `${label} locked in ${locked.phase}` : label}
        aria-disabled={Boolean(locked)}
        className={cn(
          "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium",
          locked ? "text-muted-foreground" : active ? "text-primary" : "text-muted-foreground",
          className,
        )}
      >
        <span className={cn("grid place-items-center rounded-xl", locked && "bg-muted/60")}>
          {locked ? <Lock className="size-4" /> : <Icon className="size-5" />}
        </span>
        <span className="max-w-[68px] truncate">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={targetHref}
      onClick={onClick}
      title={locked ? `${label} locked in ${locked.phase}` : label}
      aria-label={locked ? `${label} locked in ${locked.phase}` : label}
      aria-disabled={Boolean(locked)}
      className={cn(
        "group flex items-center gap-3 rounded-2xl text-sm font-medium transition-all duration-150",
        "min-h-[52px] text-white/70 hover:bg-white/8 hover:text-white",
        desktopExpanded ? "px-3 py-3" : "px-3 py-3 lg:justify-center lg:px-0",
        active && !locked && "bg-primary text-white shadow-[0_6px_18px_rgba(255,48,36,.2)] hover:bg-primary",
        locked && "border border-dashed border-white/15 bg-white/4 text-white/45 hover:bg-white/8 hover:text-white/55",
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
        {locked ? <Lock className={cn("shrink-0", desktopExpanded ? "size-4" : "size-6")} /> : <Icon className={cn("shrink-0 transition-colors", desktopExpanded ? "size-5" : "size-7 lg:size-7", active ? "text-white" : "group-hover:text-[#52c7ea]")} />}
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
    </Link>
  );
}
