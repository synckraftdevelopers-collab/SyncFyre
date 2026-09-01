type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export const CONFIG_SCOPES = ["tenant", "tenant_branch"] as const;
export type ConfigScope = (typeof CONFIG_SCOPES)[number];

export const CONFIG_DATA_TYPES = ["string", "number", "boolean", "json", "string_array"] as const;
export type ConfigDataType = (typeof CONFIG_DATA_TYPES)[number];

export const COMMUNICATION_CHANNELS = ["whatsapp", "sms", "email"] as const;
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

export const MEMBER_CUSTOM_FIELD_TYPES = ["text", "number", "date", "dropdown", "checkbox", "radio", "textarea"] as const;
export type MemberCustomFieldType = (typeof MEMBER_CUSTOM_FIELD_TYPES)[number];

export const FEATURE_KEYS = [
  "customization_engine_enabled",
  "members",
  "membership",
  "payments",
  "finance",
  "accounting",
  "gst",
  "trainer",
  "dietician",
  "equipment",
  "biometric",
  "whatsapp",
  "reports",
  "advanced_reports",
  "member_portal",
  "ai_insights",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type ConfigValueMap = {
  "branding.logo_url": string | null;
  "branding.favicon_url": string | null;
  "branding.primary_color": string;
  "branding.secondary_color": string;
  "branding.accent_color": string;
  "branding.theme": "light" | "dark" | "system";
  "branding.login_title": string | null;
  "branding.member_portal_title": string | null;
  "payments.visible_modes": string[];
  "payments.allow_partial_payments": boolean;
  "payments.require_approval": boolean;
  "notifications.membership_expiry.enabled": boolean;
  "notifications.membership_expiry.channels": CommunicationChannel[];
  "notifications.payment_pending.enabled": boolean;
  "notifications.payment_pending.channels": CommunicationChannel[];
  "notifications.payment_received.enabled": boolean;
  "notifications.payment_received.channels": CommunicationChannel[];
  "notifications.daily_closing.enabled": boolean;
  "notifications.daily_closing.channels": CommunicationChannel[];
};

export type ConfigKey = keyof ConfigValueMap;

export interface ConfigDefinition<K extends ConfigKey = ConfigKey> {
  key: K;
  dataType: ConfigDataType;
  scope: ConfigScope;
  overridable: boolean;
}

export const CONFIG_DEFINITIONS: Record<ConfigKey, ConfigDefinition> = {
  "branding.logo_url": { key: "branding.logo_url", dataType: "string", scope: "tenant", overridable: false },
  "branding.favicon_url": { key: "branding.favicon_url", dataType: "string", scope: "tenant", overridable: false },
  "branding.primary_color": { key: "branding.primary_color", dataType: "string", scope: "tenant", overridable: false },
  "branding.secondary_color": { key: "branding.secondary_color", dataType: "string", scope: "tenant", overridable: false },
  "branding.accent_color": { key: "branding.accent_color", dataType: "string", scope: "tenant", overridable: false },
  "branding.theme": { key: "branding.theme", dataType: "string", scope: "tenant", overridable: false },
  "branding.login_title": { key: "branding.login_title", dataType: "string", scope: "tenant", overridable: false },
  "branding.member_portal_title": { key: "branding.member_portal_title", dataType: "string", scope: "tenant", overridable: false },
  "payments.visible_modes": { key: "payments.visible_modes", dataType: "string_array", scope: "tenant_branch", overridable: true },
  "payments.allow_partial_payments": { key: "payments.allow_partial_payments", dataType: "boolean", scope: "tenant", overridable: true },
  "payments.require_approval": { key: "payments.require_approval", dataType: "boolean", scope: "tenant", overridable: true },
  "notifications.membership_expiry.enabled": { key: "notifications.membership_expiry.enabled", dataType: "boolean", scope: "tenant_branch", overridable: true },
  "notifications.membership_expiry.channels": { key: "notifications.membership_expiry.channels", dataType: "string_array", scope: "tenant_branch", overridable: true },
  "notifications.payment_pending.enabled": { key: "notifications.payment_pending.enabled", dataType: "boolean", scope: "tenant_branch", overridable: true },
  "notifications.payment_pending.channels": { key: "notifications.payment_pending.channels", dataType: "string_array", scope: "tenant_branch", overridable: true },
  "notifications.payment_received.enabled": { key: "notifications.payment_received.enabled", dataType: "boolean", scope: "tenant_branch", overridable: true },
  "notifications.payment_received.channels": { key: "notifications.payment_received.channels", dataType: "string_array", scope: "tenant_branch", overridable: true },
  "notifications.daily_closing.enabled": { key: "notifications.daily_closing.enabled", dataType: "boolean", scope: "tenant_branch", overridable: true },
  "notifications.daily_closing.channels": { key: "notifications.daily_closing.channels", dataType: "string_array", scope: "tenant_branch", overridable: true },
};

export type ConfigRecord = {
  id: string;
  tenant_id: string;
  branch_id?: string | null;
  setting_key: ConfigKey;
  setting_value: Json;
  data_type: ConfigDataType;
  scope?: ConfigScope;
  is_overridable?: boolean;
  updated_at: string;
  updated_by?: string | null;
};

export interface CommunicationTemplateRecord {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  template_key: string;
  channel: CommunicationChannel;
  name: string;
  content: string;
  variables: string[];
  is_active: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface MemberCustomFieldRecord {
  id: string;
  tenant_id: string;
  field_key: string;
  field_name: string;
  field_type: MemberCustomFieldType;
  options: Json;
  is_required: boolean;
  is_active: boolean;
  display_order: number;
  updated_at: string;
  updated_by: string | null;
}

export interface MemberCustomFieldValueRecord {
  id: string;
  tenant_id: string;
  member_id: string;
  field_id: string;
  value: Json;
  updated_at: string;
}
