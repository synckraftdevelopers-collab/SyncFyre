import { z } from "zod";

const uuid = z.string().uuid();
const optionalText = z.string().trim().max(2000).optional().nullable();
const status = z.enum(["active", "inactive"]).optional();

export const resourceSchemas = {
  "membership-plans": z.object({ branch_id: uuid.optional().nullable(), name: z.string().min(2).max(120), price: z.coerce.number().nonnegative(), gst_percent: z.coerce.number().min(0).max(100).default(18), discount_percent: z.coerce.number().min(0).max(100).default(0), duration_months: z.coerce.number().int().positive(), features: z.array(z.string()).default([]), status }),
  subscriptions: z.object({ member_id: uuid, plan_id: uuid, branch_id: uuid, start_date: z.string().date(), end_date: z.string().date().optional(), status: z.enum(["pending","active","expired","cancelled","paused"]).optional(), auto_renew: z.boolean().optional(), price: z.coerce.number().nonnegative(), discount_amount: z.coerce.number().nonnegative().default(0), gst_amount: z.coerce.number().nonnegative().default(0), total_amount: z.coerce.number().nonnegative() }),
  appointments: z.object({ member_id: uuid, branch_id: uuid, provider_staff_id: uuid.optional().nullable(), provider_type: z.enum(["trainer","dietician","physiotherapist"]), appointment_date: z.string().date(), start_time: z.string(), end_time: z.string(), status: z.enum(["pending","approved","completed","cancelled"]).optional(), purpose: optionalText, notes: optionalText }),
  trainers: z.object({ user_id: uuid, staff_id: uuid.optional().nullable(), branch_id: uuid, specializations: z.array(z.string()).default([]), experience_years: z.coerce.number().nonnegative().default(0), certifications: z.array(z.string()).default([]), bio: optionalText, status }),
  workouts: z.object({ category_id: uuid.optional().nullable(), member_id: uuid, trainer_id: uuid.optional().nullable(), branch_id: uuid, name: z.string().min(2).max(120), exercise_name: z.string().min(2).max(120), sets: z.coerce.number().int().positive().optional().nullable(), reps: z.coerce.number().int().positive().optional().nullable(), weight_kg: z.coerce.number().nonnegative().optional().nullable(), cardio_minutes: z.coerce.number().int().nonnegative().optional().nullable(), rest_seconds: z.coerce.number().int().nonnegative().optional().nullable(), trainer_notes: optionalText, scheduled_date: z.string().date().optional().nullable(), status }),
  "diet-plans": z.object({ member_id: uuid, staff_id: uuid.optional().nullable(), branch_id: uuid, name: z.string().min(2).max(120), start_date: z.string().date(), end_date: z.string().date().optional().nullable(), breakfast: optionalText, lunch: optionalText, dinner: optionalText, snacks: optionalText, calories: z.coerce.number().int().nonnegative().optional().nullable(), protein_g: z.coerce.number().nonnegative().optional().nullable(), fat_g: z.coerce.number().nonnegative().optional().nullable(), carbs_g: z.coerce.number().nonnegative().optional().nullable(), water_liters: z.coerce.number().nonnegative().optional().nullable(), notes: optionalText, status }),
  progress: z.object({ member_id: uuid, branch_id: uuid, measured_at: z.string().date(), weight_kg: z.coerce.number().positive().optional().nullable(), bmi: z.coerce.number().positive().optional().nullable(), body_fat_percent: z.coerce.number().min(0).max(100).optional().nullable(), muscle_mass_kg: z.coerce.number().nonnegative().optional().nullable(), waist_cm: z.coerce.number().nonnegative().optional().nullable(), chest_cm: z.coerce.number().nonnegative().optional().nullable(), arms_cm: z.coerce.number().nonnegative().optional().nullable(), legs_cm: z.coerce.number().nonnegative().optional().nullable(), progress_photo_urls: z.array(z.string().url()).default([]), notes: optionalText }),
  payments: z.object({ invoice_id: uuid.optional().nullable(), member_id: uuid, subscription_id: uuid.optional().nullable(), branch_id: uuid, amount: z.coerce.number().positive(), method: z.enum(["cash","upi","card","online"]), status: z.enum(["pending","completed","failed","refunded","partially_refunded","cancelled"]).optional(), transaction_reference: optionalText, paid_at: z.string().datetime().optional().nullable(), refund_amount: z.coerce.number().nonnegative().optional(), refund_reason: optionalText }),
  invoices: z.object({ member_id: uuid, subscription_id: uuid.optional().nullable(), branch_id: uuid, subtotal: z.coerce.number().nonnegative(), discount_amount: z.coerce.number().nonnegative().default(0), gst_amount: z.coerce.number().nonnegative().default(0), total_amount: z.coerce.number().nonnegative(), amount_paid: z.coerce.number().nonnegative().default(0), due_date: z.string().date().optional().nullable(), status: z.enum(["unpaid","partial","paid","void"]).optional(), line_items: z.array(z.record(z.unknown())).default([]), notes: optionalText }),
  notifications: z.object({ user_id: uuid.optional().nullable(), member_id: uuid.optional().nullable(), branch_id: uuid.optional().nullable(), type: z.string().min(2).max(80), title: z.string().min(2).max(160), message: z.string().min(2).max(2000), channels: z.array(z.enum(["dashboard","email","sms","whatsapp"])).default(["dashboard"]), scheduled_for: z.string().datetime().optional().nullable(), metadata: z.record(z.unknown()).default({}) }),
  equipment: z.object({ branch_id: uuid, machine_name: z.string().min(2).max(160), category: z.string().min(2).max(120), serial_number: optionalText, purchase_date: z.string().date().optional().nullable(), warranty_until: z.string().date().optional().nullable(), next_maintenance_date: z.string().date().optional().nullable(), status: z.enum(["operational","maintenance_due","under_maintenance","out_of_service","retired","inactive"]).optional(), notes: optionalText }),
  staff: z.object({ user_id: uuid, branch_id: uuid, employee_code: z.string().min(2).max(50), designation: z.string().min(2).max(120), joining_date: z.string().date(), salary: z.coerce.number().nonnegative(), leave_balance: z.coerce.number().nonnegative().optional(), status }),
  "face-machines": z.object({
    branch_id: uuid,
    machine_name: z.string().min(2).max(160),
    provider: z.enum(["generic", "essl"]).optional(),
    manufacturer: z.string().max(120).optional().nullable(),
    model: z.string().max(120).optional().nullable(),
    serial_number: z.string().max(120).optional().nullable(),
    device_identifier: z.string().max(120).optional().nullable(),
    connection_mode: z.enum(["push", "pull", "adms", "unknown"]).optional(),
    machine_ip: z.string().optional().nullable(),
    allowed_ip: z.string().optional().nullable(),
    machine_api_url: z.string().url().optional().nullable(),
    api_key_encrypted: z.string().max(500).optional().nullable(),
    device_id: z.string().min(1).max(100),
    status,
    settings: z.record(z.unknown()).optional()
  }),
} as const;

export type ResourceName = keyof typeof resourceSchemas;
export const resourceNames = Object.keys(resourceSchemas) as ResourceName[];
export const tableForResource: Record<ResourceName, string> = { "membership-plans": "membership_plans", subscriptions: "subscriptions", appointments: "appointments", trainers: "trainers", workouts: "workouts", "diet-plans": "diet_plans", progress: "progress", payments: "payments", invoices: "invoices", notifications: "notifications", equipment: "equipment", staff: "staff", "face-machines": "face_machine_settings" };

export function isResourceName(value: string): value is ResourceName { return resourceNames.includes(value as ResourceName); }
