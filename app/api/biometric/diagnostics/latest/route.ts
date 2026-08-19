import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  await requireUser(["admin", "manager"]);
  if (process.env.BIOMETRIC_DIAGNOSTIC_MODE !== "true") {
    return NextResponse.json({ error: "Diagnostic mode disabled." }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("attendance_sync_logs")
    .select("id,device_id,machine_user_id,event_type,event_at,processing_result,error_message,request_metadata,normalized_payload,event_received_at")
    .order("event_received_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}