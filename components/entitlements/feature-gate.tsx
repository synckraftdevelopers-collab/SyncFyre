import type { ReactNode } from "react";
import Link from "next/link";

export function FeatureGate({
  available,
  locked,
  label,
  phase,
  children,
  upgradeHref = "/admin/settings?tab=subscription",
}: {
  available: boolean;
  locked: boolean;
  label: string;
  phase?: string;
  children: ReactNode;
  upgradeHref?: string;
}) {
  if (available) return <>{children}</>;
  if (!locked) return null;
  return (
    <div className="rounded-lg border border-dashed p-4" role="status" aria-label={`${label} locked`}>
      <p className="font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">Available in {phase ?? "a higher plan"}.</p>
      <Link className="mt-2 inline-block text-sm underline" href={upgradeHref}>View upgrade options</Link>
    </div>
  );
}