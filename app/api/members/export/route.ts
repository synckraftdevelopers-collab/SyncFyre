import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function csv(value: unknown) {
  const valueText = value == null ? "" : String(value);
  return `"${valueText.replaceAll('"', '""')}"`;
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  let query = supabase
    .from("member_register_view")
    .select("member_code,full_name,gender,date_of_birth,phone,email,height_cm,weight_kg,blood_group,fitness_goal,member_status,current_plan,subscription_status,joined_date")
    .order("joined_date", { ascending: false });
  if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const headers = ["Member ID","Full Name","Gender","DOB","Phone","Email","Height (cm)","Weight (kg)","Blood Group","Fitness Goal","Status","Current Plan","Subscription Status","Joined Date"];
  const keys = ["member_code","full_name","gender","date_of_birth","phone","email","height_cm","weight_kg","blood_group","fitness_goal","member_status","current_plan","subscription_status","joined_date"] as const;
  const body = [headers.map(csv).join(","), ...(data ?? []).map((row) => keys.map((key) => csv(row[key])).join(","))].join("\r\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="syncfyre-members-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
