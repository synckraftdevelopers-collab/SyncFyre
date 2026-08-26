import { z } from "zod";

const indianPhonePattern = /^(\+91)?[6-9]\d{9}$/;
const strongPassword = z.string().min(8).regex(/[A-Z]/, "Must include an uppercase letter").regex(/[0-9]/, "Must include a number");

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  password: strongPassword,
});

export const registerSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().optional().transform((value) => value || "").refine((value) => value === "" || indianPhonePattern.test(value), "Enter a valid mobile number."),
  password: strongPassword,
  confirm_password: z.string().min(8),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords do not match.",
  path: ["confirm_password"],
});
