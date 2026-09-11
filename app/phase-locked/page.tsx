import { PhaseLocked } from "@/components/phase/phase-locked";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentPhase } from "@/services/phase.service";
import { PORTAL_DASHBOARD } from "@/lib/portals";

export const metadata = { title: "Feature Locked" };

/** Sanitize the next URL to prevent open redirects. */
function sanitizeNext(next: string | undefined): string | undefined {
  const raw = (next ?? "").trim();
  if (!raw) return undefined;
  if (raw.startsWith("/admin/") || raw === "/admin") return raw;
  if (raw.startsWith("/reception/") || raw === "/reception") return raw;
  if (raw.startsWith("/trainer/") || raw === "/trainer") return raw;
  return undefined;
}

export default async function PhaseLockedPage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string; name?: string; phase?: string; next?: string }>;
}) {
  const profile = await requireUser();
  if (profile.role?.slug === "super_admin") {
    redirect("/superadmin/dashboard");
  }
  const params = await searchParams;
  const currentPhase = await getCurrentPhase();
  const roleSlug = profile.role?.slug as keyof typeof PORTAL_DASHBOARD | undefined;
  const backHref = roleSlug ? (PORTAL_DASHBOARD[roleSlug] ?? "/admin/dashboard") : "/admin/dashboard";
  const nextHref = sanitizeNext(params.next);

  return (
    <PhaseLocked
      featureName={params.name ?? "This feature"}
      requiredPhase={params.phase ?? "PHASE_2"}
      currentPhase={currentPhase.phase_key}
      backHref={backHref}
      featureKey={params.feature}
      nextHref={nextHref ?? backHref}
    />
  );
}
