import { createClient } from "@/lib/supabase/server";
import { preferBranchThenGlobal, resolveConfigValue } from "@/services/config-resolver";
import { CONFIG_DEFAULTS, COMMUNICATION_TEMPLATE_DEFAULTS, FEATURE_DEFAULTS } from "@/lib/config/defaults";
import {
  CONFIG_DEFINITIONS,
  type CommunicationChannel,
  type CommunicationTemplateRecord,
  type ConfigKey,
  type ConfigRecord,
  type ConfigValueMap,
  type FeatureKey,
  type MemberCustomFieldRecord,
  type MemberCustomFieldValueRecord,
} from "@/lib/config/schema";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type SettingsRow = {
  branch_id: string | null;
  key: string;
  value: Json;
  updated_at: string;
  updated_by: string | null;
};

export type ResolvedSettingResult<K extends ConfigKey = ConfigKey> = {
  key: K;
  value: ConfigValueMap[K];
  source: "branch" | "tenant" | "legacy" | "default";
  branchRecord?: ConfigRecord | null;
  tenantRecord?: ConfigRecord | null;
  legacyRecord?: SettingsRow | null;
};

function castConfigValue<K extends ConfigKey>(key: K, value: Json): ConfigValueMap[K] {
  const definition = CONFIG_DEFINITIONS[key];
  if (definition.dataType === "boolean") return Boolean(value) as unknown as ConfigValueMap[K];
  if (definition.dataType === "number") return Number(value ?? 0) as unknown as ConfigValueMap[K];
  if (definition.dataType === "string_array") return (Array.isArray(value) ? value.map(String) : []) as unknown as ConfigValueMap[K];
  return value as ConfigValueMap[K];
}

async function getLegacySettingFallback<K extends ConfigKey>(branchId: string | null | undefined, key: K) {
  const supabase = await createClient();

  if (branchId) {
    const { data: branchData, error: branchError } = await supabase
      .from("settings")
      .select("branch_id,key,value,updated_at,updated_by")
      .eq("key", key)
      .eq("branch_id", branchId)
      .eq("is_secret", false)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (branchError) throw new Error(branchError.message);
    if (branchData) return branchData as SettingsRow;
  }

  const { data: globalData, error: globalError } = await supabase
    .from("settings")
    .select("branch_id,key,value,updated_at,updated_by")
    .eq("key", key)
    .is("branch_id", null)
    .eq("is_secret", false)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (globalError) throw new Error(globalError.message);
  return (globalData ?? null) as SettingsRow | null;
}

async function getCanonicalSourceValue<K extends ConfigKey>(tenantId: string, branchId: string | null | undefined, key: K): Promise<ResolvedSettingResult<K> | null> {
  const supabase = await createClient();

  if (key === "branding.logo_url" || key === "branding.login_title" || key === "branding.member_portal_title") {
    const { data, error } = await supabase.from("tenants").select("logo_url,name").eq("id", tenantId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    const brandingMap = {
      "branding.logo_url": data.logo_url ?? null,
      "branding.login_title": data.name ? `${data.name} Login` : null,
      "branding.member_portal_title": data.name ? `${data.name} Member Portal` : null,
    } as const;

    return { key, value: brandingMap[key as keyof typeof brandingMap] as ConfigValueMap[K], source: "legacy" };
  }

  if (key === "payments.visible_modes") {
    const globalQuery = supabase
      .from("payment_modes")
      .select("code,branch_id")
      .eq("is_active", true)
      .is("branch_id", null)
      .order("display_order");

    const branchQuery = branchId
      ? supabase
          .from("payment_modes")
          .select("code,branch_id")
          .eq("is_active", true)
          .eq("branch_id", branchId)
          .order("display_order")
      : Promise.resolve({ data: [], error: null });

    const [globalResult, branchResult] = await Promise.all([globalQuery, branchQuery]);
    if (globalResult.error) throw new Error(globalResult.error.message);
    if (branchResult.error) throw new Error(branchResult.error.message);

    const branchModes = (branchResult.data ?? []).map((row) => row.code);
    const globalModes = (globalResult.data ?? []).map((row) => row.code);
    const modes = preferBranchThenGlobal({
      branch: branchModes.length ? Array.from(new Set(branchModes)) : null,
      global: globalModes.length ? Array.from(new Set(globalModes)) : null,
    });

    return modes ? { key, value: modes as ConfigValueMap[K], source: "legacy" } : null;
  }

  return null;
}

export async function getTenantSettings(tenantId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_settings")
    .select("id,tenant_id,setting_key,setting_value,data_type,scope,is_overridable,updated_at,updated_by,users!tenant_settings_updated_by_fkey(full_name)")
    .eq("tenant_id", tenantId)
    .order("setting_key");
  if (error) {
    if (isMissingSchemaError(error.message)) return [] as Array<ConfigRecord & { users?: { full_name?: string | null } | null }>;
    throw new Error(error.message);
  }
  return (data ?? []) as Array<ConfigRecord & { users?: { full_name?: string | null } | null }>;
}

export async function getBranchSettings(tenantId: string, branchId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branch_settings")
    .select("id,tenant_id,branch_id,setting_key,setting_value,data_type,updated_at,updated_by,users!branch_settings_updated_by_fkey(full_name)")
    .eq("tenant_id", tenantId)
    .eq("branch_id", branchId)
    .order("setting_key");
  if (error) {
    if (isMissingSchemaError(error.message)) return [] as Array<ConfigRecord & { users?: { full_name?: string | null } | null }>;
    throw new Error(error.message);
  }
  return (data ?? []) as Array<ConfigRecord & { users?: { full_name?: string | null } | null }>;
}

export async function getResolvedSetting<K extends ConfigKey>(tenantId: string, branchId: string | null | undefined, key: K): Promise<ResolvedSettingResult<K>> {
  const supabase = await createClient();
  const [tenantSettings, branchSettings, legacySetting, canonicalValue] = await Promise.all([
    supabase
      .from("tenant_settings")
      .select("id,tenant_id,setting_key,setting_value,data_type,scope,is_overridable,updated_at,updated_by")
      .eq("tenant_id", tenantId)
      .eq("setting_key", key)
      .maybeSingle(),
    branchId
      ? supabase
          .from("branch_settings")
          .select("id,tenant_id,branch_id,setting_key,setting_value,data_type,updated_at,updated_by")
          .eq("tenant_id", tenantId)
          .eq("branch_id", branchId)
          .eq("setting_key", key)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    getLegacySettingFallback(branchId, key),
    getCanonicalSourceValue(tenantId, branchId, key),
  ]);

  if (branchSettings.error) {
    if (!isMissingSchemaError(branchSettings.error.message)) throw new Error(branchSettings.error.message);
  }
  if (tenantSettings.error) {
    if (!isMissingSchemaError(tenantSettings.error.message)) throw new Error(tenantSettings.error.message);
  }

  const resolved = resolveConfigValue<ResolvedSettingResult<K>>({
    branch: !branchSettings.error && branchSettings.data
      ? { key, value: castConfigValue(key, branchSettings.data.setting_value as Json), source: "branch", branchRecord: branchSettings.data as ConfigRecord }
      : null,
    tenant: !tenantSettings.error && tenantSettings.data
      ? { key, value: castConfigValue(key, tenantSettings.data.setting_value as Json), source: "tenant", tenantRecord: tenantSettings.data as ConfigRecord }
      : null,
    legacy: legacySetting
      ? { key, value: castConfigValue(key, legacySetting.value), source: "legacy", legacyRecord: legacySetting }
      : null,
    canonical: canonicalValue,
    defaultValue: { key, value: CONFIG_DEFAULTS[key], source: "default" },
  });

  return resolved.value;
}

export async function getResolvedSettings(tenantId: string, branchId: string | null | undefined, keys?: ConfigKey[]) {
  const targetKeys = keys ?? (Object.keys(CONFIG_DEFINITIONS) as ConfigKey[]);
  const results = await Promise.all(targetKeys.map((key) => getResolvedSetting(tenantId, branchId, key)));
  return Object.fromEntries(results.map((item) => [item.key, item])) as Record<ConfigKey, ResolvedSettingResult>;
}

function isMissingRelationError(message: string | undefined) {
  const value = (message ?? "").toLowerCase();
  return value.includes("could not find the table") || value.includes("relation") && value.includes("does not exist");
}

function isMissingSchemaError(message: string | undefined) {
  return isMissingRelationError(message) || (message ?? "").toLowerCase().includes("schema cache");
}

export async function isFeatureEnabled(tenantId: string, featureKey: FeatureKey) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tenant_features").select("enabled").eq("tenant_id", tenantId).eq("feature_key", featureKey).maybeSingle();
  if (error) {
    if (isMissingRelationError(error.message)) return FEATURE_DEFAULTS[featureKey];
    throw new Error(error.message);
  }
  return data ? data.enabled : FEATURE_DEFAULTS[featureKey];
}

export async function getTenantFeatures(tenantId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_features")
    .select("id,tenant_id,feature_key,enabled,updated_at,updated_by,users!tenant_features_updated_by_fkey(full_name)")
    .eq("tenant_id", tenantId)
    .order("feature_key");
  if (error) {
    if (isMissingRelationError(error.message)) return [] as Array<{ id: string; tenant_id: string; feature_key: string; enabled: boolean; updated_at: string; updated_by: string | null; users?: { full_name?: string | null } | null }>;
    throw new Error(error.message);
  }
  return (data ?? []) as Array<{ id: string; tenant_id: string; feature_key: string; enabled: boolean; updated_at: string; updated_by: string | null; users?: { full_name?: string | null } | null }>;
}

export async function getPaymentMethods(tenantId: string, branchId: string | null | undefined) {
  const supabase = await createClient();
  const globalQuery = supabase
    .from("payment_modes")
    .select("id,name,code,is_active,branch_id,display_order")
    .eq("is_active", true)
    .is("branch_id", null)
    .order("display_order");

  const branchQuery = branchId
    ? supabase
        .from("payment_modes")
        .select("id,name,code,is_active,branch_id,display_order")
        .eq("is_active", true)
        .eq("branch_id", branchId)
        .order("display_order")
    : Promise.resolve({ data: [], error: null });

  const [globalResult, branchResult] = await Promise.all([globalQuery, branchQuery]);

  if (globalResult.error) {
    if (isMissingSchemaError(globalResult.error.message)) return [];
    throw new Error(globalResult.error.message);
  }

  if (branchResult.error) {
    if (isMissingSchemaError(branchResult.error.message)) return [];
    throw new Error(branchResult.error.message);
  }

  const data = [...(branchResult.data ?? []), ...(globalResult.data ?? [])];
  const resolved = await getResolvedSetting(tenantId, branchId, "payments.visible_modes");
  const visible = new Set((resolved.value as string[]).map(String));
  return data.filter((row) => visible.size === 0 || visible.has(row.code));
}

export async function getNotificationSettings(tenantId: string, branchId: string | null | undefined) {
  const keys: ConfigKey[] = [
    "notifications.membership_expiry.enabled",
    "notifications.membership_expiry.channels",
    "notifications.payment_pending.enabled",
    "notifications.payment_pending.channels",
    "notifications.payment_received.enabled",
    "notifications.payment_received.channels",
    "notifications.daily_closing.enabled",
    "notifications.daily_closing.channels",
  ];
  return getResolvedSettings(tenantId, branchId, keys);
}

export async function getCommunicationTemplate(tenantId: string, branchId: string | null | undefined, templateKey: string, channel: CommunicationChannel) {
  const supabase = await createClient();
  const branchTemplate = branchId
    ? await supabase
        .from("communication_templates")
        .select("id,tenant_id,branch_id,template_key,channel,name,content,variables,is_active,updated_at,updated_by")
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId)
        .eq("template_key", templateKey)
        .eq("channel", channel)
        .eq("is_active", true)
        .maybeSingle()
    : { data: null, error: null };
  if (branchTemplate.error) {
    if (isMissingSchemaError(branchTemplate.error.message)) return null;
    throw new Error(branchTemplate.error.message);
  }
  if (branchTemplate.data) return { source: "branch" as const, template: branchTemplate.data as CommunicationTemplateRecord };

  const { data, error } = await supabase
    .from("communication_templates")
    .select("id,tenant_id,branch_id,template_key,channel,name,content,variables,is_active,updated_at,updated_by")
    .eq("tenant_id", tenantId)
    .is("branch_id", null)
    .eq("template_key", templateKey)
    .eq("channel", channel)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    if (isMissingSchemaError(error.message)) return null;
    throw new Error(error.message);
  }
  if (data) return { source: "tenant" as const, template: data as CommunicationTemplateRecord };

  const defaults = (COMMUNICATION_TEMPLATE_DEFAULTS as Record<string, Record<string, { name: string; content: string; variables: readonly string[] } | undefined>>)[templateKey]?.[channel];
  if (!defaults) return null;
  return {
    source: "default" as const,
    template: {
      id: "default",
      tenant_id: tenantId,
      branch_id: branchId ?? null,
      template_key: templateKey,
      channel,
      name: defaults.name,
      content: defaults.content,
      variables: [...defaults.variables],
      is_active: true,
      updated_at: "",
      updated_by: null,
    } as CommunicationTemplateRecord,
  };
}

export async function listCommunicationTemplates(tenantId: string, branchId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("communication_templates")
    .select("id,tenant_id,branch_id,template_key,channel,name,content,variables,is_active,updated_at,updated_by,users!communication_templates_updated_by_fkey(full_name),branches(name)")
    .eq("tenant_id", tenantId)
    .order("template_key")
    .order("channel");
  if (branchId) query = query.in("branch_id", [branchId, null]);
  const { data, error } = await query;
  if (error) {
    if (isMissingSchemaError(error.message)) return [];
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getCustomFields(tenantId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_custom_fields")
    .select("id,tenant_id,field_key,field_name,field_type,options,is_required,is_active,display_order,updated_at,updated_by,users!member_custom_fields_updated_by_fkey(full_name)")
    .eq("tenant_id", tenantId)
    .order("display_order")
    .order("field_name");
  if (error) {
    if (isMissingSchemaError(error.message)) return [] as Array<MemberCustomFieldRecord & { users?: { full_name?: string | null } | null }>;
    throw new Error(error.message);
  }
  return (data ?? []) as Array<MemberCustomFieldRecord & { users?: { full_name?: string | null } | null }>;
}

export async function getCustomField(fieldId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("member_custom_fields").select("*").eq("id", fieldId).maybeSingle();
  if (error) {
    if (isMissingSchemaError(error.message)) return null;
    throw new Error(error.message);
  }
  return data as MemberCustomFieldRecord | null;
}

export async function getMemberCustomFieldValues(tenantId: string, memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_custom_field_values")
    .select("id,tenant_id,member_id,field_id,value,updated_at,member_custom_fields(field_key,field_name,field_type,options,is_required)")
    .eq("tenant_id", tenantId)
    .eq("member_id", memberId);
  if (error) {
    if (isMissingSchemaError(error.message)) return [] as unknown as Array<MemberCustomFieldValueRecord & { member_custom_fields?: Array<Record<string, Json>> | null }>;
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as Array<MemberCustomFieldValueRecord & { member_custom_fields?: Array<Record<string, Json>> | null }>;
}

export async function setMemberCustomFieldValue(input: { tenantId: string; memberId: string; fieldId: string; value: Json }) {
  const supabase = await createClient();
  const { data: member, error: memberError } = await supabase.from("members").select("id,tenant_id").eq("id", input.memberId).eq("tenant_id", input.tenantId).maybeSingle();
  if (memberError) throw new Error(memberError.message);
  if (!member) throw new Error("Member not found for tenant.");
  const { data: field, error: fieldError } = await supabase.from("member_custom_fields").select("id,tenant_id").eq("id", input.fieldId).eq("tenant_id", input.tenantId).maybeSingle();
  if (fieldError) throw new Error(fieldError.message);
  if (!field) throw new Error("Custom field not found for tenant.");
  const { data, error } = await supabase
    .from("member_custom_field_values")
    .upsert({ tenant_id: input.tenantId, member_id: input.memberId, field_id: input.fieldId, value: input.value }, { onConflict: "tenant_id,member_id,field_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as MemberCustomFieldValueRecord;
}
