/**
 * Admin-only biometric / face machine management.
 * The shared data model keeps device status and member mappings consistent with
 * the standalone terminal while this route remains inside the admin shell.
 */
import { BiometricSettingsCard } from "@/components/settings/biometric-settings-card";
import { requireUser } from "@/lib/auth";
import { getMachineManagementData } from "@/services/machine-management.service";

export const metadata = { title: "Biometric Machines" };

export default async function MachinesPage({
  searchParams,
}: {
  searchParams: Promise<{ memberSearch?: string }>;
}) {
  const { memberSearch = "" } = await searchParams;
  const profile = await requireUser(["admin", "manager"]);
  const { devices, mappings } = await getMachineManagementData(profile.branch_id, memberSearch);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Biometric Machines</h1>
        <p className="text-sm text-muted-foreground">
          Manage face-recognition and biometric attendance devices for your branch.
        </p>
      </div>

      <BiometricSettingsCard
        devices={devices}
        mappings={mappings}
        mockEnabled={process.env.BIOMETRIC_MOCK_MODE === "true"}
        search={memberSearch}
      />
    </div>
  );
}