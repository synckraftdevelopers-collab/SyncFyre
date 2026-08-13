import { z } from "zod";

const phonePattern = /^(?:\+91)?[6-9]\d{9}$/;
const optionalPhone = z
  .string()
  .trim()
  .refine((value) => value === "" || phonePattern.test(value), "Enter a valid 10-digit mobile number.")
  .optional()
  .or(z.literal(""))
  .nullable();

export const memberSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required.").max(120),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional().or(z.literal("")).nullable(),
  date_of_birth: z.string().date().optional().or(z.literal("")).nullable(),
  phone: optionalPhone,
  email: z.string().email("Enter a valid email address.").optional().or(z.literal("")).nullable(),
  address: z.string().max(500).optional().or(z.literal("")).nullable(),
  emergency_contact_name: z.string().max(120).optional().or(z.literal("")).nullable(),
  emergency_contact_phone: optionalPhone,
  height_cm: z.union([z.coerce.number().positive().max(300), z.literal("")]).optional().nullable(),
  weight_kg: z.union([z.coerce.number().positive().max(500), z.literal("")]).optional().nullable(),
  blood_group: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional().or(z.literal("")).nullable(),
  medical_conditions: z.string().max(1000).optional().or(z.literal("")).nullable(),
  age: z.union([z.coerce.number().int().min(0).max(130), z.literal("")]).optional().nullable(),
  candidate_consent_name: z.string().max(120).optional().or(z.literal("")).nullable(),
  relationship_to_candidate: z.string().max(100).optional().or(z.literal("")).nullable(),
  screening_date: z.string().date().optional().or(z.literal("")).nullable(),
  screening_valid_until: z.string().date().optional().or(z.literal("")).nullable(),
  fitness_goal: z.string().max(500).optional().or(z.literal("")).nullable(),
  assigned_trainer_id: z.string().uuid().optional().or(z.literal("")).nullable(),
  assigned_dietician_id: z.string().uuid().optional().or(z.literal("")).nullable(),
  branch_id: z.string().uuid("Choose a branch."),
  status: z.enum(["active", "inactive"]).default("active"),
  profile_photo_url: z.string().url().optional().or(z.literal("")).nullable(),
});

export type MemberInput = z.infer<typeof memberSchema>;
