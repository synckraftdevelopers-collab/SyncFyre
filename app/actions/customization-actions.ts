"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  CONFIG_DEFINITIONS,
  FEATURE_KEYS,
  MEMBER_CUSTOM_FIELD_TYPES,
  type CommunicationChannel,
  type ConfigKey,
  type FeatureKey,
} from "@/lib/config/schema";
import { getAllowedTemplateVariables, getSupportedTemplateKeys, validateTemplateVariables } from "@/lib/config/template-variables";
import { isFeatureEnabled } from "@/services/config.service";
import { logActivity } from "@/services/workflow.service";
import { createClient } from "@/lib/supabase/server";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];
type Profile = Awaited<ReturnType<typeof requireUser>>;

export type CustomizationActionState = { error?: string; success?: string };

function parseBoolean(value: FormDataEntryValue | null) {
  return value === "true" || value === "on" || value === "1";
}

function parseJson(text: string) {
  if (!text.trim()) return null;
  return JSON.parse(text) as Json;
}

function toAuditJson(value: unknown): Json {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => toAuditJson(item));
  if (typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, toAuditJson(entry)]));
  return String(value);
}

async function requireCustomizationProfile() {
  const profile = await requireUser(["owner", "admin", "manager"]);
  if (!profile.tenant_id) throw new Error("Your account is not linked to a tenant.");
  return profile;
}

async function ensureCustomizationEnabled(profile: Profile) {
  if (!profile.tenant_id) throw new Error("Your account is not linked to a tenant.");
  const enabled = await isFeatureEnabled(profile.tenant_id, "customization_engine_enabled");
  if (!enabled) throw new Error("Customization engine is disabled for this tenant.");
}

async function verifyBranchOwnership(supabase: Awaited<ReturnType<typeof createClient>>, tenantId: string, branchId: string) {
  const { data, error } = await supabase.from("branches").select("id,tenant_id").eq("id", branchId).eq("tenant_id", tenantId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Branch not found for tenant.");
  return data;
}

async function verifyMemberOwnership(supabase: Awaited<ReturnType<typeof createClient>>, tenantId: string, memberId: string) {
  const { data, error } = await supabase.from("members").select("id,tenant_id,full_name").eq("id", memberId).eq("tenant_id", tenantId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Member not found for tenant.");
  return data;
}

async function verifyFieldOwnership(supabase: Awaited<ReturnType<typeof createClient>>, tenantId: string, fieldId: string) {
  const { data, error } = await supabase.from("member_custom_fields").select("id,tenant_id,field_key,field_name").eq("id", fieldId).eq("tenant_id", tenantId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Custom field not found for tenant.");
  return data;
}

async function logCustomizationActivity(input: {
  profile: Profile;
  branchId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}) {
  await logActivity({
    performedBy: input.profile.id,
    branchId: input.branchId ?? input.profile.branch_id,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    description: input.description,
    metadata: {
      tenant_id: input.profile.tenant_id,
      old_value: toAuditJson(input.oldValue ?? null),
      new_value: toAuditJson(input.newValue ?? null),
      ...(input.metadata ? Object.fromEntries(Object.entries(input.metadata).map(([key, value]) => [key, toAuditJson(value)])) : {}),
    },
  });
}

async function upsertTenantSetting(profile: Profile, key: ConfigKey, value: Json) {
  await ensureCustomizationEnabled(profile);
  const supabase = await createClient();
  const definition = CONFIG_DEFINITIONS[key];
  const { data: previous, error: previousError } = await supabase.from("tenant_settings").select("id,setting_value").eq("tenant_id", profile.tenant_id ?? "").eq("setting_key", key).maybeSingle();
  if (previousError) throw new Error(previousError.message);
  const payload = { tenant_id: profile.tenant_id, setting_key: key, setting_value: value, data_type: definition.dataType, scope: definition.scope, is_overridable: definition.overridable, created_by: previous?.id ? undefined : profile.id, updated_by: profile.id };
  const { error } = await supabase.from("tenant_settings").upsert(payload, { onConflict: "tenant_id,setting_key" });
  if (error) throw new Error(error.message);
  await logCustomizationActivity({ profile, action: previous?.id ? "tenant_setting_updated" : "tenant_setting_created", entityType: "tenant_setting", entityId: `${profile.tenant_id}:${key}`, description: `${previous?.id ? "Updated" : "Created"} tenant setting: ${key}`, oldValue: previous?.setting_value ?? null, newValue: value, metadata: { setting_key: key } });
}

async function deleteTenantSetting(profile: Profile, key: ConfigKey) {
  await ensureCustomizationEnabled(profile);
  const supabase = await createClient();
  const { data: previous, error: previousError } = await supabase.from("tenant_settings").select("id,setting_value").eq("tenant_id", profile.tenant_id ?? "").eq("setting_key", key).maybeSingle();
  if (previousError) throw new Error(previousError.message);
  if (!previous) return false;
  const { error } = await supabase.from("tenant_settings").delete().eq("tenant_id", profile.tenant_id).eq("setting_key", key);
  if (error) throw new Error(error.message);
  await logCustomizationActivity({ profile, action: "tenant_setting_reset", entityType: "tenant_setting", entityId: `${profile.tenant_id}:${key}`, description: `Reset tenant setting: ${key}`, oldValue: previous.setting_value, newValue: null, metadata: { setting_key: key } });
  return true;
}

async function upsertBranchSetting(profile: Profile, branchId: string, key: ConfigKey, value: Json) {
  await ensureCustomizationEnabled(profile);
  const supabase = await createClient();
  const definition = CONFIG_DEFINITIONS[key];
  if (definition.scope !== "tenant_branch" || !definition.overridable) throw new Error("This setting does not support branch overrides.");
  await verifyBranchOwnership(supabase, profile.tenant_id ?? "", branchId);
  const { data: previous, error: previousError } = await supabase.from("branch_settings").select("id,setting_value").eq("tenant_id", profile.tenant_id ?? "").eq("branch_id", branchId).eq("setting_key", key).maybeSingle();
  if (previousError) throw new Error(previousError.message);
  const { error } = await supabase.from("branch_settings").upsert({ tenant_id: profile.tenant_id, branch_id: branchId, setting_key: key, setting_value: value, data_type: definition.dataType, created_by: previous?.id ? undefined : profile.id, updated_by: profile.id }, { onConflict: "tenant_id,branch_id,setting_key" });
  if (error) throw new Error(error.message);
  await logCustomizationActivity({ profile, branchId, action: previous?.id ? "branch_setting_updated" : "branch_setting_created", entityType: "branch_setting", entityId: `${branchId}:${key}`, description: `${previous?.id ? "Updated" : "Created"} branch setting: ${key}`, oldValue: previous?.setting_value ?? null, newValue: value, metadata: { setting_key: key } });
}

async function deleteBranchSetting(profile: Profile, branchId: string, key: ConfigKey) {
  await ensureCustomizationEnabled(profile);
  const supabase = await createClient();
  await verifyBranchOwnership(supabase, profile.tenant_id ?? "", branchId);
  const { data: previous, error: previousError } = await supabase.from("branch_settings").select("id,setting_value").eq("tenant_id", profile.tenant_id).eq("branch_id", branchId).eq("setting_key", key).maybeSingle();
  if (previousError) throw new Error(previousError.message);
  if (!previous) return false;
  const { error } = await supabase.from("branch_settings").delete().eq("tenant_id", profile.tenant_id).eq("branch_id", branchId).eq("setting_key", key);
  if (error) throw new Error(error.message);
  await logCustomizationActivity({ profile, branchId, action: "branch_setting_reset", entityType: "branch_setting", entityId: `${branchId}:${key}`, description: `Reset branch setting: ${key}`, oldValue: previous.setting_value, newValue: null, metadata: { setting_key: key } });
  return true;
}
export async function saveBrandingAction(_: CustomizationActionState, formData: FormData): Promise<CustomizationActionState> {
  try {
    const profile = await requireCustomizationProfile();
    await upsertTenantSetting(profile, "branding.logo_url", String(formData.get("logo_url") ?? "").trim() || null);
    await upsertTenantSetting(profile, "branding.favicon_url", String(formData.get("favicon_url") ?? "").trim() || null);
    await upsertTenantSetting(profile, "branding.primary_color", String(formData.get("primary_color") ?? "#ff3024"));
    await upsertTenantSetting(profile, "branding.secondary_color", String(formData.get("secondary_color") ?? "#071d38"));
    await upsertTenantSetting(profile, "branding.accent_color", String(formData.get("accent_color") ?? "#52c7ea"));
    await upsertTenantSetting(profile, "branding.theme", String(formData.get("theme") ?? "light"));
    await upsertTenantSetting(profile, "branding.login_title", String(formData.get("login_title") ?? "").trim() || null);
    await upsertTenantSetting(profile, "branding.member_portal_title", String(formData.get("member_portal_title") ?? "").trim() || null);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save branding." };
  }
  revalidatePath("/admin/settings");
  return { success: "Branding settings saved." };
}

export async function resetTenantSettingAction(_: CustomizationActionState, formData: FormData): Promise<CustomizationActionState> {
  try {
    const profile = await requireCustomizationProfile();
    const key = String(formData.get("setting_key") ?? "") as ConfigKey;
    if (!(key in CONFIG_DEFINITIONS)) return { error: "Invalid setting key." };
    const deleted = await deleteTenantSetting(profile, key);
    revalidatePath("/admin/settings");
    return { success: deleted ? "Gym setting reset. Existing behavior will be used." : "No gym override existed for that setting." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to reset gym setting." };
  }
}

export async function savePaymentVisibilityAction(_: CustomizationActionState, formData: FormData): Promise<CustomizationActionState> {
  try {
    const profile = await requireCustomizationProfile();
    const branchId = String(formData.get("branch_id") ?? "").trim();
    const modes = formData.getAll("visible_modes").map(String) as Json;
    if (branchId) await upsertBranchSetting(profile, branchId, "payments.visible_modes", modes);
    else await upsertTenantSetting(profile, "payments.visible_modes", modes);
    revalidatePath("/admin/settings");
    return { success: branchId ? "Branch payment override saved." : "Gym payment visibility saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save payment visibility." };
  }
}

export async function resetBranchSettingAction(_: CustomizationActionState, formData: FormData): Promise<CustomizationActionState> {
  try {
    const profile = await requireCustomizationProfile();
    const branchId = String(formData.get("branch_id") ?? "");
    const key = String(formData.get("setting_key") ?? "") as ConfigKey;
    if (!branchId || !(key in CONFIG_DEFINITIONS)) return { error: "Invalid branch reset request." };
    const deleted = await deleteBranchSetting(profile, branchId, key);
    revalidatePath("/admin/settings");
    return { success: deleted ? "Branch override removed. Gym default will be used." : "No branch override existed for that setting." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to reset branch setting." };
  }
}

export async function saveNotificationPreferencesAction(_: CustomizationActionState, formData: FormData): Promise<CustomizationActionState> {
  try {
    const profile = await requireCustomizationProfile();
    const branchId = String(formData.get("branch_id") ?? "").trim() || null;
    const targets = ["membership_expiry", "payment_pending", "payment_received", "daily_closing"] as const;
    for (const target of targets) {
      const enabledKey = `notifications.${target}.enabled` as ConfigKey;
      const channelsKey = `notifications.${target}.channels` as ConfigKey;
      const enabled = parseBoolean(formData.get(`${target}_enabled`));
      const channels = formData.getAll(`${target}_channels`).map(String) as Json;
      if (branchId) {
        await upsertBranchSetting(profile, branchId, enabledKey, enabled);
        await upsertBranchSetting(profile, branchId, channelsKey, channels);
      } else {
        await upsertTenantSetting(profile, enabledKey, enabled);
        await upsertTenantSetting(profile, channelsKey, channels);
      }
    }
    revalidatePath("/admin/settings");
    return { success: branchId ? "Branch notification overrides saved." : "Gym notification preferences saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save notification preferences." };
  }
}

export async function resetNotificationPreferencesAction(_: CustomizationActionState, formData: FormData): Promise<CustomizationActionState> {
  try {
    const profile = await requireCustomizationProfile();
    const branchId = String(formData.get("branch_id") ?? "").trim() || null;
    const targets = ["membership_expiry", "payment_pending", "payment_received", "daily_closing"] as const;
    for (const target of targets) {
      const enabledKey = `notifications.${target}.enabled` as ConfigKey;
      const channelsKey = `notifications.${target}.channels` as ConfigKey;
      if (branchId) {
        await deleteBranchSetting(profile, branchId, enabledKey);
        await deleteBranchSetting(profile, branchId, channelsKey);
      } else {
        await deleteTenantSetting(profile, enabledKey);
        await deleteTenantSetting(profile, channelsKey);
      }
    }
    revalidatePath("/admin/settings");
    return { success: branchId ? "Branch notification overrides reset." : "Gym notification preferences reset." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to reset notification preferences." };
  }
}

export async function saveTenantFeatureAction(_: CustomizationActionState, formData: FormData): Promise<CustomizationActionState> {
  try {
    const profile = await requireCustomizationProfile();
    await ensureCustomizationEnabled(profile);
    const featureKey = String(formData.get("feature_key") ?? "") as FeatureKey;
    if (!FEATURE_KEYS.includes(featureKey)) return { error: "Unknown feature." };
    const enabled = parseBoolean(formData.get("enabled"));
    const supabase = await createClient();
    const { data: previous, error: previousError } = await supabase.from("tenant_features").select("enabled").eq("tenant_id", profile.tenant_id).eq("feature_key", featureKey).maybeSingle();
    if (previousError) throw new Error(previousError.message);
    const { error } = await supabase.from("tenant_features").upsert({ tenant_id: profile.tenant_id, feature_key: featureKey, enabled, created_by: previous ? undefined : profile.id, updated_by: profile.id }, { onConflict: "tenant_id,feature_key" });
    if (error) throw new Error(error.message);
    await logCustomizationActivity({ profile, action: previous ? "tenant_feature_updated" : "tenant_feature_created", entityType: "tenant_feature", entityId: `${profile.tenant_id}:${featureKey}`, description: `${previous ? "Updated" : "Created"} tenant feature: ${featureKey}`, oldValue: previous?.enabled ?? null, newValue: enabled, metadata: { feature_key: featureKey } });
    revalidatePath("/admin/settings");
    return { success: "Feature flag saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save feature flag." };
  }
}

export async function toggleCustomizationEngineAction(_: CustomizationActionState, formData: FormData): Promise<CustomizationActionState> {
  const profile = await requireUser(["owner", "admin", "manager"]);
  if (!profile.tenant_id) return { error: "Your account is not linked to a tenant." };
  const enabled = parseBoolean(formData.get("enabled"));
  try {
    const supabase = await createClient();
    const { data: previous, error: previousError } = await supabase.from("tenant_features").select("enabled").eq("tenant_id", profile.tenant_id).eq("feature_key", "customization_engine_enabled").maybeSingle();
    if (previousError) throw new Error(previousError.message);
    const { error } = await supabase.from("tenant_features").upsert({ tenant_id: profile.tenant_id, feature_key: "customization_engine_enabled", enabled, created_by: previous ? undefined : profile.id, updated_by: profile.id }, { onConflict: "tenant_id,feature_key" });
    if (error) throw new Error(error.message);
    await logCustomizationActivity({ profile, action: previous ? "tenant_feature_updated" : "tenant_feature_created", entityType: "tenant_feature", entityId: `${profile.tenant_id}:customization_engine_enabled`, description: `${previous ? "Updated" : "Created"} tenant feature: customization_engine_enabled`, oldValue: previous?.enabled ?? null, newValue: enabled, metadata: { feature_key: "customization_engine_enabled" } });
    revalidatePath("/admin/settings");
    return { success: enabled ? "Customization engine enabled for this tenant." : "Customization engine disabled for this tenant." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update customization engine feature flag." };
  }
}

export async function resetTenantFeatureAction(_: CustomizationActionState, formData: FormData): Promise<CustomizationActionState> {
  try {
    const profile = await requireCustomizationProfile();
    await ensureCustomizationEnabled(profile);
    const featureKey = String(formData.get("feature_key") ?? "") as FeatureKey;
    if (!FEATURE_KEYS.includes(featureKey) || featureKey === "customization_engine_enabled") return { error: "Invalid feature reset request." };
    const supabase = await createClient();
    const { data: previous, error: previousError } = await supabase.from("tenant_features").select("enabled").eq("tenant_id", profile.tenant_id).eq("feature_key", featureKey).maybeSingle();
    if (previousError) throw new Error(previousError.message);
    if (!previous) return { success: "No feature override existed for that feature." };
    const { error } = await supabase.from("tenant_features").delete().eq("tenant_id", profile.tenant_id).eq("feature_key", featureKey);
    if (error) throw new Error(error.message);
    await logCustomizationActivity({ profile, action: "tenant_feature_reset", entityType: "tenant_feature", entityId: `${profile.tenant_id}:${featureKey}`, description: `Reset tenant feature: ${featureKey}`, oldValue: previous.enabled, newValue: null, metadata: { feature_key: featureKey } });
    revalidatePath("/admin/settings");
    return { success: "Feature override removed. System behavior will be used." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to reset feature flag." };
  }
}
export async function saveCommunicationTemplateAction(_: CustomizationActionState, formData: FormData): Promise<CustomizationActionState> {
  try {
    const profile = await requireCustomizationProfile();
    await ensureCustomizationEnabled(profile);
    const branchId = String(formData.get("branch_id") ?? "").trim() || null;
    const templateKey = String(formData.get("template_key") ?? "").trim();
    const channel = String(formData.get("channel") ?? "") as CommunicationChannel;
    const name = String(formData.get("name") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const variablesInput = String(formData.get("variables") ?? "[]").trim();
    if (!templateKey || !channel || !name || !content) return { error: "Template key, channel, name, and content are required." };
    if (!getSupportedTemplateKeys().includes(templateKey as never)) return { error: "Unknown template key." };
    let variables: string[] = [];
    try {
      const parsed = parseJson(variablesInput);
      variables = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return { error: "Variables must be a valid JSON array." };
    }
    const variableValidation = validateTemplateVariables({ templateKey, declaredVariables: variables, content });
    if (!variableValidation.valid) return { error: variableValidation.error };
    const supabase = await createClient();
    if (branchId) await verifyBranchOwnership(supabase, profile.tenant_id ?? "", branchId);
    let previousQuery = supabase.from("communication_templates").select("id,name,content,variables").eq("tenant_id", profile.tenant_id).eq("template_key", templateKey).eq("channel", channel);
    previousQuery = branchId ? previousQuery.eq("branch_id", branchId) : previousQuery.is("branch_id", null);
    const { data: previous, error: previousError } = await previousQuery.maybeSingle();
    if (previousError) throw new Error(previousError.message);
    const payload: Record<string, unknown> = { tenant_id: profile.tenant_id, branch_id: branchId, template_key: templateKey, channel, name, content, variables: variableValidation.variables, is_active: true, updated_by: profile.id };
    if (!previous?.id) payload.created_by = profile.id;
    const { error } = await supabase.from("communication_templates").upsert(payload, { onConflict: "tenant_id,branch_id,template_key,channel" });
    if (error) throw new Error(error.message);
    await logCustomizationActivity({ profile, branchId, action: previous?.id ? "communication_template_updated" : "communication_template_created", entityType: "communication_template", entityId: `${profile.tenant_id}:${branchId ?? "tenant"}:${templateKey}:${channel}`, description: `${previous?.id ? "Updated" : "Created"} communication template: ${templateKey}`, oldValue: previous ? { name: previous.name, content: previous.content, variables: previous.variables } : null, newValue: { name, content, variables: variableValidation.variables }, metadata: { template_key: templateKey, channel, allowed_variables: getAllowedTemplateVariables(templateKey) } });
    revalidatePath("/admin/settings");
    return { success: "Communication template saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save template." };
  }
}

export async function deleteCommunicationTemplateAction(_: CustomizationActionState, formData: FormData): Promise<CustomizationActionState> {
  try {
    const profile = await requireCustomizationProfile();
    await ensureCustomizationEnabled(profile);
    const id = String(formData.get("template_id") ?? "").trim();
    if (!id) return { error: "Template id is required." };
    const supabase = await createClient();
    const { data: previous, error: previousError } = await supabase.from("communication_templates").select("id,branch_id,template_key,channel,name,content,variables").eq("tenant_id", profile.tenant_id).eq("id", id).maybeSingle();
    if (previousError) throw new Error(previousError.message);
    if (!previous) return { error: "Template not found for tenant." };
    if (previous.branch_id) await verifyBranchOwnership(supabase, profile.tenant_id ?? "", previous.branch_id);
    const { error } = await supabase.from("communication_templates").delete().eq("tenant_id", profile.tenant_id).eq("id", id);
    if (error) throw new Error(error.message);
    await logCustomizationActivity({ profile, branchId: previous.branch_id, action: "communication_template_deleted", entityType: "communication_template", entityId: previous.id, description: `Deleted communication template: ${previous.template_key}`, oldValue: previous, newValue: null, metadata: { template_key: previous.template_key, channel: previous.channel } });
    revalidatePath("/admin/settings");
    return { success: "Communication template deleted." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to delete template." };
  }
}

export async function saveMemberCustomFieldAction(_: CustomizationActionState, formData: FormData): Promise<CustomizationActionState> {
  try {
    const profile = await requireCustomizationProfile();
    await ensureCustomizationEnabled(profile);
    const fieldKey = String(formData.get("field_key") ?? "").trim().toLowerCase();
    const fieldName = String(formData.get("field_name") ?? "").trim();
    const fieldType = String(formData.get("field_type") ?? "");
    const optionsText = String(formData.get("options") ?? "[]").trim();
    const displayOrder = Number(formData.get("display_order") ?? 0);
    const isRequired = parseBoolean(formData.get("is_required"));
    if (!fieldKey || !fieldName || !MEMBER_CUSTOM_FIELD_TYPES.includes(fieldType as never)) return { error: "Field key, name, and type are required." };
    let options: Json = [];
    try {
      options = parseJson(optionsText) ?? [];
    } catch {
      return { error: "Options must be valid JSON." };
    }
    const supabase = await createClient();
    const { data: previous, error: previousError } = await supabase.from("member_custom_fields").select("id,field_name,field_type,options,is_required,display_order").eq("tenant_id", profile.tenant_id).eq("field_key", fieldKey).maybeSingle();
    if (previousError) throw new Error(previousError.message);
    const payload: Record<string, unknown> = { tenant_id: profile.tenant_id, field_key: fieldKey, field_name: fieldName, field_type: fieldType, options, is_required: isRequired, is_active: true, display_order: Number.isFinite(displayOrder) ? displayOrder : 0, updated_by: profile.id };
    if (!previous?.id) payload.created_by = profile.id;
    const { error } = await supabase.from("member_custom_fields").upsert(payload, { onConflict: "tenant_id,field_key" });
    if (error) throw new Error(error.message);
    await logCustomizationActivity({ profile, action: previous?.id ? "member_custom_field_updated" : "member_custom_field_created", entityType: "member_custom_field", entityId: `${profile.tenant_id}:${fieldKey}`, description: `${previous?.id ? "Updated" : "Created"} member custom field: ${fieldName}`, oldValue: previous ?? null, newValue: { field_name: fieldName, field_type: fieldType, options, is_required: isRequired, display_order: displayOrder }, metadata: { field_key: fieldKey } });
    revalidatePath("/admin/settings");
    return { success: "Custom member field saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save custom field." };
  }
}

export async function deleteMemberCustomFieldAction(_: CustomizationActionState, formData: FormData): Promise<CustomizationActionState> {
  try {
    const profile = await requireCustomizationProfile();
    await ensureCustomizationEnabled(profile);
    const fieldId = String(formData.get("field_id") ?? "").trim();
    if (!fieldId) return { error: "Field id is required." };
    const supabase = await createClient();
    const previous = await verifyFieldOwnership(supabase, profile.tenant_id ?? "", fieldId);
    const { error } = await supabase.from("member_custom_fields").delete().eq("tenant_id", profile.tenant_id).eq("id", fieldId);
    if (error) throw new Error(error.message);
    await logCustomizationActivity({ profile, action: "member_custom_field_deleted", entityType: "member_custom_field", entityId: previous.id, description: `Deleted member custom field: ${previous.field_name}`, oldValue: previous, newValue: null, metadata: { field_key: previous.field_key } });
    revalidatePath("/admin/settings");
    return { success: "Custom field deleted." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to delete custom field." };
  }
}
export async function saveMemberCustomFieldValueAction(_: CustomizationActionState, formData: FormData): Promise<CustomizationActionState> {
  try {
    const profile = await requireCustomizationProfile();
    await ensureCustomizationEnabled(profile);
    const memberId = String(formData.get("member_id") ?? "").trim();
    const fieldId = String(formData.get("field_id") ?? "").trim();
    const valueText = String(formData.get("value") ?? "null").trim();
    if (!memberId || !fieldId) return { error: "Member and custom field are required." };
    let value: Json = null;
    try {
      value = parseJson(valueText);
    } catch {
      value = valueText;
    }
    const supabase = await createClient();
    const member = await verifyMemberOwnership(supabase, profile.tenant_id ?? "", memberId);
    const field = await verifyFieldOwnership(supabase, profile.tenant_id ?? "", fieldId);
    const { data: previous, error: previousError } = await supabase.from("member_custom_field_values").select("id,value").eq("tenant_id", profile.tenant_id).eq("member_id", memberId).eq("field_id", fieldId).maybeSingle();
    if (previousError) throw new Error(previousError.message);
    const { error } = await supabase.from("member_custom_field_values").upsert({ tenant_id: profile.tenant_id, member_id: memberId, field_id: fieldId, value }, { onConflict: "tenant_id,member_id,field_id" });
    if (error) throw new Error(error.message);
    await logCustomizationActivity({ profile, action: previous?.id ? "member_custom_field_value_updated" : "member_custom_field_value_created", entityType: "member_custom_field_value", entityId: `${profile.tenant_id}:${memberId}:${fieldId}`, description: `${previous?.id ? "Updated" : "Created"} custom field value for ${member.full_name}`, oldValue: previous?.value ?? null, newValue: value, metadata: { member_id: memberId, field_id: fieldId, field_key: field.field_key } });
    revalidatePath("/admin/settings");
    return { success: "Member custom field value saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save member custom field value." };
  }
}

export async function deleteMemberCustomFieldValueAction(_: CustomizationActionState, formData: FormData): Promise<CustomizationActionState> {
  try {
    const profile = await requireCustomizationProfile();
    await ensureCustomizationEnabled(profile);
    const memberId = String(formData.get("member_id") ?? "").trim();
    const fieldId = String(formData.get("field_id") ?? "").trim();
    if (!memberId || !fieldId) return { error: "Member and custom field are required." };
    const supabase = await createClient();
    const member = await verifyMemberOwnership(supabase, profile.tenant_id ?? "", memberId);
    const field = await verifyFieldOwnership(supabase, profile.tenant_id ?? "", fieldId);
    const { data: previous, error: previousError } = await supabase.from("member_custom_field_values").select("id,value").eq("tenant_id", profile.tenant_id).eq("member_id", memberId).eq("field_id", fieldId).maybeSingle();
    if (previousError) throw new Error(previousError.message);
    if (!previous) return { success: "No member custom field value existed for that pair." };
    const { error } = await supabase.from("member_custom_field_values").delete().eq("tenant_id", profile.tenant_id).eq("member_id", memberId).eq("field_id", fieldId);
    if (error) throw new Error(error.message);
    await logCustomizationActivity({ profile, action: "member_custom_field_value_deleted", entityType: "member_custom_field_value", entityId: `${profile.tenant_id}:${memberId}:${fieldId}`, description: `Deleted custom field value for ${member.full_name}`, oldValue: previous.value, newValue: null, metadata: { member_id: memberId, field_id: fieldId, field_key: field.field_key } });
    revalidatePath("/admin/settings");
    return { success: "Member custom field value deleted." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to delete member custom field value." };
  }
}

export async function saveMemberFormSettingsAction(_: CustomizationActionState, formData: FormData): Promise<CustomizationActionState> {
  try {
    const profile = await requireCustomizationProfile();
    const branchId = String(formData.get("branch_id") ?? "").trim();
    const { MEMBER_FORM_FIELDS } = await import("@/lib/members/form-config");
    const value = Object.fromEntries(MEMBER_FORM_FIELDS.map(({ key }) => [key, {
      visible: parseBoolean(formData.get(`${key}_visible`)),
      required: parseBoolean(formData.get(`${key}_required`)) && parseBoolean(formData.get(`${key}_visible`)),
    }]));
    if (branchId) await upsertBranchSetting(profile, branchId, "members.form_fields", value);
    else await upsertTenantSetting(profile, "members.form_fields", value);
    revalidatePath("/admin/settings"); revalidatePath("/admin/members"); revalidatePath("/admin/members/new");
    revalidatePath("/reception/members"); revalidatePath("/reception/members/new");
    return { success: branchId ? "Branch member-form settings saved." : "Gym member-form settings saved." };
  } catch (error) { return { error: error instanceof Error ? error.message : "Unable to save member-form settings." }; }
}