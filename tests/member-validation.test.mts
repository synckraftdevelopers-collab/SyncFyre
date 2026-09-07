import test from "node:test";
import assert from "node:assert/strict";
import { memberSchema } from "../lib/validations/member.ts";

const validMember = {
  full_name: "Aarav Sharma",
  phone: "9876543210",
  branch_id: "11111111-1111-4111-8111-111111111111",
  status: "active",
};

test("member validation accepts a complete minimal member", () => {
  const result = memberSchema.safeParse(validMember);
  assert.equal(result.success, true);
});

test("member validation requires a branch UUID", () => {
  const result = memberSchema.safeParse({ ...validMember, branch_id: "" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.flatten().fieldErrors.branch_id?.includes("Choose a branch."));
  }
});

test("member validation rejects an invalid mobile number", () => {
  const result = memberSchema.safeParse({ ...validMember, phone: "123" });
  assert.equal(result.success, false);
});
