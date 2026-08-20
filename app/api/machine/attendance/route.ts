import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMachineSessionFromRequest } from "@/lib/machine/auth";
import { processBiometricPayload } from "@/services/biometric.service";

export async function POST(request: NextRequest) {
  const session = await getMachineSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Machine authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { deviceId?: unknown; biometricUserId?: unknown; eventType?: unknown } | null;
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId.trim() : "";
  const biometricUserId = typeof body?.biometricUserId === "string" ? body.biometricUserId.trim() : "";
  const eventType = body?.eventType === "check_out" ? "check_out" : body?.eventType === "check_in" ? "check_in" : null;
  if (!deviceId || !biometricUserId || !eventType) return NextResponse.json({ error: "Invalid terminal attendance request." }, { status: 422 });
  const admin = createAdminClient();
  const { data: machine } = await admin.from("face_machine_settings").select("id").eq("id", session.machineId).eq("branch_id", session.branchId).eq("device_id", deviceId).eq("status", "active").maybeSingle();
  if (!machine) return NextResponse.json({ error: "This terminal is not assigned to this device session." }, { status: 403 });
  const now = new Date();
  const outcome = await processBiometricPayload({ payload: { events: [{ device_id: deviceId, userId: biometricUserId, timestamp: now.toISOString(), eventType, verificationMethod: "face" }] }, metadata: { provider: "essl", receivedAt: now, contentType: "application/json", method: request.method, path: request.nextUrl.pathname, url: request.url, query: {}, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, headers: {}, rawBody: "[machine terminal event]" } });
  const result = outcome.results[0];
  return NextResponse.json({ result }, { status: result?.status === "PROCESSING_ERROR" ? 502 : 200 });
}