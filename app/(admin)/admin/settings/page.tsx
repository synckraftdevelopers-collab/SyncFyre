import { Building2, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteBranchAction } from "@/app/actions/settings-actions";
import { BiometricSettingsCard } from "@/components/settings/biometric-settings-card";
import { AccountSecurityCard } from "@/components/settings/account-security-card";
import { PersonalSettingsForm } from "@/components/settings/personal-settings-form";
import { CustomizationSettingsPanel } from "@/components/settings/customization-settings-panel";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsBranchForms } from "@/components/settings/settings-branch-forms";
import type { CommunicationTemplateRecord, MemberCustomFieldRecord, MemberCustomFieldValueRecord } from "@/lib/config/schema";
import { FEATURE_KEYS, type ConfigKey } from "@/lib/config/schema";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ResolvedSettingResult } from "@/services/config.service";
import {
  getCustomFields,
  getMemberCustomFieldValues,
  getPaymentMethods,
  getResolvedSettings,
  getTenantFeatures,
  isFeatureEnabled,
  listCommunicationTemplates,
} from "@/services/config.service";

export const metadata = { title: "Settings" };

const tabs = [
  ["profile", "Profile Settings"],
  ["application", "Application Settings"],
  ["customization", "Customization"],
  ["biometric", "Biometric Devices"],
] as const;

type ResolvedUiMap = Record<string, { value: unknown; source: string; updatedAt: string | null; updatedBy: string | null }>;
type TemplateRow = CommunicationTemplateRecord & { branches?: { name?: string | null }[] | null };
type CustomFieldRow = MemberCustomFieldRecord & { users?: { full_name?: string | null } | null };
type CustomFieldValueRow = MemberCustomFieldValueRecord & { member_custom_fields?: Array<{ field_name?: string | null; field_key?: string | null }> | null };

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; memberSearch?: string }> }) {
  const { tab = "profile", memberSearch = "" } = await searchParams;
  const activeTab = ["application", "biometric", "customization"].includes(tab) ? tab : "profile";
  const profile = await requireUser(["owner", "admin", "manager"]);
  if (activeTab === "profile") {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage account, branch, and Finance configuration for the current branch.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map(([id, label]) => (
            <Link key={id} href={`/admin/settings?tab=${id}`} className={buttonVariants({ variant: activeTab === id ? "default" : "outline", size: "sm" })}>
              {label}
            </Link>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <PersonalSettingsForm title="Profile Settings" description="Update your personal contact details for the current signed-in account." fullName={profile.full_name} phone={profile.phone} />
          <AccountSecurityCard email={profile.email} />
        </div>
      </div>
    );
  }

  const sb = await createClient();

  const isApplicationTab = activeTab === "application";
  const isCustomizationTab = activeTab === "customization";
  const isBiometricTab = activeTab === "biometric";

  let branch = null as Awaited<ReturnType<typeof sb.from>> extends never ? never : any;
  let branches = [] as any[];
  let finance = null as any;
  let devices = [] as any[];
  let syncLogs = [] as any[];
  let memberMappings = [] as any[];
  let customizationMembers = [] as any[];
  let customizationEnabled = false;
  let resolvedSettings = {} as Record<ConfigKey, ResolvedSettingResult>;
  let tenantFeatures = [] as any[];
  let templates = [] as TemplateRow[];
  let customFields = [] as CustomFieldRow[];
  let visiblePaymentModes = [] as any[];
  let sampleValues = [] as CustomFieldValueRow[];

  if (isApplicationTab) {
    const [branchResult, branchesResult, financeResult] = await Promise.all([
      sb.from("branches").select("id,name,code,city,address,phone,state,status").eq("id", profile.branch_id).eq("tenant_id", profile.tenant_id).maybeSingle(),
      sb.from("branches").select("id,name,code,city,phone,status").eq("tenant_id", profile.tenant_id).eq("status", "active").order("name"),
      sb.from("finance_settings").select("gst_registered,gstin,legal_business_name,business_address,business_city,business_state,business_state_code,default_gst_rate,gst_pricing_mode,fiscal_year_start_month").eq("branch_id", profile.branch_id).maybeSingle(),
    ]);
    branch = branchResult.data;
    branches = branchesResult.data ?? [];
    finance = financeResult.data;
  }

  if (isBiometricTab) {
    let memberMappingsQuery = sb.from("members").select("id,full_name,member_code,machine_user_id,status").order("created_at", { ascending: false }).limit(20);
    if (profile.branch_id) memberMappingsQuery = memberMappingsQuery.eq("branch_id", profile.branch_id);
    if (profile.tenant_id) memberMappingsQuery = memberMappingsQuery.eq("tenant_id", profile.tenant_id);
    if (memberSearch.trim()) {
      const search = memberSearch.trim().replace(/[%_,]/g, "");
      memberMappingsQuery = memberMappingsQuery.or(`full_name.ilike.%${search}%,member_code.ilike.%${search}%,machine_user_id.ilike.%${search}%`);
    }

    const [devicesResult, syncLogsResult, memberMappingsResult] = await Promise.all([
      (() => {
        let query = sb.from("face_machine_settings").select("id,machine_name,device_id,device_identifier,manufacturer,model,serial_number,connection_mode,allowed_ip,status,connection_status,last_seen_at,last_sync_at,last_error,machine_api_url,branches(name)").order("created_at", { ascending: false });
        if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
        if (profile.tenant_id) query = query.eq("tenant_id", profile.tenant_id);
        return query;
      })(),
      (() => {
        let query = sb.from("attendance_sync_logs").select("device_id,event_received_at").gte("event_received_at", `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
        if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
        if (profile.tenant_id) query = query.eq("tenant_id", profile.tenant_id);
        return query;
      })(),
      memberMappingsQuery,
    ]);

    devices = devicesResult.data ?? [];
    syncLogs = syncLogsResult.data ?? [];
    memberMappings = memberMappingsResult.data ?? [];
  }

  if (isCustomizationTab && profile.tenant_id) {
    customizationEnabled = await isFeatureEnabled(profile.tenant_id, "customization_engine_enabled");
    const [branchesResult, customizationMembersResult] = await Promise.all([
      sb.from("branches").select("id,name,code,city,phone,status").eq("tenant_id", profile.tenant_id).eq("status", "active").order("name"),
      sb.from("members").select("id,full_name,member_code").eq("tenant_id", profile.tenant_id).order("full_name").limit(100),
    ]);
    branches = branchesResult.data ?? [];
    customizationMembers = customizationMembersResult.data ?? [];
    const customizationMemberId = customizationMembers[0]?.id ?? null;

    [resolvedSettings, tenantFeatures, templates, customFields, visiblePaymentModes, sampleValues] = await Promise.all([
      customizationEnabled ? getResolvedSettings(profile.tenant_id, profile.branch_id) : Promise.resolve({} as Record<ConfigKey, ResolvedSettingResult>),
      getTenantFeatures(profile.tenant_id),
      customizationEnabled ? listCommunicationTemplates(profile.tenant_id, profile.branch_id) : Promise.resolve([] as TemplateRow[]),
      customizationEnabled ? getCustomFields(profile.tenant_id) : Promise.resolve([] as CustomFieldRow[]),
      getPaymentMethods(profile.tenant_id, profile.branch_id),
      customizationEnabled && customizationMemberId ? getMemberCustomFieldValues(profile.tenant_id, customizationMemberId) : Promise.resolve([] as CustomFieldValueRow[]),
    ]);
  }

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

  const featureRows = FEATURE_KEYS.map((key) => {
    const row = tenantFeatures.find((item) => item.feature_key === key);
    return {
      key,
      enabled: row?.enabled ?? (key === "customization_engine_enabled" ? false : true),
      updatedAt: row?.updated_at ?? null,
      updatedBy: row?.users?.full_name ?? null,
    };
  });

  const resolved: ResolvedUiMap = Object.fromEntries(
    Object.entries(resolvedSettings).map(([key, value]) => {
      const item = value as ResolvedSettingResult<ConfigKey>;
      return [key, {
        value: item.value,
        source: item.source,
        updatedAt: item.branchRecord?.updated_at ?? item.tenantRecord?.updated_at ?? item.legacyRecord?.updated_at ?? null,
        updatedBy: null,
      }];
    }),
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage account, branch, and Finance configuration for the current branch.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <Link key={id} href={`/admin/settings?tab=${id}`} className={buttonVariants({ variant: activeTab === id ? "default" : "outline", size: "sm" })}>
            {label}
          </Link>
        ))}
      </div>

      {activeTab === "application" ? (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <SettingsBranchForms branch={branch} finance={finance} isAdmin={profile.role?.slug === "admin"} />
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Building2 className="size-5 text-muted-foreground" /><CardTitle>Active Branches</CardTitle></div>
              <p className="text-sm text-muted-foreground">Branch configuration affects Finance, GST, invoices, and data visibility across the app.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(branches ?? []).map((branchRow) => {
                const isCurrentBranch = branchRow.id === profile.branch_id;
                return (
                  <div key={branchRow.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{branchRow.name}</p>
                        <p className="text-xs text-muted-foreground">{branchRow.code}{branchRow.city ? ` | ${branchRow.city}` : ""}{branchRow.phone ? ` | ${branchRow.phone}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="success">{branchRow.status}</Badge>
                        {(profile.role?.slug === "owner" || profile.role?.slug === "admin") ? (
                          <form action={deleteBranchAction}>
                            <input type="hidden" name="branch_id" value={branchRow.id} />
                            <Button type="submit" variant="destructive" size="sm" disabled={isCurrentBranch} title={isCurrentBranch ? "Current branch cannot be deleted" : "Delete branch"}>
                              <Trash2 className="size-4" />
                              Delete
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!(branches ?? []).length ? <p className="text-sm text-muted-foreground">No active branches found.</p> : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "customization" && profile.tenant_id ? (
        <CustomizationSettingsPanel
          customizationEnabled={customizationEnabled}
          branches={(branches ?? []).map((item) => ({ id: item.id, name: item.name }))}
          paymentModes={visiblePaymentModes.map((item) => ({ code: item.code, name: item.name }))}
          resolved={resolved}
          features={featureRows}
          templates={templates.map((item) => ({ ...item, branches: Array.isArray(item.branches) ? item.branches[0] ?? null : null }))}
          customFields={[...customFields]}
          members={(customizationMembers ?? []).map((item) => ({ id: item.id, name: item.full_name, memberCode: item.member_code }))}
          customFieldValues={[...sampleValues]}
        />
      ) : null}

      {activeTab === "biometric" ? <BiometricSettingsCard devices={biometricDevices} mappings={memberMappings ?? []} mockEnabled={process.env.BIOMETRIC_MOCK_MODE === "true"} search={memberSearch} /> : null}
    </div>
  );
}
