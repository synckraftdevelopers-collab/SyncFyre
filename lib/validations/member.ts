import { z } from "zod";

export const memberSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional().nullable(),
  date_of_birth: z.string().date().optional().nullable(),
  phone: z.string().trim().min(7).max(20),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  address: z.string().max(500).optional().nullable(),
  emergency_contact_name: z.string().max(120).optional().nullable(),
  emergency_contact_phone: z.string().max(20).optional().nullable(),
  height_cm: z.coerce.number().positive().max(300).optional().nullable(),
  weight_kg: z.coerce.number().positive().max(500).optional().nullable(),
  blood_group: z.string().max(8).optional().nullable(),
  medical_conditions: z.string().max(1000).optional().nullable(),
  fitness_goal: z.string().max(500).optional().nullable(),
  assigned_trainer_id: z.string().uuid().optional().nullable(),
  branch_id: z.string().uuid(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type MemberInput = z.infer<typeof memberSchema>;
