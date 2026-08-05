import Link from "next/link";
import { RadioTower, Settings2 } from "lucide-react";
import { SyncMachineButton } from "@/components/settings/sync-machine-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const profile = await requireUser(["admin", "manager"]);
  const supabase = await createClient();
  let query = supabase
    .from("face_machine_settings")
    .select("id,machine_name,machine_ip,machine_api_url,device_id,status,connection_status,last_sync_at");
  if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  const { data } = await query;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Gym, branches, permissions, notifications, and integrations.</p>
      </div>
      <Card>
        <CardHeader className="flex-row items-center">
          <div>
            <CardTitle>Face machine integration</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Configure existing attendance devices.</p>
          </div>
          <Link href="/admin/face-machines/new" className={buttonVariants({ className: "ml-auto" })}>
            <Settings2 className="size-4" />Add machine
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data ?? []).map((machine) => (
            <div key={machine.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <RadioTower className="size-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{machine.machine_name}</p>
                <p className="text-xs text-muted-foreground">{machine.device_id} · {machine.machine_ip ?? machine.machine_api_url ?? "API endpoint not set"}</p>
              </div>
              <Badge variant={machine.connection_status === "online" ? "success" : machine.connection_status === "error" ? "danger" : "outline"}>
                {machine.connection_status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Last sync: {machine.last_sync_at ? new Date(machine.last_sync_at).toLocaleString("en-IN") : "Never"}
              </span>
              <SyncMachineButton id={machine.id} configured={Boolean(machine.machine_api_url)} />
            </div>
          ))}
          {!data?.length && (
            <div className="py-10 text-center text-muted-foreground">
              No face machines configured. Add a device to enable attendance sync.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
