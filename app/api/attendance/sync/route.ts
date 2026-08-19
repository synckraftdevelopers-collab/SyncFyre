import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { attendanceBatchSchema } from "@/lib/validations/attendance";
import { processBiometricPayload } from "@/services/biometric.service";

function validSecret(provided: string | null) {
  const expected = process.env.ATTENDANCE_SYNC_SECRET;
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!validSecret(request.headers.get("x-sync-secret"))) {
    return NextResponse.json({ error: "Unauthorized machine" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = attendanceBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 422 });
  }

  const legacyPayload = {
    events: parsed.data.events.map((event) => ({
      device_id: event.device_id,
      machine_user_id: event.machine_user_id,
      event_at: event.event_at,
      event_type: event.event_type === "entry" ? "check_in" : "check_out",
      verificationMethod: "unknown",
      external_event_id: event.external_event_id,
      userId: event.machine_user_id,
      timestamp: event.event_at,
    })),
  };

  const outcome = await processBiometricPayload({
    payload: legacyPayload,
    metadata: {
      provider: "essl",
      receivedAt: new Date(),
      contentType: request.headers.get("content-type"),
      method: request.method,
      path: request.nextUrl.pathname,
      url: request.url,
      query: Object.fromEntries(request.nextUrl.searchParams.entries()),
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      headers: { "x-sync-secret": "[redacted]" },
      rawBody: JSON.stringify(body),
    },
  });

  const failed = outcome.results.filter((result) => result.status === "PROCESSING_ERROR").length;
  return NextResponse.json(
    {
      processed: outcome.results.length - failed,
      failed,
      results: outcome.results,
    },
    { status: failed === outcome.results.length ? 502 : 200 },
  );
}