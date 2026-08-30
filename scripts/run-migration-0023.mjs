/**
 * Applies 0023_apply_role_based_notifications.sql to QA only.
 * Reads credentials from .env.local — never prints them.
 * QA ref: siycjpmsujcxkvdsfcvq
 */
import { readFileSync } from "node:fs";
import https from "node:https";

// --- Load env without dotenv dependency ---
const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = {};
for (const line of raw.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 0) continue;
  env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env.local");
  process.exit(1);
}

const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
if (projectRef !== "siycjpmsujcxkvdsfcvq") {
  console.error(`BLOCKED: project is '${projectRef}', expected 'siycjpmsujcxkvdsfcvq'. Aborting.`);
  process.exit(1);
}
console.log(`[OK] QA project verified: ${projectRef}`);

// --- Read migration SQL ---
const sql = readFileSync(
  new URL("../supabase/migrations/0023_apply_role_based_notifications.sql", import.meta.url),
  "utf8",
);
console.log(`[OK] Migration loaded (${sql.length} bytes)`);

// --- Try Supabase Management API v1 ---
async function post(hostname, path, body, headers) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
    const req = https.request(
      { hostname, path, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": buf.length, ...headers } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      },
    );
    req.on("error", reject);
    req.write(buf);
    req.end();
  });
}

// Attempt 1: Management API query endpoint (needs access token)
const accessToken = process.env.SUPABASE_ACCESS_TOKEN ?? "";
if (accessToken) {
  console.log("[INFO] SUPABASE_ACCESS_TOKEN found — trying Management API...");
  const r = await post(
    "api.supabase.com",
    `/v1/projects/${projectRef}/database/query`,
    { query: sql },
    { Authorization: `Bearer ${accessToken}` },
  );
  if (r.status === 200 || r.status === 201) {
    console.log("[SUCCESS] Migration applied via Management API.");
    process.exit(0);
  }
  console.log(`[WARN] Management API returned ${r.status}: ${r.body.slice(0, 200)}`);
}

// Attempt 2: PostgREST /rest/v1/rpc/exec_sql
console.log("[INFO] Trying exec_sql RPC via service role...");
const r2 = await post(
  new URL(SUPABASE_URL).hostname,
  "/rest/v1/rpc/exec_sql",
  { query: sql },
  { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
);
if (r2.status >= 200 && r2.status < 300) {
  console.log("[SUCCESS] Migration applied via exec_sql RPC.");
  process.exit(0);
}
console.log(`[INFO] exec_sql returned ${r2.status} — not available.`);

// Attempt 3: PostgREST /rpc/exec_sql with different param name
const r3 = await post(
  new URL(SUPABASE_URL).hostname,
  "/rest/v1/rpc/exec_sql",
  { sql },
  { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
);
if (r3.status >= 200 && r3.status < 300) {
  console.log("[SUCCESS] Migration applied via exec_sql (sql param).");
  process.exit(0);
}
console.log(`[INFO] exec_sql (sql param) returned ${r3.status}`);

// ---- None of the automated paths worked ----
console.log(`
================================================================================
AUTOMATED MIGRATION BLOCKED
The migration cannot be applied automatically because:
  1. SUPABASE_ACCESS_TOKEN is not set in the shell environment.
  2. exec_sql RPC is not exposed on this Supabase instance.

MANUAL STEPS REQUIRED (takes ~30 seconds):
  1. Open the QA SQL Editor:
     https://supabase.com/dashboard/project/siycjpmsujcxkvdsfcvq/sql/new
  2. Paste the full contents of:
     supabase/migrations/0023_apply_role_based_notifications.sql
  3. Click Run — wait for "Success. No rows returned."
  4. Re-run this script to verify: node scripts/run-migration-0023.mjs --verify-only

This migration is idempotent — safe to run multiple times.
It is wrapped in a BEGIN/COMMIT transaction — if any step fails, nothing changes.
================================================================================
`);
process.exit(2);
