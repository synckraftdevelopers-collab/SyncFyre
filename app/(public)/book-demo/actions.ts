"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export type DemoBookingState = { error?: string; success?: string };

const demoBookingSchema = z.object({
  gymName: z.string().trim().min(1).max(160),
  ownerName: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(5).max(30),
  branchCount: z.coerce.number().int().min(1).max(999),
  message: z.string().trim().max(1000).optional(),
});

export async function bookDemoAction(_: DemoBookingState, formData: FormData): Promise<DemoBookingState> {
  const parsed = demoBookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please complete all required fields with valid information." };

  try {
    const { gymName, ownerName, email, phone, branchCount, message } = parsed.data;
    const supabase = createAdminClient();
    const { error } = await supabase.from("demo_bookings").insert({
      gym_name: gymName,
      contact_name: ownerName,
      email,
      phone,
      city: "Not provided",
      business_type: "gym",
      location_count: branchCount,
      member_count: 0,
      current_software: "Not provided",
      migration_urgency: "Not provided",
      preferred_date: new Date().toISOString().slice(0, 10),
      preferred_time: "Not provided",
      notes: [`Number of branches: ${branchCount}`, message].filter(Boolean).join("\n"),
      source: "book-demo",
    });

    if (error) {
      console.error("[bookDemoAction]", error);
      return { error: "Unable to submit your request right now. Please try again." };
    }
    return { success: "Thanks—your demo request has been received. Our team will be in touch." };
  } catch (error) {
    console.error("[bookDemoAction]", error);
    return { error: "Unable to connect. Please check your internet connection and try again." };
  }
}
