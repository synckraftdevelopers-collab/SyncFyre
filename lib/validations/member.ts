import { z } from "zod";

export const memberSchema = z.object({
  // ⭐ REQUIRED FIELD — must be validated before proceeding
  full_name: z.string().trim().min(2).max(120),
  
  // OPTIONAL FIELD — should not block next-step navigation
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional().or(z.literal("")).nullable(),
  
  // OPTIONAL FIELD — should not block next-step navigation
  date_of_birth: z.string().date().optional().or(z.literal("")).nullable(),
  
  // OPTIONAL FIELD — should not block next-step navigation
  phone: z.string().trim().min(7).max(20).optional().or(z.literal("")).nullable(),
  
  // OPTIONAL FIELD — should not block next-step navigation
  email: z.string().email().optional().or(z.literal("")).nullable(),
  
  // OPTIONAL FIELD — should not block next-step navigation
  address: z.string().max(500).optional().or(z.literal("")).nullable(),
  
  // OPTIONAL FIELD — should not block next-step navigation
  emergency_contact_name: z.string().max(120).optional().or(z.literal("")).nullable(),
  
  // OPTIONAL FIELD — should not block next-step navigation
  emergency_contact_phone: z.string().max(20).optional().or(z.literal("")).nullable(),
  
  // OPTIONAL FIELD — should not block next-step navigation
  height_cm: z.union([z.coerce.number().positive().max(300), z.literal("")]).optional().nullable(),
  
  // OPTIONAL FIELD — should not block next-step navigation
  weight_kg: z.union([z.coerce.number().positive().max(500), z.literal("")]).optional().nullable(),
  
  // OPTIONAL FIELD — should not block next-step navigation
  blood_group: z.string().max(8).optional().or(z.literal("")).nullable(),
  
  // OPTIONAL FIELD — should not block next-step navigation
  medical_conditions: z.string().max(1000).optional().or(z.literal("")).nullable(),
  
  // OPTIONAL FIELD — should not block next-step navigation
  fitness_goal: z.string().max(500).optional().or(z.literal("")).nullable(),
  
  // OPTIONAL FIELD — should not block next-step navigation
  assigned_trainer_id: z.string().uuid().optional().or(z.literal("")).nullable(),
  
  // ⭐ REQUIRED FIELD — must be validated before proceeding
  branch_id: z.string().uuid(),
  
  // ⭐ REQUIRED FIELD — must be validated before proceeding
  status: z.enum(["active", "inactive"]).default("active"),
  
  // OPTIONAL FIELD — should not block next-step navigation
  profile_photo_url: z.string().url().optional().or(z.literal("")).nullable(),
});

export type MemberInput = z.infer<typeof memberSchema>;
