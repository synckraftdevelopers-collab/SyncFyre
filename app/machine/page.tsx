import { MachineAttendanceTerminal } from "@/components/machine/machine-attendance-terminal";
import { requireUser } from "@/lib/auth";
import { getMachineTerminalDevices } from "@/services/machine-management.service";

export const metadata = { title: "Machine Terminal" };

/** Deliberately outside every portal route group: it has no admin shell or navigation. */
export default async function MachinePage() {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const devices = await getMachineTerminalDevices(profile.branch_id);
  return <MachineAttendanceTerminal devices={devices} />;
}
