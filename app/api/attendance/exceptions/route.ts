import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "manager", "reception"].includes(profile.role?.slug ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams;
  const resolutionStatus = q.get("resolutionStatus") ?? "open";
  const exceptionType = q.get("exceptionType");
  const page = Math.max(1, Number(q.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(q.get("pageSize") ?? 20)));

  const supabase = await createClient();
  let query = supabase
    .from("attendance_sync_logs")
    .select("id,branch_id,device_id,machine_user_id,event_type,event_at,status,error_message,exception_type,resolution_status,resolution_action,resolved_at,resolution_notes,attendance_id,machine:face_machine_settings(machine_name)", { count: "exact" })
    .or("status.in.(duplicate,unmatched,error,rejected),exception_type.not.is.null");

  if (profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  if (resolutionStatus !== "all") query = query.eq("resolution_status", resolutionStatus);
  if (exceptionType && exceptionType !== "all") query = query.eq("exception_type", exceptionType);

  const from = (page - 1) * pageSize;
  const { data, count, error } = await query.order("event_at", { ascending: false }).range(from, from + pageSize - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    data,
    page,
    pageSize,
    total: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  });
}
