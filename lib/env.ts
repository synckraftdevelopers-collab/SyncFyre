/**
 * Environment validation — fails fast at startup with a clear message
 * if any required server-side variable is missing.
 * Import this file from lib/supabase/admin.ts and any server route that
 * needs secret-level keys so the error surfaces immediately.
 */

const required = {
  // Public (safe to use in browser bundles)
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  // Server-only secrets
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ATTENDANCE_SYNC_SECRET: process.env.ATTENDANCE_SYNC_SECRET,
  CRON_SECRET: process.env.CRON_SECRET,
} as const;

const optional = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  EMAIL_PROVIDER_API_KEY: process.env.EMAIL_PROVIDER_API_KEY ?? "",
  SMS_PROVIDER_API_KEY: process.env.SMS_PROVIDER_API_KEY ?? "",
  WHATSAPP_PROVIDER_API_KEY: process.env.WHATSAPP_PROVIDER_API_KEY ?? "",
} as const;

function validateEnv() {
  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `\n\n🔴 Missing required environment variables:\n` +
        missing.map((k) => `   • ${k}`).join("\n") +
        `\n\nCopy .env.example to .env.local and fill in all values.\n` +
        `See README.md → "Environment variables" for details.\n`,
    );
  }
}

// Only validate on the server side (Node.js runtime, not edge/browser).
if (typeof window === "undefined") {
  validateEnv();
}

export const env = {
  ...required,
  ...optional,
} as {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ATTENDANCE_SYNC_SECRET: string;
  CRON_SECRET: string;
  NEXT_PUBLIC_APP_URL: string;
  EMAIL_PROVIDER_API_KEY: string;
  SMS_PROVIDER_API_KEY: string;
  WHATSAPP_PROVIDER_API_KEY: string;
};
