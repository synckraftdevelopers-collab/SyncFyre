import { PhaseLocked } from "@/components/phase/phase-locked";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentPhase } from "@/services/phase.service";

export const metadata = { title: "Feature Locked" };

export default async function PhaseLockedPage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string; name?: string; phase?: string }>;
}) {
  const profile = await requireUser();
  if (profile.role?.slug === "super_admin") {
    redirect("/superadmin/dashboard");
  }
  const params = await searchParams;
  const currentPhase = await getCurrentPhase();
  return (
    <PhaseLocked
      featureName={params.name ?? "This feature"}
      requiredPhase={params.phase ?? "PHASE_2"}
      currentPhase={currentPhase.phase_key}
      message={params.feature ? `${params.name ?? params.feature} is currently locked.` : undefined}
    />
  );
}
