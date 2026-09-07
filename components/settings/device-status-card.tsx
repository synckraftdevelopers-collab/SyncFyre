import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MachineCredentialsButton } from "@/components/settings/machine-credentials-button";
import { MockBiometricButton } from "@/components/settings/mock-biometric-button";
import { SyncMachineButton } from "@/components/settings/sync-machine-button";

type DeviceRow = {
  id: string;
  machine_name: string;
  device_id: string;
  device_identifier: string | null;
  manufacturer: string | null;
  model: string | null;
  branch_name: string | null;
  status: string;
  connection_status: string;
  last_seen_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  machine_api_url: string | null;
};

export function DeviceStatusCard({
  devices,
  mockEnabled,
}: {
  devices: DeviceRow[];
  mockEnabled: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Device status</CardTitle>
          <p className="text-sm text-muted-foreground">
            Live connectivity, last sync, and maintenance actions for biometric machines.
          </p>
        </div>
        <Link href="/admin/machines" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Open machine registry
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {devices.length ? devices.map((device) => (
          <div key={device.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{device.machine_name}</p>
                  <Badge variant={device.status === "active" ? "success" : "outline"}>{device.status}</Badge>
                  <Badge variant={device.connection_status === "online" ? "success" : device.connection_status === "error" ? "danger" : "outline"}>
                    {device.connection_status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Device ID: {device.device_id}
                  {device.device_identifier ? ` | Identifier: ${device.device_identifier}` : ""}
                  {device.manufacturer ? ` | Manufacturer: ${device.manufacturer}` : ""}
                  {device.model ? ` | Model: ${device.model}` : ""}
                  {device.branch_name ? ` | Branch: ${device.branch_name}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last seen: {device.last_seen_at ? new Date(device.last_seen_at).toLocaleString("en-IN") : "Never"}
                  {" | "}Last sync: {device.last_sync_at ? new Date(device.last_sync_at).toLocaleString("en-IN") : "Never"}
                </p>
                {device.last_error ? <p className="text-xs text-destructive">Last error: {device.last_error}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <SyncMachineButton id={device.id} configured={Boolean(device.machine_api_url)} />
                <MachineCredentialsButton id={device.id} active={device.status === "active"} />
                <MockBiometricButton id={device.id} enabled={mockEnabled} />
              </div>
            </div>
          </div>
        )) : (
          <p className="text-sm text-muted-foreground">No biometric devices registered yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

