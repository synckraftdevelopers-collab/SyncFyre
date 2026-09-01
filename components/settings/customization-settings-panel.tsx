
"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  deleteCommunicationTemplateAction,
  deleteMemberCustomFieldAction,
  deleteMemberCustomFieldValueAction,
  resetBranchSettingAction,
  resetNotificationPreferencesAction,
  resetTenantFeatureAction,
  resetTenantSettingAction,
  saveBrandingAction,
  saveCommunicationTemplateAction,
  saveMemberCustomFieldAction,
  saveMemberCustomFieldValueAction,
  saveNotificationPreferencesAction,
  savePaymentVisibilityAction,
  saveTenantFeatureAction,
  toggleCustomizationEngineAction,
  type CustomizationActionState,
} from "@/app/actions/customization-actions";
import { getAllowedTemplateVariables, getSupportedTemplateKeys } from "@/lib/config/template-variables";
import type { CommunicationChannel, ConfigKey, FeatureKey } from "@/lib/config/schema";

interface BranchOption {
  id: string;
  name: string;
}

interface PaymentModeOption {
  code: string;
  name: string;
}

interface MemberOption {
  id: string;
  name: string;
  memberCode: string | null;
}

interface TemplateItem {
  id: string;
  branch_id: string | null;
  template_key: string;
  channel: string;
  name: string;
  content: string;
  is_active: boolean;
  branches?: { name?: string | null } | null;
}

interface CustomFieldItem {
  id: string;
  field_name: string;
  field_key: string;
  field_type: string;
  is_required: boolean;
  is_active: boolean;
  updated_at?: string | null;
  users?: { full_name?: string | null } | null;
}

interface CustomFieldValueItem {
  id?: string;
  value: unknown;
  member_custom_fields?: Array<{ field_name?: string | null; field_key?: string | null }> | null;
}

interface ResolvedItem {
  value: unknown;
  source: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export function CustomizationSettingsPanel({
  customizationEnabled,
  branches,
  paymentModes,
  resolved,
  features,
  templates,
  customFields,
  members,
  customFieldValues,
}: {
  customizationEnabled: boolean;
  branches: BranchOption[];
  paymentModes: PaymentModeOption[];
  resolved: Record<string, ResolvedItem>;
  features: Array<{ key: string; enabled: boolean; updatedAt?: string | null; updatedBy?: string | null }>;
  templates: TemplateItem[];
  customFields: CustomFieldItem[];
  members: MemberOption[];
  customFieldValues: CustomFieldValueItem[];
}) {
  const [gateState, gateAction, gatePending] = useActionState<CustomizationActionState, FormData>(toggleCustomizationEngineAction, {});
  const [brandingState, brandingAction, brandingPending] = useActionState<CustomizationActionState, FormData>(saveBrandingAction, {});
  const [resetBrandingState, resetBrandingAction] = useActionState<CustomizationActionState, FormData>(resetTenantSettingAction, {});
  const [paymentState, paymentAction, paymentPending] = useActionState<CustomizationActionState, FormData>(savePaymentVisibilityAction, {});
  const [notificationState, notificationAction, notificationPending] = useActionState<CustomizationActionState, FormData>(saveNotificationPreferencesAction, {});
  const [notificationResetState, notificationResetAction] = useActionState<CustomizationActionState, FormData>(resetNotificationPreferencesAction, {});
  const [featureState, featureAction] = useActionState<CustomizationActionState, FormData>(saveTenantFeatureAction, {});
  const [featureResetState, featureResetAction] = useActionState<CustomizationActionState, FormData>(resetTenantFeatureAction, {});
  const [templateState, templateAction, templatePending] = useActionState<CustomizationActionState, FormData>(saveCommunicationTemplateAction, {});
  const [templateDeleteState, templateDeleteAction] = useActionState<CustomizationActionState, FormData>(deleteCommunicationTemplateAction, {});
  const [fieldState, fieldAction, fieldPending] = useActionState<CustomizationActionState, FormData>(saveMemberCustomFieldAction, {});
  const [fieldDeleteState, fieldDeleteAction] = useActionState<CustomizationActionState, FormData>(deleteMemberCustomFieldAction, {});
  const [valueState, valueAction, valuePending] = useActionState<CustomizationActionState, FormData>(saveMemberCustomFieldValueAction, {});
  const [valueDeleteState, valueDeleteAction] = useActionState<CustomizationActionState, FormData>(deleteMemberCustomFieldValueAction, {});
  const [resetState, resetAction] = useActionState<CustomizationActionState, FormData>(resetBranchSettingAction, {});

  const engineFeature = features.find((feature) => feature.key === "customization_engine_enabled");
  const manageableFeatures = features.filter((feature) => feature.key !== "customization_engine_enabled");

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Customization Engine Rollout</CardTitle>
          <p className="text-sm text-muted-foreground">
            This gate controls the new customization engine only. Existing SyncFyre modules continue using their current behavior when the engine is off.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
            <div>
              <p className="font-medium">customization_engine_enabled</p>
              <p className="text-xs text-muted-foreground">Current status: {engineFeature?.enabled ? "Enabled" : "Disabled"}</p>
            </div>
            <form action={gateAction}>
              <input type="hidden" name="enabled" value={engineFeature?.enabled ? "false" : "true"} />
              <Button type="submit" variant={engineFeature?.enabled ? "outline" : "default"} disabled={gatePending}>
                {gatePending ? "Saving..." : engineFeature?.enabled ? "Disable" : "Enable"}
              </Button>
            </form>
          </div>
          <Message state={gateState} />
        </CardContent>
      </Card>

      {!customizationEnabled ? (
        <Card>
          <CardHeader>
            <CardTitle>Customization Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The customization engine is disabled for this tenant. Existing SyncFyre behavior remains active. Enable the rollout flag above to use these controls.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <p className="text-sm text-muted-foreground">
                Tenant-level branding only. Resetting a setting falls back to the existing tenant profile or SyncFyre defaults.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ConfigMeta item={resolved["branding.primary_color"]} label="Current branding source" />
              <form action={brandingAction} className="grid gap-4 md:grid-cols-2">
                <Field name="logo_url" label="Logo URL" defaultValue={stringValue(resolved["branding.logo_url"]?.value)} />
                <Field name="favicon_url" label="Favicon URL" defaultValue={stringValue(resolved["branding.favicon_url"]?.value)} />
                <Field name="primary_color" label="Primary color" defaultValue={stringValue(resolved["branding.primary_color"]?.value) || "#ff3024"} type="color" />
                <Field name="secondary_color" label="Secondary color" defaultValue={stringValue(resolved["branding.secondary_color"]?.value) || "#071d38"} type="color" />
                <Field name="accent_color" label="Accent color" defaultValue={stringValue(resolved["branding.accent_color"]?.value) || "#52c7ea"} type="color" />
                <label className="space-y-1 text-sm font-medium">
                  <span>Theme</span>
                  <Select name="theme" defaultValue={stringValue(resolved["branding.theme"]?.value) || "light"}>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </Select>
                </label>
                <Field name="login_title" label="Login branding title" defaultValue={stringValue(resolved["branding.login_title"]?.value)} />
                <Field name="member_portal_title" label="Member portal title" defaultValue={stringValue(resolved["branding.member_portal_title"]?.value)} />
                <Message state={brandingState} className="md:col-span-2" />
                <div className="md:col-span-2 flex flex-wrap gap-2">
                  <Button type="submit" disabled={brandingPending}>{brandingPending ? "Saving..." : "Save branding"}</Button>
                </div>
              </form>
              <div className="flex flex-wrap gap-2">
                {(["branding.logo_url","branding.favicon_url","branding.primary_color","branding.secondary_color","branding.accent_color","branding.theme","branding.login_title","branding.member_portal_title"] as ConfigKey[]).map((key) => (
                  <form key={key} action={resetBrandingAction}>
                    <input type="hidden" name="setting_key" value={key} />
                    <Button type="submit" variant="ghost" size="sm">Reset {key.split(".").at(-1)}</Button>
                  </form>
                ))}
              </div>
              <Message state={resetBrandingState} />
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Payment Mode Visibility</CardTitle>
                <p className="text-sm text-muted-foreground">This controls which existing payment modes are shown. It does not change payment arithmetic.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ConfigMeta item={resolved["payments.visible_modes"]} label="Gym-level resolved value" />
                <form action={paymentAction} className="space-y-4">
                  <fieldset className="grid gap-2 sm:grid-cols-2">
                    {paymentModes.map((mode) => (
                      <label key={mode.code} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                        <input type="checkbox" name="visible_modes" value={mode.code} defaultChecked={selectedArray(resolved["payments.visible_modes"]?.value).includes(mode.code)} />
                        {mode.name}
                      </label>
                    ))}
                  </fieldset>
                  <Message state={paymentState} />
                  <Button type="submit" disabled={paymentPending}>{paymentPending ? "Saving..." : "Save gym visibility"}</Button>
                </form>
                <div className="rounded-xl border border-dashed p-4">
                  <p className="text-sm font-medium">Branch override</p>
                  <p className="text-xs text-muted-foreground">Save only if this branch should differ from the gym default.</p>
                  <form action={paymentAction} className="mt-3 space-y-3">
                    <label className="space-y-1 text-sm font-medium">
                      <span>Branch</span>
                      <Select name="branch_id" defaultValue="">
                        <option value="">Select branch</option>
                        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                      </Select>
                    </label>
                    <fieldset className="grid gap-2 sm:grid-cols-2">
                      {paymentModes.map((mode) => (
                        <label key={`branch-${mode.code}`} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                          <input type="checkbox" name="visible_modes" value={mode.code} />
                          {mode.name}
                        </label>
                      ))}
                    </fieldset>
                    <Button type="submit" variant="outline">Save branch override</Button>
                  </form>
                  <form action={resetAction} className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="setting_key" value="payments.visible_modes" />
                    <label className="space-y-1 text-sm font-medium">
                      <span>Reset branch override</span>
                      <Select name="branch_id" defaultValue="">
                        <option value="">Select branch</option>
                        {branches.map((branch) => <option key={`reset-${branch.id}`} value={branch.id}>{branch.name}</option>)}
                      </Select>
                    </label>
                    <Button type="submit" variant="ghost">Reset to gym default</Button>
                  </form>
                  <Message state={resetState} className="mt-3" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Management</CardTitle>
                <p className="text-sm text-muted-foreground">Feature flags answer whether a tenant has access to a capability. They do not replace user permissions.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {manageableFeatures.map((feature) => (
                  <div key={feature.key} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{feature.key}</p>
                        <p className="text-xs text-muted-foreground">{feature.updatedAt ? `Updated ${feature.updatedAt.slice(0, 10)}${feature.updatedBy ? ` by ${feature.updatedBy}` : ""}` : "Using system behavior"}</p>
                      </div>
                      <Badge variant={feature.enabled ? "success" : "outline"}>{feature.enabled ? "Enabled" : "Default"}</Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <form action={featureAction}>
                        <input type="hidden" name="feature_key" value={feature.key as FeatureKey} />
                        <input type="hidden" name="enabled" value={feature.enabled ? "false" : "true"} />
                        <Button type="submit" variant="outline" size="sm">{feature.enabled ? "Disable" : "Enable"}</Button>
                      </form>
                      <form action={featureResetAction}>
                        <input type="hidden" name="feature_key" value={feature.key as FeatureKey} />
                        <Button type="submit" variant="ghost" size="sm">Reset</Button>
                      </form>
                    </div>
                  </div>
                ))}
                <Message state={featureState} />
                <Message state={featureResetState} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <p className="text-sm text-muted-foreground">If not configured, current notification behavior stays unchanged.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={notificationAction} className="space-y-5">
                {notificationRows.map((row) => (
                  <div key={row.base} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{row.label}</p>
                        <p className="text-xs text-muted-foreground">Current source: {resolved[row.enabledKey]?.source ?? "default"}</p>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name={`${row.base}_enabled`} defaultChecked={Boolean(resolved[row.enabledKey]?.value)} />
                        Enabled
                      </label>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {channelOptions.map((channel) => (
                        <label key={`${row.base}-${channel}`} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                          <input type="checkbox" name={`${row.base}_channels`} value={channel} defaultChecked={selectedArray(resolved[row.channelsKey]?.value).includes(channel)} />
                          {channel.toUpperCase()}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <Message state={notificationState} />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={notificationPending}>{notificationPending ? "Saving..." : "Save gym notifications"}</Button>
                  <Button formAction={notificationResetAction} type="submit" variant="ghost">Reset notification overrides</Button>
                </div>
              </form>
              <Message state={notificationResetState} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Member Custom Field Values</CardTitle>
              <p className="text-sm text-muted-foreground">This writes only to the customization value table and validates member-field ownership inside the current tenant.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={valueAction} className="grid gap-4 lg:grid-cols-3">
                <label className="space-y-1 text-sm font-medium">
                  <span>Member</span>
                  <Select name="member_id" defaultValue="">
                    <option value="">Select member</option>
                    {members.map((member) => <option key={member.id} value={member.id}>{member.name}{member.memberCode ? ` · ${member.memberCode}` : ""}</option>)}
                  </Select>
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span>Custom field</span>
                  <Select name="field_id" defaultValue="">
                    <option value="">Select field</option>
                    {customFields.map((field) => <option key={field.id} value={field.id}>{field.field_name}</option>)}
                  </Select>
                </label>
                <label className="space-y-1 text-sm font-medium lg:col-span-3">
                  <span>Value</span>
                  <textarea name="value" defaultValue='""' className="min-h-24 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
                </label>
                <Message state={valueState} className="lg:col-span-3" />
                <div className="lg:col-span-3 flex flex-wrap gap-2">
                  <Button type="submit" disabled={valuePending}>{valuePending ? "Saving..." : "Save value"}</Button>
                </div>
              </form>
              <form action={valueDeleteAction} className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed p-4">
                <label className="space-y-1 text-sm font-medium">
                  <span>Member</span>
                  <Select name="member_id" defaultValue="">
                    <option value="">Select member</option>
                    {members.map((member) => <option key={`delete-${member.id}`} value={member.id}>{member.name}</option>)}
                  </Select>
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span>Custom field</span>
                  <Select name="field_id" defaultValue="">
                    <option value="">Select field</option>
                    {customFields.map((field) => <option key={`delete-${field.id}`} value={field.id}>{field.field_name}</option>)}
                  </Select>
                </label>
                <Button type="submit" variant="ghost">Delete value</Button>
              </form>
              <Message state={valueDeleteState} />
              <div className="space-y-3">
                {customFieldValues.map((value, index) => (
                  <div key={value.id ?? index} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{value.member_custom_fields?.[0]?.field_name ?? "Custom field"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Field key: {value.member_custom_fields?.[0]?.field_key ?? "-"}</p>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(value.value, null, 2)}</pre>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

const channelOptions: CommunicationChannel[] = ["whatsapp", "sms", "email"];
const notificationRows: Array<{ base: string; label: string; enabledKey: ConfigKey; channelsKey: ConfigKey }> = [
  { base: "membership_expiry", label: "Membership expiry", enabledKey: "notifications.membership_expiry.enabled", channelsKey: "notifications.membership_expiry.channels" },
  { base: "payment_pending", label: "Pending payment", enabledKey: "notifications.payment_pending.enabled", channelsKey: "notifications.payment_pending.channels" },
  { base: "payment_received", label: "Payment received", enabledKey: "notifications.payment_received.enabled", channelsKey: "notifications.payment_received.channels" },
  { base: "daily_closing", label: "Daily closing", enabledKey: "notifications.daily_closing.enabled", channelsKey: "notifications.daily_closing.channels" },
];

function stringValue(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function selectedArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function Field({ name, label, defaultValue, placeholder, type = "text" }: { name: string; label: string; defaultValue?: string; placeholder?: string; type?: string }) {
  return (
    <label className="space-y-1 text-sm font-medium">
      <span>{label}</span>
      <Input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} />
    </label>
  );
}

function Message({ state, className }: { state: CustomizationActionState; className?: string }) {
  if (state.error) return <p className={`rounded-lg bg-red-50 p-3 text-sm text-red-600 ${className ?? ""}`}>{state.error}</p>;
  if (state.success) return <p className={`rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ${className ?? ""}`}>{state.success}</p>;
  return null;
}

function ConfigMeta({ item, label }: { item?: ResolvedItem; label: string }) {
  if (!item) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>{label}:</span>
      <Badge variant={item.source === "branch" || item.source === "tenant" ? "success" : "outline"}>{item.source}</Badge>
      {item.updatedAt ? <span>Updated {item.updatedAt.slice(0, 10)}</span> : null}
      {item.updatedBy ? <span>by {item.updatedBy}</span> : null}
    </div>
  );
}
