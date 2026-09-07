import test from "node:test";
import assert from "node:assert/strict";
import { attendanceBatchSchema, machineAttendanceSchema } from "../lib/validations/attendance.ts";

const validEvent = {
  device_id: "DEV-001",
  machine_user_id: "MU-42",
  event_at: "2026-09-07T09:15:00+05:30",
  event_type: "entry",
  external_event_id: "EVT-0001",
};

test("a well-formed machine attendance event parses successfully", () => {
  const result = machineAttendanceSchema.safeParse(validEvent);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.event_type, "entry");
  }
});

test("event_type only accepts entry or exit", () => {
  const result = machineAttendanceSchema.safeParse({ ...validEvent, event_type: "check_in" });
  assert.equal(result.success, false);
});

test("event_at must be an ISO datetime with an offset", () => {
  assert.equal(machineAttendanceSchema.safeParse({ ...validEvent, event_at: "not-a-date" }).success, false);
  assert.equal(machineAttendanceSchema.safeParse({ ...validEvent, event_at: "2026-09-07" }).success, false);
  assert.equal(machineAttendanceSchema.safeParse(validEvent).success, true);
});

test("device_id, machine_user_id and external_event_id cannot be empty", () => {
  assert.equal(machineAttendanceSchema.safeParse({ ...validEvent, device_id: "" }).success, false);
  assert.equal(machineAttendanceSchema.safeParse({ ...validEvent, machine_user_id: "" }).success, false);
  assert.equal(machineAttendanceSchema.safeParse({ ...validEvent, external_event_id: "" }).success, false);
});

test("a batch requires at least one event and rejects an empty batch", () => {
  assert.equal(attendanceBatchSchema.safeParse({ events: [] }).success, false);
  assert.equal(attendanceBatchSchema.safeParse({ events: [validEvent] }).success, true);
});

test("a batch rejects more than 1000 events (the sync payload cap)", () => {
  const events = Array.from({ length: 1001 }, (_, i) => ({
    ...validEvent,
    external_event_id: `EVT-${i}`,
  }));
  assert.equal(attendanceBatchSchema.safeParse({ events }).success, false);
  assert.equal(attendanceBatchSchema.safeParse({ events: events.slice(0, 1000) }).success, true);
});

test("a batch with one invalid event fails validation entirely (no silent partial-accept)", () => {
  const events = [validEvent, { ...validEvent, event_type: "unknown" }];
  const result = attendanceBatchSchema.safeParse({ events });
  assert.equal(result.success, false);
});
