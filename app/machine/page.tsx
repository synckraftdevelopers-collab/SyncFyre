import { MachineAttendanceTerminal } from "@/components/machine/machine-attendance-terminal";
import { getMachineSession } from "@/lib/machine/auth";
import { getMachineTerminalDevice } from "@/services/machine-management.service";
import { redirect } from "next/navigation";

export const metadata = { title: "Machine Terminal" };

/** Deliberately outside every portal route group: it has no admin shell or navigation. */
export default async function MachinePage() {
  const session = await getMachineSession();
  if (!session) redirect("/machine/connect");
  const device = await getMachineTerminalDevice(session.machineId, session.branchId);
  if (!device) redirect("/machine/connect");
  return <MachineAttendanceTerminal device={device} />;
}