import { MachineAttendanceTerminal } from "@/components/machine/machine-attendance-terminal";
import { getMachineSession } from "@/lib/machine/auth";
import { getMachineTerminalDevice } from "@/services/machine-management.service";
import { ensurePaidCommercialPlanForBranch } from "@/services/entitlements.service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Machine Terminal" };

/** Deliberately outside every portal route group: it has no admin shell or navigation. */
export default async function MachinePage() {
  const session = await getMachineSession();
  if (!session) redirect("/machine/connect");
  const entitlement = await ensurePaidCommercialPlanForBranch(session.branchId, "Biometric / Face Attendance");
  if (!entitlement.allowed) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Paid Plan required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{entitlement.error}</p>
            <p className="text-sm text-muted-foreground">Ask SuperAdmin to upgrade this tenant, then reconnect the machine.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/machine/connect" className={buttonVariants({ variant: "outline" })}>Reconnect</Link>
              <Link href="/admin/settings?tab=application" className={buttonVariants({})}>Upgrade to Paid</Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }
  const device = await getMachineTerminalDevice(session.machineId, session.branchId);
  if (!device) redirect("/machine/connect");
  return <MachineAttendanceTerminal device={device} />;
}
