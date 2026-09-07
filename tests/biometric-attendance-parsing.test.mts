import test from "node:test";
import assert from "node:assert/strict";
import {
  extractDeviceCandidates,
  extractRequestDeviceCandidates,
  parseBiometricRequest,
} from "../lib/biometric/essl.ts";

/**
 * dev-task-split.md Phase 6 (#34): "integration tests for attendance sync
 * (idempotency, batch, unmatched)". `services/biometric.service.ts` (the
 * DB-touching duplicate-check / member-matching / attendance-upsert logic)
 * calls `createAdminClient()` directly inline in a dozen private helper
 * functions with no dependency-injection seam — there is no way to mock
 * that layer from a plain `node --test` file without either a real
 * Postgres instance or a production-code refactor, neither of which this
 * session can do (no database access at all, and refactoring a live
 * attendance path without being able to run the result is not worth the
 * risk). See the checklist doc for the full explanation.
 *
 * What IS fully testable without a database — and is where "idempotency"
 * and "batch" actually get decided — is `lib/biometric/essl.ts`:
 *   - batch: turning one raw device payload (JSON array, ADMS multi-line
 *     text, form, or query-string) into a list of individual events.
 *   - idempotency: the deterministic `eventId` each event gets, which is
 *     exactly the key `biometric.service.ts` later uses for its exact-
 *     duplicate lookup against `attendance_sync_logs.external_event_id`.
 *   - "unmatched"-adjacent: a record missing a user id or timestamp is
 *     dropped rather than guessed at, which is what stops garbage rows
 *     from ever reaching the member-matching step.
 *
 * These tests cover that layer. If `services/biometric.service.ts` is
 * ever refactored to accept an injected Supabase client, a second file
 * testing the duplicate/member-matching decisions directly should be
 * added — this file intentionally does not attempt that today.
 */

interface MetadataOverrides {
  contentType?: string | null;
  rawBody?: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}

function metadata(overrides: MetadataOverrides = {}) {
  return {
    provider: "essl" as const,
    receivedAt: new Date("2026-09-07T09:00:00.000Z"),
    contentType: null as string | null,
    method: "POST",
    path: "/api/biometric",
    url: "https://example.test/api/biometric",
    query: {} as Record<string, string>,
    ipAddress: "10.0.0.5",
    headers: {} as Record<string, string>,
    rawBody: "",
    ...overrides,
  };
}

// --- batch: multiple events from one payload -------------------------------

test("batch: a JSON payload with an events array parses every event", () => {
  const payload = {
    events: [
      { userId: "M001", timestamp: "2026-09-07T09:00:00+05:30", eventType: "check_in", verificationMethod: "face" },
      { userId: "M002", timestamp: "2026-09-07T09:05:00+05:30", eventType: "check_in", verificationMethod: "fingerprint" },
      { userId: "M001", timestamp: "2026-09-07T18:00:00+05:30", eventType: "check_out", verificationMethod: "face" },
    ],
  };
  const result = parseBiometricRequest({ payload, metadata: metadata({ contentType: "application/json" }) });
  assert.equal(result.detectedFormat, "json");
  assert.equal(result.events.length, 3);
  assert.equal(result.events[0]!.biometricUserId, "M001");
  assert.equal(result.events[2]!.eventType, "check_out");
});

test("batch: an ADMS multi-line text payload parses one event per line", () => {
  const rawBody = [
    "M001\t2026-09-07 09:00:00\t1\t0",
    "M002\t2026-09-07 09:05:00\t1\t0",
    "OPERLOG this line should be ignored",
    "",
    "M001\t2026-09-07 18:00:00\t1\t1",
  ].join("\n");
  const result = parseBiometricRequest({ payload: {}, metadata: metadata({ rawBody, contentType: null }) });
  assert.equal(result.detectedFormat, "adms_text");
  assert.equal(result.events.length, 3);
  assert.deepEqual(
    result.events.map((e) => e.eventType),
    ["check_in", "check_in", "check_out"],
  );
});

// --- unmatched-adjacent: malformed records are dropped, not guessed --------

test("malformed records (no user id or no parseable timestamp) are dropped from events", () => {
  const payload = {
    events: [
      { userId: "M001", timestamp: "2026-09-07T09:00:00+05:30" }, // valid
      { timestamp: "2026-09-07T09:05:00+05:30" }, // missing user id
      { userId: "M003", timestamp: "not-a-real-timestamp" }, // unparseable timestamp
    ],
  };
  const result = parseBiometricRequest({ payload, metadata: metadata({ contentType: "application/json" }) });
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0]!.biometricUserId, "M001");
});

// --- idempotency: the eventId is the dedup key downstream logic relies on --

test("idempotency: the same event fields (no external id) always hash to the same eventId", () => {
  const record = { userId: "M001", timestamp: "2026-09-07T09:00:00+05:30", eventType: "check_in", verificationMethod: "face" };
  const first = parseBiometricRequest({ payload: { events: [record] }, metadata: metadata({ contentType: "application/json" }) });
  const second = parseBiometricRequest({ payload: { events: [{ ...record }] }, metadata: metadata({ contentType: "application/json" }) });
  assert.equal(first.events[0]!.eventId, second.events[0]!.eventId);
});

test("idempotency: changing the timestamp produces a different eventId", () => {
  const base = { userId: "M001", eventType: "check_in", verificationMethod: "face" };
  const a = parseBiometricRequest({
    payload: { events: [{ ...base, timestamp: "2026-09-07T09:00:00+05:30" }] },
    metadata: metadata({ contentType: "application/json" }),
  });
  const b = parseBiometricRequest({
    payload: { events: [{ ...base, timestamp: "2026-09-07T09:00:01+05:30" }] },
    metadata: metadata({ contentType: "application/json" }),
  });
  assert.notEqual(a.events[0]!.eventId, b.events[0]!.eventId);
});

test("idempotency: an explicit external_event_id is used verbatim as the eventId", () => {
  const payload = { events: [{ userId: "M001", timestamp: "2026-09-07T09:00:00+05:30", external_event_id: "MACHINE-LOG-4471" }] };
  const result = parseBiometricRequest({ payload, metadata: metadata({ contentType: "application/json" }) });
  assert.equal(result.events[0]!.eventId, "MACHINE-LOG-4471");
});

// --- device candidate extraction (used to resolve which machine sent it) --

test("extractDeviceCandidates reads every known device-identifying field name", () => {
  assert.deepEqual(extractDeviceCandidates({ device_id: "DEV-1" }), ["DEV-1"]);
  assert.deepEqual(extractDeviceCandidates({ SN: "SERIAL-9" }), ["SERIAL-9"]);
  assert.deepEqual(extractDeviceCandidates({ terminalId: "T-3" }), ["T-3"]);
  assert.deepEqual(extractDeviceCandidates("not an object"), []);
});

test("extractRequestDeviceCandidates merges header, query and body candidates without duplicates", () => {
  const candidates = extractRequestDeviceCandidates(
    metadata({ query: { SN: "DEV-1" }, headers: { "x-device-id": "DEV-1" } }),
    { device_id: "DEV-1", serial: "SERIAL-2" },
  );
  assert.deepEqual(candidates, ["DEV-1", "SERIAL-2"]);
});

// --- format auto-detection --------------------------------------------------

test("format detection: application/json content-type is parsed as json", () => {
  const result = parseBiometricRequest({
    payload: { events: [{ userId: "M001", timestamp: "2026-09-07T09:00:00+05:30" }] },
    metadata: metadata({ contentType: "application/json; charset=utf-8" }),
  });
  assert.equal(result.detectedFormat, "json");
});

test("format detection: raw text starting with ATTLOG is parsed as adms_text even with no content-type", () => {
  const rawBody = "ATTLOG\nM001\t2026-09-07 09:00:00\t1\t0";
  const result = parseBiometricRequest({ payload: {}, metadata: metadata({ rawBody, contentType: null }) });
  assert.equal(result.detectedFormat, "adms_text");
});

test("format detection: query-string fields are used when there is no body at all", () => {
  const result = parseBiometricRequest({
    payload: {},
    metadata: metadata({ query: { userId: "M001", timestamp: "2026-09-07T09:00:00+05:30" }, rawBody: "" }),
  });
  assert.equal(result.detectedFormat, "query");
  assert.equal(result.events.length, 1);
});

test("format detection: an empty body and empty query yields zero events, not a crash", () => {
  const result = parseBiometricRequest({ payload: {}, metadata: metadata() });
  assert.equal(result.events.length, 0);
  assert.equal(result.detectedFormat, "unknown");
});
