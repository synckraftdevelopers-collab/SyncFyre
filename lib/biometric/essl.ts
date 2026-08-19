import { createHash } from "node:crypto";
import type {
  BiometricAttendanceEvent,
  BiometricEventType,
  BiometricRequestMetadata,
  BiometricRequestSource,
  BiometricVerificationMethod,
  ParsedBiometricPayload,
  ParsedBiometricRequest,
  RegisteredBiometricDevice,
} from "@/lib/biometric/types";

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(input: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function parseTimestamp(raw: string | null) {
  if (!raw) return null;
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readTimestamp(input: Record<string, unknown>) {
  return parseTimestamp(
    readString(input, [
      "timestamp",
      "event_at",
      "eventAt",
      "time",
      "punch_time",
      "checktime",
      "check_time",
    ]),
  );
}

const verificationModeMap: Record<string, BiometricVerificationMethod> = {
  "1": "fingerprint",
  "2": "card",
  "3": "password",
  "4": "card",
  "5": "face",
  "6": "face",
  "7": "face",
  "8": "card",
  "9": "unknown",
  fp: "fingerprint",
  face: "face",
  fingerprint: "fingerprint",
  card: "card",
  password: "password",
  pin: "password",
};

const eventTypeMap: Record<string, BiometricEventType> = {
  "0": "check_in",
  "1": "check_out",
  entry: "check_in",
  check_in: "check_in",
  checkin: "check_in",
  in: "check_in",
  punch_in: "check_in",
  exit: "check_out",
  check_out: "check_out",
  checkout: "check_out",
  out: "check_out",
  punch_out: "check_out",
};

function normalizeVerificationMethod(value: string | null): BiometricVerificationMethod {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) return "unknown";
  if (verificationModeMap[normalized]) return verificationModeMap[normalized];
  if (normalized.includes("face")) return "face";
  if (normalized.includes("finger")) return "fingerprint";
  if (normalized.includes("card")) return "card";
  if (normalized.includes("password") || normalized.includes("pin")) return "password";
  return "unknown";
}

function normalizeEventType(value: string | null): BiometricEventType {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) return "unknown";
  return eventTypeMap[normalized] ?? "unknown";
}

function eventIdFor(event: {
  deviceId: string;
  biometricUserId: string;
  timestamp: Date;
  eventType: BiometricEventType;
  verificationMethod: BiometricVerificationMethod;
  externalEventId?: string | null;
}) {
  if (event.externalEventId) return event.externalEventId;
  return createHash("sha256")
    .update(
      [
        event.deviceId,
        event.biometricUserId,
        event.timestamp.toISOString(),
        event.eventType,
        event.verificationMethod,
      ].join("|"),
    )
    .digest("hex");
}

function extractUnknownFields(record: Record<string, unknown>) {
  const known = new Set([
    "userId",
    "user_id",
    "machine_user_id",
    "employeeCode",
    "employee_code",
    "pin",
    "pin2",
    "uid",
    "timestamp",
    "event_at",
    "eventAt",
    "time",
    "punch_time",
    "checktime",
    "check_time",
    "verificationMethod",
    "verify_mode",
    "verifyMode",
    "verify",
    "eventType",
    "event_type",
    "punch_state",
    "status",
    "deviceId",
    "device_id",
    "terminal_id",
    "terminalId",
    "deviceSerial",
    "serial",
    "serial_number",
    "sn",
    "external_event_id",
    "event_id",
    "id",
  ]);
  return Object.keys(record).filter((key) => !known.has(key));
}

function normalizeRecord(input: {
  record: Record<string, unknown>;
  receivedAt: Date;
  source: BiometricRequestSource;
  device?: RegisteredBiometricDevice | null;
  requestDeviceId?: string | null;
  requestSerial?: string | null;
}) {
  const biometricUserId = readString(input.record, [
    "userId",
    "user_id",
    "machine_user_id",
    "employeeCode",
    "employee_code",
    "pin",
    "pin2",
    "uid",
  ]);
  const timestamp = readTimestamp(input.record);

  if (!biometricUserId || !timestamp) {
    return { event: null, unknownFields: extractUnknownFields(input.record) };
  }

  const verificationMethod = normalizeVerificationMethod(
    readString(input.record, ["verificationMethod", "verify_mode", "verifyMode", "verify"]),
  );
  const eventType = normalizeEventType(
    readString(input.record, ["eventType", "event_type", "punch_state", "status"]),
  );
  const externalEventId = readString(input.record, ["external_event_id", "event_id", "id"]);
  const deviceId =
    readString(input.record, ["deviceId", "device_id", "terminal_id", "terminalId"]) ??
    input.requestDeviceId ??
    input.device?.device_id ??
    "unknown-device";
  const deviceSerial =
    readString(input.record, ["deviceSerial", "serial", "serial_number", "sn"]) ??
    input.requestSerial ??
    input.device?.serial_number ??
    null;

  const event: BiometricAttendanceEvent = {
    eventId: eventIdFor({
      deviceId,
      biometricUserId,
      timestamp,
      eventType,
      verificationMethod,
      externalEventId,
    }),
    deviceId,
    deviceSerial,
    biometricUserId,
    timestamp,
    verificationMethod,
    eventType,
    rawPayload: input.record,
    normalizedPayload: {
      externalEventId,
      biometricUserId,
      timestamp: timestamp.toISOString(),
      verificationMethod,
      eventType,
      source: input.source,
      deviceId,
      deviceSerial,
    },
    source: input.source,
    receivedAt: input.receivedAt,
  };

  return { event, unknownFields: extractUnknownFields(input.record) };
}

function parseAdmsLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("OPERLOG") || trimmed.startsWith("OPLOG")) return null;
  const parts = trimmed.split(/\s+/);
  if (parts.length < 4) return null;

  const maybeDate = `${parts[1] ?? ""} ${parts[2] ?? ""}`;
  if (!parseTimestamp(maybeDate)) return null;

  return {
    userId: parts[0],
    timestamp: maybeDate,
    verificationMethod: parts[3] ?? "unknown",
    eventType: parts[4] ?? "unknown",
    workCode: parts[5] ?? null,
  } satisfies Record<string, unknown>;
}

function parseJsonPayload(
  payload: unknown,
  receivedAt: Date,
  requestDeviceId: string | null,
  requestSerial: string | null,
  device?: RegisteredBiometricDevice | null,
): ParsedBiometricPayload {
  const root = asObject(payload);
  const candidateEvents = Array.isArray(root?.events)
    ? root.events
    : Array.isArray(root?.rows)
      ? root.rows
      : Array.isArray(root?.attlogs)
        ? root.attlogs
        : Array.isArray(payload)
          ? payload
          : [payload];

  const events: BiometricAttendanceEvent[] = [];
  const unknownFields = new Set<string>();

  for (const item of candidateEvents) {
    const record = asObject(item);
    if (!record) continue;
    const normalized = normalizeRecord({
      record,
      receivedAt,
      source: "json",
      device,
      requestDeviceId,
      requestSerial,
    });
    normalized.unknownFields.forEach((field) => unknownFields.add(field));
    if (normalized.event) events.push(normalized.event);
  }

  return {
    events,
    unknownFields: [...unknownFields],
    detectedFormat: "json",
    diagnostics: { candidateCount: candidateEvents.length },
  };
}

function parseAdmsPayload(
  rawBody: string,
  receivedAt: Date,
  requestDeviceId: string | null,
  requestSerial: string | null,
  device?: RegisteredBiometricDevice | null,
): ParsedBiometricPayload {
  const lines = rawBody
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const events: BiometricAttendanceEvent[] = [];
  const unknownFields = new Set<string>();
  let parseableLines = 0;

  for (const line of lines) {
    const parsed = parseAdmsLine(line);
    if (!parsed) continue;
    parseableLines += 1;
    const normalized = normalizeRecord({
      record: parsed,
      receivedAt,
      source: "adms",
      device,
      requestDeviceId,
      requestSerial,
    });
    normalized.unknownFields.forEach((field) => unknownFields.add(field));
    if (normalized.event) {
      normalized.event.rawPayload = line;
      events.push(normalized.event);
    }
  }

  return {
    events,
    unknownFields: [...unknownFields],
    detectedFormat: "adms_text",
    diagnostics: { lineCount: lines.length, parseableLines },
  };
}

export function extractDeviceCandidates(payload: unknown) {
  const root = asObject(payload);
  if (!root) return [];
  const candidates = [
    readString(root, ["device_id", "deviceId", "terminal_id", "terminalId", "DeviceID"]),
    readString(root, ["device_identifier", "deviceIdentifier"]),
    readString(root, ["serial", "serial_number", "sn", "deviceSerial", "SN"]),
    readString(root, ["machine_id", "machineId", "id"]),
  ].filter((value): value is string => Boolean(value));
  return [...new Set(candidates)];
}

export function extractRequestDeviceCandidates(metadata: BiometricRequestMetadata, payload?: unknown) {
  const queryCandidates = [
    metadata.query.SN,
    metadata.query.sn,
    metadata.query.serial,
    metadata.query.serial_number,
    metadata.query.device_id,
    metadata.query.deviceId,
    metadata.query.device_identifier,
    metadata.query.machine_id,
  ].filter((value): value is string => Boolean(value));

  const bodyCandidates = payload ? extractDeviceCandidates(payload) : [];
  const headerCandidates = [
    metadata.headers["x-device-id"],
    metadata.headers["x-device-identifier"],
    metadata.headers["x-device-serial"],
  ].filter((value): value is string => Boolean(value));

  return [...new Set([...headerCandidates, ...queryCandidates, ...bodyCandidates])];
}

export function parseEsslPayload(
  payload: unknown,
  device: RegisteredBiometricDevice,
  receivedAt: Date,
): ParsedBiometricPayload {
  return parseJsonPayload(payload, receivedAt, device.device_id, device.serial_number ?? null, device);
}

export function parseBiometricRequest(input: {
  payload: unknown;
  metadata: BiometricRequestMetadata;
  device?: RegisteredBiometricDevice | null;
}): ParsedBiometricRequest {
  const requestDeviceId =
    input.metadata.query.device_id ??
    input.metadata.query.deviceId ??
    input.metadata.query.DeviceID ??
    null;
  const requestSerial =
    input.metadata.query.SN ??
    input.metadata.query.sn ??
    input.metadata.query.serial ??
    input.metadata.query.serial_number ??
    null;

  const rawBody = input.metadata.rawBody.trim();
  const contentType = input.metadata.contentType?.toLowerCase() ?? "";

  let parsed: ParsedBiometricPayload;
  if (contentType.includes("application/json") || Array.isArray(input.payload) || asObject(input.payload)?.events) {
    parsed = parseJsonPayload(input.payload, input.metadata.receivedAt, requestDeviceId, requestSerial, input.device);
  } else if (rawBody && (rawBody.includes("\n") || rawBody.startsWith("ATTLOG") || rawBody.includes("OPERLOG"))) {
    parsed = parseAdmsPayload(rawBody, input.metadata.receivedAt, requestDeviceId, requestSerial, input.device);
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    parsed = parseJsonPayload(input.payload, input.metadata.receivedAt, requestDeviceId, requestSerial, input.device);
    parsed.detectedFormat = "form";
  } else if (Object.keys(input.metadata.query).length > 0 && !rawBody) {
    parsed = parseJsonPayload(input.metadata.query, input.metadata.receivedAt, requestDeviceId, requestSerial, input.device);
    parsed.detectedFormat = "query";
  } else if (rawBody) {
    parsed = parseAdmsPayload(rawBody, input.metadata.receivedAt, requestDeviceId, requestSerial, input.device);
    if (!parsed.events.length) {
      parsed = parseJsonPayload(input.payload, input.metadata.receivedAt, requestDeviceId, requestSerial, input.device);
    }
  } else {
    parsed = {
      events: [],
      unknownFields: [],
      detectedFormat: "unknown",
      diagnostics: { reason: "Empty request body and no query event fields" },
    };
  }

  return {
    ...parsed,
    requestPayload: input.payload,
  };
}

export function buildEsslMockPayload(overrides: Record<string, unknown> = {}) {
  return {
    userId: "MEMBER_TEST_001",
    timestamp: new Date().toISOString(),
    verificationMethod: "face",
    eventType: "check_in",
    ...overrides,
  };
}