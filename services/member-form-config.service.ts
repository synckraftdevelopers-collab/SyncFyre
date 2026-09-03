import { createClient } from "@/lib/supabase/server";
import {
  getDefaultMemberFormConfiguration,
  normalizeMemberFormConfiguration,
  sanitizeMemberFormConfiguration,
  type MemberFormFieldConfiguration,
  type MemberFormFieldKey,
} from "@/lib/members/member-form-config";

type MemberFormConfigurationRow = {
  tenant_id: string;
  field_key: string;
  enabled: boolean;
  required: boolean;
  display_order: number;
};

function isMissingRelationError(message: string | undefined) {
  const value = (message ?? "").toLowerCase();
  return value.includes("could not find the table") || (value.includes("relation") && value.includes("does not exist")) || value.includes("schema cache");
}

export async function getMemberFormConfiguration(tenantId: string): Promise<MemberFormFieldConfiguration[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_form_configurations")
    .select("tenant_id,field_key,enabled,required,display_order")
    .eq("tenant_id", tenantId)
    .order("display_order")
    .order("field_key");

  if (error) {
    if (isMissingRelationError(error.message)) return getDefaultMemberFormConfiguration();
    throw new Error(error.message);
  }

  return normalizeMemberFormConfiguration((data ?? []) as MemberFormConfigurationRow[]);
}

export async function saveMemberFormConfiguration(
  tenantId: string,
  updatedBy: string,
  config: Array<{ key: MemberFormFieldKey; enabled: boolean; required: boolean; displayOrder: number }>,
) {
  const supabase = await createClient();
  const rows = sanitizeMemberFormConfiguration(config).map((item) => ({
    tenant_id: tenantId,
    field_key: item.field_key,
    enabled: item.enabled,
    required: item.required,
    display_order: item.display_order,
    updated_by: updatedBy,
    created_by: updatedBy,
  }));

  const { error } = await supabase.from("member_form_configurations").upsert(rows, { onConflict: "tenant_id,field_key" });
  if (error) throw new Error(error.message);

  return normalizeMemberFormConfiguration(rows);
}

export async function resetMemberFormConfiguration(tenantId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("member_form_configurations").delete().eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
  return getDefaultMemberFormConfiguration();
}

export type DynamicMemberFormRequirement = {
  requiredKeys: Set<string>;
  enabledKeys: Set<string>;
};

export async function getDynamicMemberFormRequirement(tenantId: string): Promise<DynamicMemberFormRequirement> {
  const config = await getMemberFormConfiguration(tenantId);
  return {
    enabledKeys: new Set(config.filter((field) => field.enabled).map((field) => field.key)),
    requiredKeys: new Set(config.filter((field) => field.required).map((field) => field.key)),
  };
}
