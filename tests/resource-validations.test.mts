import test from "node:test";
import assert from "node:assert/strict";
import { resourceSchemas } from "../lib/validations/resources.ts";

const uuid = "11111111-1111-1111-1111-111111111111";
const otherUuid = "22222222-2222-2222-2222-222222222222";

// --- workouts (Shradha's Phase 4 module) ---------------------------------

test("workouts: a minimal valid payload parses", () => {
  const result = resourceSchemas.workouts.safeParse({
    member_id: uuid,
    branch_id: uuid,
    name: "Leg day",
    exercise_name: "Squat",
  });
  assert.equal(result.success, true);
});

test("workouts: member_id and branch_id are required uuids", () => {
  assert.equal(resourceSchemas.workouts.safeParse({ branch_id: uuid, name: "Leg day", exercise_name: "Squat" }).success, false);
  assert.equal(resourceSchemas.workouts.safeParse({ member_id: "not-a-uuid", branch_id: uuid, name: "Leg day", exercise_name: "Squat" }).success, false);
});

test("workouts: numeric fields reject negative/zero where the schema requires positive", () => {
  const base = { member_id: uuid, branch_id: uuid, name: "Leg day", exercise_name: "Squat" };
  assert.equal(resourceSchemas.workouts.safeParse({ ...base, sets: 0 }).success, false); // sets must be > 0
  assert.equal(resourceSchemas.workouts.safeParse({ ...base, sets: 5 }).success, true);
  assert.equal(resourceSchemas.workouts.safeParse({ ...base, cardio_minutes: -1 }).success, false); // nonnegative
  assert.equal(resourceSchemas.workouts.safeParse({ ...base, cardio_minutes: 0 }).success, true);
});

test("workouts: trainer_id is optional (admin/reception can create without one)", () => {
  const result = resourceSchemas.workouts.safeParse({
    member_id: uuid,
    branch_id: uuid,
    name: "Leg day",
    exercise_name: "Squat",
    trainer_id: null,
  });
  assert.equal(result.success, true);
});

// --- diet-plans (Shradha's Phase 4 module) -------------------------------

test("diet-plans: a minimal valid payload parses", () => {
  const result = resourceSchemas["diet-plans"].safeParse({
    member_id: uuid,
    branch_id: uuid,
    name: "Cutting plan",
    start_date: "2026-09-07",
  });
  assert.equal(result.success, true);
});

test("diet-plans: start_date must be a date-only string", () => {
  const base = { member_id: uuid, branch_id: uuid, name: "Cutting plan" };
  assert.equal(resourceSchemas["diet-plans"].safeParse({ ...base, start_date: "2026-09-07T00:00:00Z" }).success, false);
  assert.equal(resourceSchemas["diet-plans"].safeParse({ ...base, start_date: "2026-09-07" }).success, true);
});

test("diet-plans: calories and macros reject negative values", () => {
  const base = { member_id: uuid, branch_id: uuid, name: "Cutting plan", start_date: "2026-09-07" };
  assert.equal(resourceSchemas["diet-plans"].safeParse({ ...base, calories: -100 }).success, false);
  assert.equal(resourceSchemas["diet-plans"].safeParse({ ...base, protein_g: -1 }).success, false);
  assert.equal(resourceSchemas["diet-plans"].safeParse({ ...base, calories: 2200, protein_g: 180 }).success, true);
});

// --- trainers -------------------------------------------------------------

test("trainers: user_id and branch_id are required; specializations default to an empty array", () => {
  const result = resourceSchemas.trainers.safeParse({ user_id: uuid, branch_id: uuid });
  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.data.specializations, []);
    assert.equal(result.data.experience_years, 0);
  }
  assert.equal(resourceSchemas.trainers.safeParse({ branch_id: uuid }).success, false);
});

// --- staff ------------------------------------------------------------------

test("staff: a minimal valid payload parses", () => {
  const result = resourceSchemas.staff.safeParse({
    user_id: uuid,
    branch_id: uuid,
    employee_code: "EMP-001",
    designation: "Front Desk",
    joining_date: "2026-09-01",
    salary: 25000,
  });
  assert.equal(result.success, true);
});

test("staff: salary cannot be negative", () => {
  const base = { user_id: uuid, branch_id: uuid, employee_code: "EMP-001", designation: "Front Desk", joining_date: "2026-09-01" };
  assert.equal(resourceSchemas.staff.safeParse({ ...base, salary: -1 }).success, false);
  assert.equal(resourceSchemas.staff.safeParse({ ...base, salary: 0 }).success, true);
});

test("staff: employee_code and designation reject an empty/too-short string", () => {
  const base = { user_id: uuid, branch_id: uuid, joining_date: "2026-09-01", salary: 25000 };
  assert.equal(resourceSchemas.staff.safeParse({ ...base, employee_code: "A", designation: "Front Desk" }).success, false);
  assert.equal(resourceSchemas.staff.safeParse({ ...base, employee_code: "EMP-001", designation: "" }).success, false);
});

// --- appointments (tightened by the RLS migration, worth validating too) ---

test("appointments: end_time must be after start_time constraint lives in the DB, but provider_type is validated here", () => {
  const base = {
    member_id: uuid,
    branch_id: uuid,
    appointment_date: "2026-09-07",
    start_time: "09:00",
    end_time: "09:30",
  };
  assert.equal(resourceSchemas.appointments.safeParse({ ...base, provider_type: "trainer" }).success, true);
  assert.equal(resourceSchemas.appointments.safeParse({ ...base, provider_type: "masseuse" }).success, false);
});

test("resources: two different valid uuids are both accepted where a uuid field is required", () => {
  assert.equal(resourceSchemas.trainers.safeParse({ user_id: uuid, branch_id: otherUuid }).success, true);
});
