import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Device Integration" };

type Device = {
  id: string;
  machine_name: string;
  provider: string | null;
  device_id: string;
  device_identifier: string | null;
  status: string;
  connection_status: string;
  last_sync_at: string | null;
  branches: { name: string } | null;
  tenants: { name: string } | null;
};

export default async function SuperAdminDevicesPage() {
  await requireUser(["super_admin"]);
  const admin = createAdminClient();
  const { data, error } = await admin.from("face_machine_settings").select("id,machine_name,provider,device_id,device_identifier,status,connection_status,last_sync_at,branches(name),tenants(name)").order("created_at", { ascending: false });
  if (error) throw error;
  const devices = (data ?? []) as unknown as Device[];

  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Machine Integration</h1><p className="text-sm text-muted-foreground">Biometric and attendance devices connected to gym branches.</p></div><Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Connected machines</CardTitle><Badge variant="secondary">{devices.length} total</Badge></CardHeader><CardContent className="overflow-x-auto">{devices.length ? <table className="w-full min-w-[980px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Machine</th><th className="px-4 py-3">Machine Type</th><th className="px-4 py-3">Device ID</th><th className="px-4 py-3">Gym</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Connection Status</th><th className="px-4 py-3">Integration Status</th><th className="px-4 py-3">Last Sync</th></tr></thead><tbody className="divide-y">{devices.map((device) => <tr key={device.id}><td className="px-4 py-3 font-medium">{device.machine_name}</td><td className="px-4 py-3 text-muted-foreground capitalize">{device.provider ?? "generic"}</td><td className="px-4 py-3 font-mono text-xs">{device.device_identifier ?? device.device_id}</td><td className="px-4 py-3">{device.tenants?.name ?? "Unassigned"}</td><td className="px-4 py-3 text-muted-foreground">{device.branches?.name ?? "Unassigned"}</td><td className="px-4 py-3"><Badge variant={device.connection_status === "online" ? "success" : device.connection_status === "error" ? "danger" : "outline"}>{device.connection_status}</Badge></td><td className="px-4 py-3"><Badge variant={device.status === "active" ? "success" : "outline"}>{device.status}</Badge></td><td className="px-4 py-3 text-xs text-muted-foreground">{device.last_sync_at ? new Date(device.last_sync_at).toLocaleString("en-IN") : "Never"}</td></tr>)}</tbody></table> : <p className="py-12 text-center text-sm text-muted-foreground">No biometric devices are configured.</p>}</CardContent></Card></div>;
}
