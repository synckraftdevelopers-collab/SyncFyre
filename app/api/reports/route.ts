import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const reports = {
  members: {
    table: "member_register_view",
    columns: ["member_code","full_name","phone","email","member_status","branch_name","current_plan","subscription_status","joined_date"],
  },
  attendance: {
    table: "attendance_report_view",
    columns: ["attendance_date","member_code","full_name","entry_time_ist","exit_time_ist","duration_minutes","device_id","branch_name"],
  },
  payments: {
    table: "payment_report_view",
    columns: ["payment_date","member_code","full_name","invoice_number","plan_name","amount","refund_amount","net_amount","payment_method","payment_status","collected_by"],
  },
  memberships: {
    table: "membership_report_view",
    columns: ["member_code","full_name","plan_name","start_date","end_date","subscription_status","billed_price","discount_amount","gst_amount","total_amount","times_renewed"],
  },
  trainers: {
    table: "trainer_report_view",
    columns: ["trainer_name","branch_name","employee_code","designation","experience_years","active_assigned_members","active_workouts","upcoming_appointments"],
  },
  subscriptions: {
    table: "subscription_report_view",
    columns: ["branch_name","plan_name","duration_months","plan_price","active_count","expired_count","cancelled_count","pending_count","total_billed","total_collected"],
  },
  revenue: {
    table: "revenue_report_view",
    columns: ["revenue_month_label","branch_name","payment_method","plan_name","amount","refund_amount","net_amount","invoice_gst"],
  },
  pending_payments: {
    table: "pending_payment_report_view",
    columns: ["record_type","reference","member_code","full_name","plan_name","total_amount","amount_paid","balance_due","record_status","days_overdue"],
  },
  monthly_joining: {
    table: "monthly_joining_report_view",
    columns: ["join_date","join_month_label","member_code","full_name","branch_name","first_plan","plan_amount","first_payment_amount","current_status"],
  },
} as const;

function csv(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const name = request.nextUrl.searchParams.get("resource") ?? "members";
  if (!(name in reports)) return NextResponse.json({ error: "Unknown report" }, { status: 404 });

  const config = reports[name as keyof typeof reports];
  const supabase = await createClient();
  let query = supabase.from(config.table).select(config.columns.join(","));
  if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const body = [
    config.columns.map(csv).join(","),
    ...(data ?? []).map((row) => {
      const record = row as unknown as Record<string, unknown>;
      return config.columns.map((column) => csv(record[column])).join(",");
    }),
  ].join("\r\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="syncfyre-${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
