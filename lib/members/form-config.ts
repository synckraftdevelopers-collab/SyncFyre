import type { MemberFormFieldKey, MemberFormFieldSettings } from "@/lib/config/schema";

export const MEMBER_FORM_FIELDS: Array<{ key: MemberFormFieldKey; label: string; section: "Personal" | "Emergency" | "Medical" | "Additional" | "Membership" }> = [
  { key: "phone", label: "Mobile", section: "Personal" }, { key: "email", label: "Email", section: "Personal" }, { key: "gender", label: "Gender", section: "Personal" }, { key: "date_of_birth", label: "Date of birth", section: "Personal" }, { key: "address", label: "Address", section: "Personal" },
  { key: "emergency_contact_name", label: "Emergency contact", section: "Emergency" }, { key: "emergency_contact_phone", label: "Emergency phone", section: "Emergency" },
  { key: "height_cm", label: "Height", section: "Medical" }, { key: "weight_kg", label: "Weight", section: "Medical" }, { key: "blood_group", label: "Blood group", section: "Medical" }, { key: "medical_conditions", label: "Medical conditions", section: "Medical" }, { key: "fitness_goal", label: "Fitness goal", section: "Medical" },
  { key: "candidate_consent_name", label: "Candidate consent name", section: "Additional" }, { key: "relationship_to_candidate", label: "Relationship to candidate", section: "Additional" }, { key: "screening_date", label: "Screening date", section: "Additional" }, { key: "screening_valid_until", label: "Screening valid until", section: "Additional" }, { key: "assigned_trainer_id", label: "Assign trainer", section: "Membership" },
];

export const MEMBER_FORM_DEFAULTS: MemberFormFieldSettings = Object.fromEntries(MEMBER_FORM_FIELDS.map(({ key }) => [key, { visible: !["candidate_consent_name", "relationship_to_candidate", "screening_date", "screening_valid_until"].includes(key), required: false }])) as MemberFormFieldSettings;

export function resolveMemberFormFields(value: unknown): MemberFormFieldSettings {
  const supplied = value && typeof value === "object" && !Array.isArray(value) ? value as MemberFormFieldSettings : {};
  return Object.fromEntries(MEMBER_FORM_FIELDS.map(({ key }) => {
    const item = supplied[key]; const fallback = MEMBER_FORM_DEFAULTS[key]!;
    const visible = item?.visible ?? fallback.visible;
    return [key, { visible, required: visible && Boolean(item?.required) }];
  })) as MemberFormFieldSettings;
}