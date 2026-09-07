import test from "node:test";
import assert from "node:assert/strict";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../lib/validations/auth.ts";

test("login validation accepts an email and eight-character password", () => {
  assert.equal(loginSchema.safeParse({ email: "member@example.com", password: "Password1" }).success, true);
});

test("registration validation rejects mismatched passwords", () => {
  const result = registerSchema.safeParse({
    full_name: "Aarav Sharma",
    email: "member@example.com",
    phone: "9876543210",
    password: "Password1",
    confirm_password: "Different1",
  });
  assert.equal(result.success, false);
});

test("password reset requires an uppercase letter and a number", () => {
  assert.equal(resetPasswordSchema.safeParse({ password: "lowercase" }).success, false);
  assert.equal(resetPasswordSchema.safeParse({ password: "Password1" }).success, true);
});

test("forgot-password validation rejects malformed emails", () => {
  assert.equal(forgotPasswordSchema.safeParse({ email: "not-an-email" }).success, false);
});
