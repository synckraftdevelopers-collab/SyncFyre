import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { attendanceBatchSchema } from "@/lib/validations/attendance";

function validSecret(provided: string | null) {
  const expected = process.env.ATTENDANCE_SYNC_SECRET;
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!validSecret(request.headers.get("x-sync-secret"))) return NextResponse.json({ error: "Unauthorized machine" }, { status: 401 });
  const parsed = attendanceBatchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 422 });

  const supabase = createAdminClient();
  const results: { external_event_id: string; status: string; error?: string; attendance_id?: string }[] = [];

  for (const event of parsed.data.events) {
    const { data, error } = await supabase.rpc("process_attendance_event", {
      p_device_id: event.device_id,
      p_machine_user_id: event.machine_user_id,
      p_event_at: event.event_at,
      p_event_type: event.event_type,
      p_external_event_id: event.external_event_id,
      p_raw: event,
    });
    const result = error ? { status: "error", error: error.message } : data as { status: string; attendance_id?: string };
    results.push({ external_event_id: event.external_event_id, ...result });
  }

  const failed = results.filter((r) => r.status === "error").length;
  await supabase.from("activity_logs").insert({
    action: "attendance_synced",
    entity_type: "attendance_sync",
    entity_id: new Date().toISOString(),
    description: `Processed ${results.length} attendance events`,
    changes: {
      processed: results.length - failed,
      failed,
      duplicate: results.filter((r) => r.status === "duplicate").length,
      unmatched: results.filter((r) => r.status === "unmatched").length,
    },
  });

  return NextResponse.json({ processed: results.length - failed, failed, results }, { status: failed === results.length ? 502 : 200 });
}
