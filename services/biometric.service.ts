import { timingSafeEqual, createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  extractRequestDeviceCandidates,
  parseBiometricRequest,
} from "@/lib/biometric/essl";
import type {
  BiometricAttendanceEvent,
  BiometricEventProcessingSummary,
  BiometricProcessingResult,
  BiometricRequestMetadata,
  DeviceIdentificationResult,
  RegisteredBiometricDevice,
} from "@/lib/biometric/types";

type AttendanceRow = {
  id: string;
  member_id: string;
  branch_id: string;
  attendance_date: string;
  entry_time: string | null;
  exit_time: string | null;
};

type MemberLookupRow = {
  id: string;
  branch_id: string;
  member_code: string;
  machine_user_id: string | null;
  full_name: string;
  status: "active" | "inactive";
};

type SubscriptionRow = {
  id: string;
  status: "pending" | "active" | "expired" | "cancelled" | "paused";
  start_date: string;
  end_date: string;
};

function envBool(value: string | undefined) {
  return value === "true";
}

function duplicateWindowSeconds() {
  const raw = Number(process.env.BIOMETRIC_DUPLICATE_WINDOW_SECONDS ?? 90);
  return Number.isFinite(raw) && raw > 0 ? raw : 90;
}

function diagnosticModeEnabled() {
  return envBool(process.env.BIOMETRIC_DIAGNOSTIC_MODE);
}

function logStructured(event: string, payload: Record<string, unknown>) {
  console.info(JSON.stringify({ domain: "biometric", event, at: new Date().toISOString(), ...payload }));
}

function safeCompare(provided: string | null, expected: string | null) {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function buildRequestFingerprint(metadata: BiometricRequestMetadata, body: unknown) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        provider: metadata.provider,
        path: metadata.path,
        query: metadata.query,
        ipAddress: metadata.ipAddress,
        body,
      }),
    )
    .digest("hex");
}

function getAttendanceEventType(event: BiometricAttendanceEvent) {
  return event.eventType === "check_out" ? "exit" : "entry";
}

function eventDate(event: BiometricAttendanceEvent) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(event.timestamp);
}

function protocolResponse(body: string, status = 200) {
  return { body, status, headers: { "Content-Type": "text/plain; charset=utf-8" } };
}

function parseInlineKeyValueBody(rawBody: string) {
  const result: Record<string, string> = {};
  for (const line of rawBody.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    result[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return result;
}

async function findDeviceByField(field: "serial_number" | "device_identifier" | "device_id" | "id", candidate: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("face_machine_settings")
    .select("*")
    .eq("status", "active")
    .eq(field, candidate)
    .limit(1)
    .maybeSingle();
  return (data ?? null) as RegisteredBiometricDevice | null;
}

async function findDeviceByIp(ipAddress: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("face_machine_settings")
    .select("*")
    .eq("status", "active")
    .or(`machine_ip.eq.${ipAddress},allowed_ip.eq.${ipAddress}`)
    .limit(2);
  if (!data || data.length !== 1) return null;
  return data[0] as RegisteredBiometricDevice;
}

export async function resolveBiometricDevice(input: {
  payload: unknown;
  metadata: BiometricRequestMetadata;
}): Promise<DeviceIdentificationResult> {
  const inlineBody = parseInlineKeyValueBody(input.metadata.rawBody);
  const candidates = [
    ...extractRequestDeviceCandidates(input.metadata, input.payload),
    inlineBody.SN,
    inlineBody.sn,
    inlineBody.serial,
    inlineBody.device_id,
    inlineBody.device_identifier,
    inlineBody.machine_id,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const serialMatch = await findDeviceByField("serial_number", candidate);
    if (serialMatch) return { device: serialMatch, matchedBy: "serial_number", candidates };

    const identifierMatch = await findDeviceByField("device_identifier", candidate);
    if (identifierMatch) return { device: identifierMatch, matchedBy: "device_identifier", candidates };

    const deviceIdMatch = await findDeviceByField("device_id", candidate);
    if (deviceIdMatch) return { device: deviceIdMatch, matchedBy: "device_id", candidates };

    const machineIdMatch = await findDeviceByField("id", candidate);
    if (machineIdMatch) return { device: machineIdMatch, matchedBy: "machine_id", candidates };
  }

  if (input.metadata.ipAddress) {
    const device = await findDeviceByIp(input.metadata.ipAddress);
    if (device) {
      return {
        device,
        matchedBy: device.allowed_ip === input.metadata.ipAddress ? "allowed_ip" : "machine_ip",
        candidates,
      };
    }
  }

  return {
    device: null,
    reason: "No registered biometric device matched the incoming request.",
    candidates,
  };
}

async function validateDeviceSecurity(
  device: RegisteredBiometricDevice,
  metadata: BiometricRequestMetadata,
) {
  if (device.allowed_ip && metadata.ipAddress && device.allowed_ip !== metadata.ipAddress) {
    return { ok: false, reason: `Request IP ${metadata.ipAddress} is not allowed for this device.` };
  }

  const sharedSecret = process.env.BIOMETRIC_ADMS_SHARED_SECRET ?? null;
  const providedSecret =
    metadata.query.token ??
    metadata.query.secret ??
    metadata.query.key ??
    metadata.headers["x-biometric-token"] ??
    metadata.headers["x-api-key"] ??
    metadata.headers["authorization"] ??
    null;

  if (sharedSecret && providedSecret && !safeCompare(providedSecret.replace(/^Bearer\s+/i, ""), sharedSecret)) {
    return { ok: false, reason: "Shared secret validation failed." };
  }

  if (device.api_key_encrypted && providedSecret && !safeCompare(providedSecret.replace(/^Bearer\s+/i, ""), device.api_key_encrypted)) {
    return { ok: false, reason: "Device credential validation failed." };
  }

  return { ok: true };
}

async function findMembersByBiometricUserId(biometricUserId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("members")
    .select("id,branch_id,member_code,machine_user_id,full_name,status")
    .eq("machine_user_id", biometricUserId);
  if (error) throw new Error(error.message);
  return (data ?? []) as MemberLookupRow[];
}

async function findLatestSubscription(memberId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id,status,start_date,end_date")
    .eq("member_id", memberId)
    .order("end_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as SubscriptionRow | null;
}

async function findExactDuplicate(deviceId: string, externalEventId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("attendance_sync_logs")
    .select("id, attendance_id, processing_result")
    .eq("device_id", deviceId)
    .eq("external_event_id", externalEventId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function findWindowDuplicate(event: BiometricAttendanceEvent) {
  const supabase = createAdminClient();
  const windowSeconds = duplicateWindowSeconds();
  const start = new Date(event.timestamp.getTime() - windowSeconds * 1000).toISOString();
  const end = new Date(event.timestamp.getTime() + windowSeconds * 1000).toISOString();
  const { data, error } = await supabase
    .from("attendance_sync_logs")
    .select("id, attendance_id, external_event_id, event_at")
    .eq("device_id", event.deviceId)
    .eq("machine_user_id", event.biometricUserId)
    .eq("event_type", getAttendanceEventType(event))
    .in("status", ["processed", "duplicate"])
    .gte("event_at", start)
    .lte("event_at", end)
    .order("event_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function upsertAttendance(event: BiometricAttendanceEvent, member: MemberLookupRow) {
  const supabase = createAdminClient();
  const attendanceDate = eventDate(event);
  const payload = {
    member_id: member.id,
    branch_id: member.branch_id,
    device_id: event.deviceId,
    machine_user_id: event.biometricUserId,
    attendance_date: attendanceDate,
    source: "biometric",
    entry_time: event.eventType === "check_out" ? null : event.timestamp.toISOString(),
    exit_time: event.eventType === "check_out" ? event.timestamp.toISOString() : null,
  };

  const { data, error } = await supabase
    .from("attendance")
    .upsert(payload, { onConflict: "member_id,attendance_date" })
    .select("id,member_id,branch_id,attendance_date,entry_time,exit_time")
    .single();
  if (error) throw new Error(error.message);

  const row = data as AttendanceRow;
  const updatePatch =
    event.eventType === "check_out"
      ? {
          exit_time: row.exit_time
            ? new Date(Math.max(new Date(row.exit_time).getTime(), event.timestamp.getTime())).toISOString()
            : event.timestamp.toISOString(),
        }
      : {
          entry_time: row.entry_time
            ? new Date(Math.min(new Date(row.entry_time).getTime(), event.timestamp.getTime())).toISOString()
            : event.timestamp.toISOString(),
        };

  const { data: updated, error: updateError } = await supabase
    .from("attendance")
    .update(updatePatch)
    .eq("id", row.id)
    .select("id,member_id,branch_id,attendance_date,entry_time,exit_time")
    .single();
  if (updateError) throw new Error(updateError.message);
  return updated as AttendanceRow;
}

async function insertSyncLog(input: {
  device: RegisteredBiometricDevice | null;
  event: BiometricAttendanceEvent | null;
  status: "processed" | "duplicate" | "rejected" | "unmatched" | "error";
  processingResult: BiometricProcessingResult;
  requestMetadata: BiometricRequestMetadata;
  requestPayload: unknown;
  memberId?: string | null;
  attendanceId?: string | null;
  duplicateOfId?: string | null;
  errorMessage?: string | null;
  normalizedPayload?: Record<string, unknown> | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("attendance_sync_logs")
    .insert({
      machine_id: input.device?.id ?? null,
      branch_id: input.device?.branch_id ?? null,
      external_event_id: input.event?.eventId ?? buildRequestFingerprint(input.requestMetadata, input.requestPayload),
      device_id: input.event?.deviceId ?? input.device?.device_id ?? null,
      machine_user_id: input.event?.biometricUserId ?? null,
      event_type: input.event ? getAttendanceEventType(input.event) : "entry",
      event_at: input.event?.timestamp.toISOString() ?? input.requestMetadata.receivedAt.toISOString(),
      status: input.status,
      attendance_id: input.attendanceId ?? null,
      error_message: input.errorMessage ?? null,
      raw_payload: input.event?.rawPayload ?? input.requestPayload,
      provider: "essl",
      verification_method: input.event?.verificationMethod ?? "unknown",
      processing_result: input.processingResult,
      request_metadata: {
        method: input.requestMetadata.method,
        path: input.requestMetadata.path,
        url: input.requestMetadata.url,
        query: input.requestMetadata.query,
        ipAddress: input.requestMetadata.ipAddress,
        contentType: input.requestMetadata.contentType,
        headers: input.requestMetadata.headers,
      },
      normalized_payload: input.normalizedPayload ?? input.event?.normalizedPayload ?? null,
      event_received_at: input.requestMetadata.receivedAt.toISOString(),
      duplicate_of_id: input.duplicateOfId ?? null,
      member_id: input.memberId ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data?.id as string;
}

async function markDeviceSeen(device: RegisteredBiometricDevice, errorMessage?: string | null) {
  const supabase = createAdminClient();
  await supabase
    .from("face_machine_settings")
    .update({
      connection_status: errorMessage ? "error" : "online",
      last_seen_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
      last_error: errorMessage ?? null,
    })
    .eq("id", device.id);
}

async function storeDiagnosticRequest(metadata: BiometricRequestMetadata, payload: unknown, status: BiometricProcessingResult, message: string) {
  if (!diagnosticModeEnabled()) return;
  try {
    await insertSyncLog({
      device: null,
      event: null,
      status: "error",
      processingResult: status,
      requestMetadata: metadata,
      requestPayload: payload,
      errorMessage: message,
      normalizedPayload: { diagnostic: true, status, message },
    });
  } catch {
    // Best-effort diagnostics only.
  }
}

async function evaluateMemberStatus(
  event: BiometricAttendanceEvent,
  device: RegisteredBiometricDevice,
) {
  const matches = await findMembersByBiometricUserId(event.biometricUserId);
  const sameBranch = matches.find((row) => row.branch_id === device.branch_id);
  if (!sameBranch) {
    return {
      member: null,
      result: matches.length ? ("WRONG_BRANCH" as const) : ("MEMBER_NOT_FOUND" as const),
      message: matches.length
        ? "Biometric user is registered to another branch."
        : "Biometric user could not be matched to a member.",
    };
  }
  if (sameBranch.status !== "active") {
    return {
      member: sameBranch,
      result: "MEMBER_INACTIVE" as const,
      message: "Matched member is inactive.",
    };
  }

  const subscription = await findLatestSubscription(sameBranch.id);
  if (!subscription) {
    return {
      member: sameBranch,
      result: "MEMBERSHIP_EXPIRED" as const,
      message: "Member has no active subscription.",
    };
  }
  if (subscription.status === "paused") {
    return {
      member: sameBranch,
      result: "MEMBERSHIP_FROZEN" as const,
      message: "Member subscription is paused.",
    };
  }
  if (subscription.status !== "active" || subscription.end_date < eventDate(event)) {
    return {
      member: sameBranch,
      result: "MEMBERSHIP_EXPIRED" as const,
      message: "Member subscription is not valid for this attendance event.",
    };
  }

  return { member: sameBranch, result: "SUCCESS" as const, message: undefined };
}

export async function processBiometricAttendanceEvent(input: {
  event: BiometricAttendanceEvent;
  device: RegisteredBiometricDevice;
  metadata: BiometricRequestMetadata;
  requestPayload: unknown;
}): Promise<BiometricEventProcessingSummary> {
  const exactDuplicate = await findExactDuplicate(input.device.device_id, input.event.eventId);
  if (exactDuplicate) {
    logStructured("DUPLICATE_EVENT", {
      deviceId: input.event.deviceId,
      eventId: input.event.eventId,
      duplicateOfId: exactDuplicate.id,
      mode: "exact",
    });
    return {
      eventId: input.event.eventId,
      status: "DUPLICATE_EVENT",
      attendanceId: exactDuplicate.attendance_id ?? undefined,
      duplicateOfId: exactDuplicate.id,
      message: "Event was already processed.",
    };
  }

  const windowDuplicate = await findWindowDuplicate(input.event);
  if (windowDuplicate) {
    await insertSyncLog({
      device: input.device,
      event: input.event,
      status: "duplicate",
      processingResult: "DUPLICATE_EVENT",
      requestMetadata: input.metadata,
      requestPayload: input.requestPayload,
      attendanceId: windowDuplicate.attendance_id ?? null,
      duplicateOfId: windowDuplicate.id,
    });
    logStructured("DUPLICATE_EVENT", {
      deviceId: input.event.deviceId,
      eventId: input.event.eventId,
      duplicateOfId: windowDuplicate.id,
      mode: "window",
    });
    return {
      eventId: input.event.eventId,
      status: "DUPLICATE_EVENT",
      attendanceId: windowDuplicate.attendance_id ?? undefined,
      duplicateOfId: windowDuplicate.id,
      message: "Duplicate biometric event within configured time window.",
    };
  }

  const evaluation = await evaluateMemberStatus(input.event, input.device);
  if (evaluation.result !== "SUCCESS" || !evaluation.member) {
    await insertSyncLog({
      device: input.device,
      event: input.event,
      status: evaluation.result === "MEMBER_NOT_FOUND" ? "unmatched" : "rejected",
      processingResult: evaluation.result,
      requestMetadata: input.metadata,
      requestPayload: input.requestPayload,
      memberId: evaluation.member?.id ?? null,
      errorMessage: evaluation.message,
    });
    logStructured(evaluation.result, {
      deviceId: input.event.deviceId,
      biometricUserId: input.event.biometricUserId,
      branchId: input.device.branch_id,
    });
    return {
      eventId: input.event.eventId,
      status: evaluation.result,
      message: evaluation.message,
    };
  }

  const attendance = await upsertAttendance(input.event, evaluation.member);
  await insertSyncLog({
    device: input.device,
    event: input.event,
    status: "processed",
    processingResult: "SUCCESS",
    requestMetadata: input.metadata,
    requestPayload: input.requestPayload,
    memberId: evaluation.member.id,
    attendanceId: attendance.id,
  });

  logStructured("ATTENDANCE_SUCCESS", {
    deviceId: input.event.deviceId,
    eventId: input.event.eventId,
    attendanceId: attendance.id,
    verificationMethod: input.event.verificationMethod,
  });

  return {
    eventId: input.event.eventId,
    status: "SUCCESS",
    attendanceId: attendance.id,
  };
}

export async function processBiometricPayload(input: {
  payload: unknown;
  metadata: BiometricRequestMetadata;
}) {
  logStructured("DEVICE_REQUEST_RECEIVED", {
    method: input.metadata.method,
    path: input.metadata.path,
    ipAddress: input.metadata.ipAddress,
    query: input.metadata.query,
    contentType: input.metadata.contentType,
  });

  const identified = await resolveBiometricDevice(input);
  if (!identified.device) {
    logStructured("DEVICE_NOT_REGISTERED", {
      reason: identified.reason,
      candidates: identified.candidates,
      ipAddress: input.metadata.ipAddress,
    });
    await storeDiagnosticRequest(input.metadata, input.payload, "DEVICE_NOT_REGISTERED", identified.reason ?? "Unregistered device");
    return {
      device: null,
      requestId: buildRequestFingerprint(input.metadata, input.payload),
      results: [
        {
          eventId: buildRequestFingerprint(input.metadata, input.payload),
          status: "DEVICE_NOT_REGISTERED" as const,
          message: identified.reason,
        },
      ],
      protocolResponse: protocolResponse("OK"),
    };
  }

  const device = identified.device;
  logStructured("DEVICE_RESOLVED", {
    deviceId: device.device_id,
    matchedBy: identified.matchedBy,
    branchId: device.branch_id,
  });

  const security = await validateDeviceSecurity(device, input.metadata);
  if (!security.ok) {
    await markDeviceSeen(device, security.reason);
    await insertSyncLog({
      device,
      event: null,
      status: "error",
      processingResult: "DEVICE_NOT_REGISTERED",
      requestMetadata: input.metadata,
      requestPayload: input.payload,
      errorMessage: security.reason,
      normalizedPayload: { securityRejected: true },
    });
    return {
      device,
      requestId: buildRequestFingerprint(input.metadata, input.payload),
      results: [
        {
          eventId: buildRequestFingerprint(input.metadata, input.payload),
          status: "DEVICE_NOT_REGISTERED" as const,
          message: security.reason,
        },
      ],
      protocolResponse: protocolResponse("OK"),
    };
  }

  const parsed = parseBiometricRequest({ payload: input.payload, metadata: input.metadata, device });
  logStructured("ATTENDANCE_PARSED", {
    deviceId: device.device_id,
    detectedFormat: parsed.detectedFormat,
    eventCount: parsed.events.length,
    unknownFields: parsed.unknownFields,
  });

  if (!parsed.events.length) {
    const message = "No biometric events could be parsed from the request.";
    await markDeviceSeen(device, message);
    await insertSyncLog({
      device,
      event: null,
      status: "error",
      processingResult: "INVALID_PAYLOAD",
      requestMetadata: input.metadata,
      requestPayload: parsed.requestPayload,
      errorMessage: message,
      normalizedPayload: {
        detectedFormat: parsed.detectedFormat,
        diagnostics: parsed.diagnostics,
      },
    });
    logStructured("INVALID_PAYLOAD", {
      deviceId: device.device_id,
      detectedFormat: parsed.detectedFormat,
    });
    return {
      device,
      requestId: buildRequestFingerprint(input.metadata, input.payload),
      results: [
        {
          eventId: buildRequestFingerprint(input.metadata, input.payload),
          status: "INVALID_PAYLOAD" as const,
          message,
        },
      ],
      protocolResponse: protocolResponse("OK"),
    };
  }

  const results: BiometricEventProcessingSummary[] = [];

  for (const event of parsed.events) {
    try {
      const summary = await processBiometricAttendanceEvent({
        event,
        device,
        metadata: input.metadata,
        requestPayload: parsed.requestPayload,
      });
      results.push(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown biometric processing error";
      await markDeviceSeen(device, message);
      try {
        await insertSyncLog({
          device,
          event,
          status: "error",
          processingResult: "PROCESSING_ERROR",
          requestMetadata: input.metadata,
          requestPayload: parsed.requestPayload,
          errorMessage: message,
        });
      } catch {
        // Preserve the original error result.
      }
      logStructured("PROCESSING_ERROR", {
        deviceId: event.deviceId,
        eventId: event.eventId,
        error: message,
      });
      results.push({ eventId: event.eventId, status: "PROCESSING_ERROR", message });
    }
  }

  await markDeviceSeen(device, null);
  return {
    device,
    requestId: buildRequestFingerprint(input.metadata, input.payload),
    results,
    protocolResponse: protocolResponse("OK"),
  };
}

export function biometricMockEnabled() {
  return envBool(process.env.BIOMETRIC_MOCK_MODE);
}