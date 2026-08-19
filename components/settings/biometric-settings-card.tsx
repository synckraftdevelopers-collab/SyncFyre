import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MockBiometricButton } from "@/components/settings/mock-biometric-button";
import { SyncMachineButton } from "@/components/settings/sync-machine-button";

type DeviceRow = {
  id: string;
  machine_name: string;
  device_id: string;
  device_identifier: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  connection_mode: string | null;
  allowed_ip: string | null;
  branch_name: string | null;
  status: string;
  connection_status: string;
  last_seen_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  machine_api_url: string | null;
  todayEvents: number;
};

type MappingRow = {
  id: string;
  full_name: string;
  member_code: string;
  machine_user_id: string | null;
  status: string;
};

export function BiometricSettingsCard({
  devices,
  mappings,
  mockEnabled,
  search,
}: {
  devices: DeviceRow[];
  mappings: MappingRow[];
  mockEnabled: boolean;
  search: string;
}) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Biometric Devices</CardTitle>
            <p className="text-sm text-muted-foreground">
              Registered face/fingerprint devices, live communication status, and per-device test actions.
            </p>
          </div>
          <Link href="/admin/face-machines/new" className={buttonVariants({ size: "sm" })}>
            Add device
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {devices.map((device) => (
            <div key={device.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{device.machine_name}</p>
                    <Badge variant={device.status === "active" ? "success" : "outline"}>{device.status}</Badge>
                    <Badge variant={device.connection_status === "online" ? "success" : "outline"}>
                      {device.connection_status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[device.manufacturer, device.model].filter(Boolean).join(" · ") || "Unspecified model"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Device ID: {device.device_id}
                    {device.device_identifier ? ` | Identifier: ${device.device_identifier}` : ""}
                    {device.serial_number ? ` | Serial: ${device.serial_number}` : ""}
                    {device.connection_mode ? ` | Mode: ${device.connection_mode.toUpperCase()}` : ""}
                    {device.branch_name ? ` | Branch: ${device.branch_name}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last seen: {device.last_seen_at ? new Date(device.last_seen_at).toLocaleString("en-IN") : "Never"}
                    {" | "}Last sync: {device.last_sync_at ? new Date(device.last_sync_at).toLocaleString("en-IN") : "Never"}
                    {" | "}Events today: {device.todayEvents}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Allowed IP: {device.allowed_ip ?? "Any"}
                    {device.last_error ? ` | Last error: ${device.last_error}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <SyncMachineButton id={device.id} configured={Boolean(device.machine_api_url)} />
                  <MockBiometricButton id={device.id} enabled={mockEnabled} />
                </div>
              </div>
            </div>
          ))}
          {!devices.length && <p className="text-sm text-muted-foreground">No biometric devices registered yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Member Biometric Mapping</CardTitle>
            <p className="text-sm text-muted-foreground">
              Search members, review biometric user IDs, and open the member editor to assign or change mappings.
            </p>
          </div>
          <form action="/admin/settings" className="flex gap-2">
            <input type="hidden" name="tab" value="biometric" />
            <input
              name="memberSearch"
              defaultValue={search}
              placeholder="Search member"
              className="h-10 rounded-lg border bg-background px-3 text-sm"
            />
            <button className={buttonVariants({ variant: "outline", size: "sm" })}>Search</button>
          </form>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="pb-3">Member</th>
                <th className="pb-3">Member code</th>
                <th className="pb-3">Biometric user ID</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mappings.map((member) => (
                <tr key={member.id}>
                  <td className="py-3 font-medium">{member.full_name}</td>
                  <td>{member.member_code}</td>
                  <td>{member.machine_user_id ?? "Not assigned"}</td>
                  <td>
                    <Badge variant={member.status === "active" ? "success" : "outline"}>{member.status}</Badge>
                  </td>
                  <td>
                    <Link href={`/admin/members/${member.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Open member
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!mappings.length && <p className="py-8 text-sm text-muted-foreground">No member mappings matched the current search.</p>}
        </CardContent>
      </Card>
    </div>
  );
}