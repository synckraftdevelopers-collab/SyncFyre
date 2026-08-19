export type BiometricVerificationMethod =
  | "face"
  | "fingerprint"
  | "card"
  | "password"
  | "unknown";

export type BiometricEventType = "check_in" | "check_out" | "unknown";

export type BiometricProcessingResult =
  | "SUCCESS"
  | "MEMBER_NOT_FOUND"
  | "MEMBER_INACTIVE"
  | "MEMBERSHIP_EXPIRED"
  | "MEMBERSHIP_FROZEN"
  | "WRONG_BRANCH"
  | "DUPLICATE_EVENT"
  | "DEVICE_NOT_REGISTERED"
  | "INVALID_PAYLOAD"
  | "PROCESSING_ERROR";

export type BiometricRequestSource = "essl" | "adms" | "json" | "form" | "query" | "unknown";

export interface BiometricAttendanceEvent {
  eventId: string;
  deviceId: string;
  deviceSerial?: string | null;
  biometricUserId: string;
  timestamp: Date;
  verificationMethod: BiometricVerificationMethod;
  eventType: BiometricEventType;
  rawPayload: unknown;
  normalizedPayload?: Record<string, unknown> | null;
  source: BiometricRequestSource;
  receivedAt: Date;
}

export interface RegisteredBiometricDevice {
  id: string;
  branch_id: string;
  machine_name: string;
  device_id: string;
  provider: "generic" | "essl";
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  device_identifier: string | null;
  machine_ip: string | null;
  allowed_ip: string | null;
  connection_mode: "push" | "pull" | "adms" | "unknown";
  machine_api_url: string | null;
  api_key_encrypted: string | null;
  status: "active" | "inactive";
  connection_status: "unknown" | "online" | "offline" | "error";
  last_seen_at?: string | null;
  last_sync_at?: string | null;
  last_error?: string | null;
  settings: Record<string, unknown> | null;
}

export interface BiometricRequestMetadata {
  provider: "essl";
  receivedAt: Date;
  contentType: string | null;
  method: string;
  path: string;
  url: string;
  query: Record<string, string>;
  ipAddress: string | null;
  headers: Record<string, string>;
  rawBody: string;
}

export interface BiometricEventProcessingSummary {
  eventId: string;
  status: BiometricProcessingResult;
  attendanceId?: string;
  duplicateOfId?: string;
  message?: string;
}

export interface DeviceIdentificationResult {
  device: RegisteredBiometricDevice | null;
  reason?: string;
  matchedBy?:
    | "device_id"
    | "device_identifier"
    | "serial_number"
    | "machine_id"
    | "machine_ip"
    | "allowed_ip";
  candidates?: string[];
}

export interface ParsedBiometricPayload {
  events: BiometricAttendanceEvent[];
  unknownFields: string[];
  detectedFormat: "json" | "adms_text" | "form" | "query" | "unknown";
  diagnostics: Record<string, unknown>;
}

export interface ParsedBiometricRequest {
  events: BiometricAttendanceEvent[];
  unknownFields: string[];
  detectedFormat: "json" | "adms_text" | "form" | "query" | "unknown";
  diagnostics: Record<string, unknown>;
  requestPayload: unknown;
}