import { Building2 } from "lucide-react";
import Link from "next/link";
import { BiometricSettingsCard } from "@/components/settings/biometric-settings-card";
import { PersonalSettingsForm } from "@/components/settings/personal-settings-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsBranchForms } from "@/components/settings/settings-branch-forms";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings" };

const tabs = [
  ["profile", "Profile Settings"],
  ["application", "Application Settings"],
  ["biometric", "Biometric Devices"],
] as const;

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; memberSearch?: string }>;
}) {
  const { tab = "profile", memberSearch = "" } = await searchParams;
  const activeTab = ["application", "biometric"].includes(tab) ? tab : "profile";
  const profile = await requireUser(["admin", "manager"]);
  const sb = await createClient();

  let memberMappingsQuery = sb
    .from("members")
    .select("id,full_name,member_code,machine_user_id,status")
    .order("created_at", { ascending: false })
    .limit(20);
  if (profile.branch_id) memberMappingsQuery = memberMappingsQuery.eq("branch_id", profile.branch_id);
  if (memberSearch.trim()) {
    const search = memberSearch.trim().replace(/[%_,]/g, "");
    memberMappingsQuery = memberMappingsQuery.or(
      `full_name.ilike.%${search}%,member_code.ilike.%${search}%,machine_user_id.ilike.%${search}%`,
    );
  }

  const [{ data: branch }, { data: branches }, { data: finance }, { data: devices }, { data: syncLogs }, { data: memberMappings }] = await Promise.all([
    sb.from("branches")
      .select("id,name,code,city,address,phone,status")
      .eq("id", profile.branch_id)
      .maybeSingle(),
    sb.from("branches")
      .select("id,name,code,city,phone,status")
      .eq("status", "active")
      .order("name"),
    sb.from("finance_settings")
      .select("gstin,fiscal_year_start_month")
      .eq("branch_id", profile.branch_id)
      .maybeSingle(),
    (() => {
      let query = sb
        .from("face_machine_settings")
        .select("id,machine_name,device_id,device_identifier,manufacturer,model,serial_number,connection_mode,allowed_ip,status,connection_status,last_seen_at,last_sync_at,last_error,machine_api_url,branches(name)")
        .order("created_at", { ascending: false });
      if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
      return query;
    })(),
    (() => {
      let query = sb
        .from("attendance_sync_logs")
        .select("device_id,event_received_at")
        .gte("event_received_at", `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
      if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
      return query;
    })(),
    memberMappingsQuery,
  ]);

  const todayEvents = new Map<string, number>();
  for (const row of syncLogs ?? []) {
    todayEvents.set(row.device_id, (todayEvents.get(row.device_id) ?? 0) + 1);
  }

  const biometricDevices = (devices ?? []).map((device) => ({
    id: device.id,
    machine_name: device.machine_name,
    device_id: device.device_id,
    device_identifier: device.device_identifier,
    manufacturer: device.manufacturer,
    model: device.model,
    serial_number: device.serial_number,
    connection_mode: device.connection_mode,
    allowed_ip: device.allowed_ip,
    branch_name: (device.branches as { name?: string } | null)?.name ?? null,
    status: device.status,
    connection_status: device.connection_status,
    last_seen_at: device.last_seen_at,
    last_sync_at: device.last_sync_at,
    last_error: device.last_error,
    machine_api_url: device.machine_api_url,
    todayEvents: todayEvents.get(device.device_id) ?? 0,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account details and the application configuration available to your branch.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <Link
            key={id}
            href={`/admin/settings?tab=${id}`}
            className={buttonVariants({
              variant: activeTab === id ? "default" : "outline",
              size: "sm",
            })}
          >
            {label}
          </Link>
        ))}
      </div>

      {activeTab === "profile" && (
        <PersonalSettingsForm
          title="Profile Settings"
          description="Update your personal contact details for the current signed-in account."
          fullName={profile.full_name}
          phone={profile.phone}
        />
      )}

      {activeTab === "application" && (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <SettingsBranchForms branch={branch} finance={finance} isAdmin={profile.role?.slug === "admin"} />

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-muted-foreground" />
                <CardTitle>Active Branches</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Branch configuration affects branch selectors and operational data visibility across the app.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(branches ?? []).map((branchRow) => (
                <div key={branchRow.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{branchRow.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {branchRow.code}
                        {branchRow.city ? ` | ${branchRow.city}` : ""}
                        {branchRow.phone ? ` | ${branchRow.phone}` : ""}
                      </p>
                    </div>
                    <Badge variant="success">{branchRow.status}</Badge>
                  </div>
                </div>
              ))}
              {!(branches ?? []).length && <p className="text-sm text-muted-foreground">No active branches found.</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "biometric" && (
        <BiometricSettingsCard
          devices={biometricDevices}
          mappings={memberMappings ?? []}
          mockEnabled={process.env.BIOMETRIC_MOCK_MODE === "true"}
          search={memberSearch}
        />
      )}
    </div>
  );
}