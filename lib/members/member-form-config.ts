import { z } from "zod";

export const MEMBER_FORM_FIELD_KEYS = [
  "full_name",
  "phone",
  "email",
  "gender",
  "date_of_birth",
  "age",
  "address",
  "blood_group",
  "height_cm",
  "weight_kg",
  "medical_conditions",
  "fitness_goal",
  "emergency_contact_name",
  "emergency_contact_phone",
  "candidate_consent_name",
  "relationship_to_candidate",
  "screening_date",
  "screening_valid_until",
] as const;

export type MemberFormFieldKey = (typeof MEMBER_FORM_FIELD_KEYS)[number];

export type MemberFormFieldDefinition = {
  key: MemberFormFieldKey;
  label: string;
  section: "personal" | "emergency" | "medical";
  input: "text" | "email" | "tel" | "date" | "number" | "select" | "textarea";
  placeholder?: string;
  description?: string;
  options?: ReadonlyArray<{ value: string; label: string }>;
  systemRequired?: boolean;
  mobileHalf?: boolean;
  fullWidth?: boolean;
};

export type MemberFormFieldConfiguration = {
  key: MemberFormFieldKey;
  label: string;
  section: MemberFormFieldDefinition["section"];
  enabled: boolean;
  required: boolean;
  displayOrder: number;
  systemRequired: boolean;
  input: MemberFormFieldDefinition["input"];
  placeholder?: string;
  description?: string;
  options?: MemberFormFieldDefinition["options"];
  mobileHalf?: boolean;
  fullWidth?: boolean;
};

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

const BLOOD_GROUP_OPTIONS = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
] as const;

export const MEMBER_FORM_FIELD_DEFINITIONS: Record<MemberFormFieldKey, MemberFormFieldDefinition> = {
  full_name: { key: "full_name", label: "Full Name", section: "personal", input: "text", placeholder: "e.g. Rahul Sharma", systemRequired: true },
  phone: { key: "phone", label: "Phone", section: "personal", input: "tel", placeholder: "9876543210" },
  email: { key: "email", label: "Email", section: "personal", input: "email", placeholder: "member@example.com" },
  gender: { key: "gender", label: "Gender", section: "personal", input: "select", options: GENDER_OPTIONS },
  date_of_birth: { key: "date_of_birth", label: "Date of Birth", section: "personal", input: "date" },
  age: { key: "age", label: "Age", section: "personal", input: "number", mobileHalf: true },
  address: { key: "address", label: "Address", section: "personal", input: "textarea", placeholder: "Full address", fullWidth: true },
  blood_group: { key: "blood_group", label: "Blood Group", section: "medical", input: "select", options: BLOOD_GROUP_OPTIONS },
  height_cm: { key: "height_cm", label: "Height", section: "medical", input: "number", placeholder: "170", description: "cm", mobileHalf: true },
  weight_kg: { key: "weight_kg", label: "Weight", section: "medical", input: "number", placeholder: "70", description: "kg", mobileHalf: true },
  medical_conditions: { key: "medical_conditions", label: "Medical Conditions", section: "medical", input: "textarea", placeholder: "Allergies, injuries, conditions", fullWidth: true },
  fitness_goal: { key: "fitness_goal", label: "Fitness Goal", section: "medical", input: "text", placeholder: "Weight loss, muscle gain..." },
  emergency_contact_name: { key: "emergency_contact_name", label: "Emergency Contact", section: "emergency", input: "text", placeholder: "Parent / Spouse name" },
  emergency_contact_phone: { key: "emergency_contact_phone", label: "Emergency Phone", section: "emergency", input: "tel", placeholder: "9876543210" },
  candidate_consent_name: { key: "candidate_consent_name", label: "Candidate Consent Name", section: "emergency", input: "text" },
  relationship_to_candidate: { key: "relationship_to_candidate", label: "Relationship To Candidate", section: "emergency", input: "text" },
  screening_date: { key: "screening_date", label: "Screening Date", section: "emergency", input: "date" },
  screening_valid_until: { key: "screening_valid_until", label: "Screening Valid Until", section: "emergency", input: "date" },
};

export const MEMBER_FORM_DEFAULT_CONFIGURATION: MemberFormFieldConfiguration[] = MEMBER_FORM_FIELD_KEYS.map((key, index) => {
  const definition = MEMBER_FORM_FIELD_DEFINITIONS[key];
  return {
    key,
    label: definition.label,
    section: definition.section,
    enabled: true,
    required: Boolean(definition.systemRequired),
    displayOrder: index + 1,
    systemRequired: Boolean(definition.systemRequired),
    input: definition.input,
    placeholder: definition.placeholder,
    description: definition.description,
    options: definition.options,
    mobileHalf: definition.mobileHalf,
    fullWidth: definition.fullWidth,
  };
});

export const memberFormConfigurationItemSchema = z.object({
  key: z.enum(MEMBER_FORM_FIELD_KEYS),
  enabled: z.boolean(),
  required: z.boolean(),
  displayOrder: z.number().int().positive(),
});

export const memberFormConfigurationSchema = z.array(memberFormConfigurationItemSchema).length(MEMBER_FORM_FIELD_KEYS.length);

export function getDefaultMemberFormConfiguration() {
  return MEMBER_FORM_DEFAULT_CONFIGURATION.map((item) => ({ ...item }));
}

export function normalizeMemberFormConfiguration(
  raw: Array<{ field_key: string; enabled: boolean; required: boolean; display_order: number }> | null | undefined,
) {
  const records = new Map((raw ?? []).map((item) => [item.field_key, item]));
  return MEMBER_FORM_FIELD_KEYS.map((key, index) => {
    const defaults = MEMBER_FORM_DEFAULT_CONFIGURATION[index];
    const record = records.get(key);
    const enabled = defaults.systemRequired ? true : record?.enabled ?? defaults.enabled;
    const required = defaults.systemRequired ? true : enabled ? (record?.required ?? defaults.required) : false;
    return {
      ...defaults,
      enabled,
      required,
      displayOrder: Number.isFinite(record?.display_order) ? Number(record?.display_order) : defaults.displayOrder,
    };
  }).sort((a, b) => a.displayOrder - b.displayOrder || a.label.localeCompare(b.label));
}

export function sanitizeMemberFormConfiguration(input: Array<{ key: MemberFormFieldKey; enabled: boolean; required: boolean; displayOrder: number }>) {
  const parsed = memberFormConfigurationSchema.parse(input);
  const seen = new Set<MemberFormFieldKey>();
  const normalized = parsed.map((item, index) => {
    if (seen.has(item.key)) throw new Error(`Duplicate field configuration for ${item.key}.`);
    seen.add(item.key);
    const definition = MEMBER_FORM_FIELD_DEFINITIONS[item.key];
    const systemRequired = Boolean(definition.systemRequired);
    const enabled = systemRequired ? true : item.enabled;
    return {
      field_key: item.key,
      enabled,
      required: systemRequired ? true : enabled ? item.required : false,
      display_order: index + 1,
    };
  });
  if (seen.size !== MEMBER_FORM_FIELD_KEYS.length) throw new Error("Member form configuration is incomplete.");
  return normalized;
}
