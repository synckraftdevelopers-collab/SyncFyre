import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { buildEsslMockPayload } from "@/lib/biometric/essl";
import { createAdminClient } from "@/lib/supabase/admin";
import { biometricMockEnabled, processBiometricPayload } from "@/services/biometric.service";

const scenarios: Record<string, Record<string, unknown>> = {
  device_registration: { raw: "SN=ERIS-001" },
  heartbeat: { raw: "OPLOG\nPing=1" },
  valid_face: { userId: "MEMBER_TEST_001", verificationMethod: "face", eventType: "check_in" },
  unknown_member: { userId: "UNKNOWN_MEMBER_404", verificationMethod: "face", eventType: "check_in" },
  inactive_member: { userId: "MEMBER_INACTIVE_001", verificationMethod: "face", eventType: "check_in" },
  expired_membership: { userId: "MEMBER_EXPIRED_001", verificationMethod: "face", eventType: "check_in" },
  wrong_branch: { userId: "MEMBER_OTHER_BRANCH_001", verificationMethod: "face", eventType: "check_in" },
  duplicate_scan: { userId: "MEMBER_TEST_001", verificationMethod: "face", eventType: "check_in", event_id: "duplicate-event-fixed" },
  invalid_payload: { timestamp: "invalid-date", verificationMethod: "face", eventType: "check_in" },
  unknown_verification_mode: { userId: "MEMBER_TEST_001", verificationMethod: "17", eventType: "check_in" },
  multiple_events: {
    events: [
      { userId: "MEMBER_TEST_001", timestamp: new Date().toISOString(), verificationMethod: "face", eventType: "check_in" },
      { userId: "UNKNOWN_MEMBER_404", timestamp: new Date().toISOString(), verificationMethod: "5", eventType: "check_in" },
    ],
  },
  adms_attlog: {
    raw: `ATTLOG\nMEMBER_TEST_001 ${new Date().toISOString().slice(0, 19).replace("T", " ")} 5 0`,
  },
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser(["admin", "manager"]);
  if (!biometricMockEnabled()) {
    return NextResponse.json({ error: "Biometric mock mode is disabled." }, { status: 403 });
  }

  const { id } = await params;
  const admin = createAdminClient();
  const { data: device } = await admin
    .from("face_machine_settings")
    .select("id, device_id, serial_number, provider, status")
    .eq("id", id)
    .maybeSingle();

  if (!device) {
    return NextResponse.json({ error: "Biometric device not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { scenario?: string };
  const scenario = body.scenario && scenarios[body.scenario] ? body.scenario : "valid_face";
  const chosen = scenarios[scenario];
  const metadata = {
    provider: "essl" as const,
    receivedAt: new Date(),
    contentType: chosen.raw ? "text/plain" : "application/json",
    method: "POST",
    path: `/api/biometric/devices/${id}/mock`,
    url: `mock://biometric/devices/${id}`,
    query: { scenario },
    ipAddress: null,
    headers: { "x-device-id": device.device_id },
    rawBody: typeof chosen.raw === "string" ? chosen.raw : JSON.stringify(chosen),
  };

  const payload =
    scenario === "multiple_events"
      ? {
          events: (chosen.events as Record<string, unknown>[]).map((event) => ({
            device_id: device.device_id,
            serial_number: device.serial_number,
            ...event,
          })),
        }
      : chosen.raw
        ? { device_id: device.device_id, serial_number: device.serial_number, raw: chosen.raw }
        : {
            ...buildEsslMockPayload({
              device_id: device.device_id,
              serial_number: device.serial_number,
              ...chosen,
            }),
          };

  const outcome = await processBiometricPayload({ payload, metadata });
  return NextResponse.json({ scenario, results: outcome.results });
}