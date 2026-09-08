import type { LucideIcon } from "lucide-react";
import type { PhaseFeatureKey } from "@/lib/phases/registry";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  featureKey?: PhaseFeatureKey;
}
