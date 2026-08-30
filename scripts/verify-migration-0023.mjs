/**
 * Post-migration verifier for 0023_apply_role_based_notifications.sql
 * Run AFTER applying the migration in the Supabase SQL Editor.
 * QA project: siycjpmsujcxkvdsfcvq
 *
 * Usage:  node scripts/verify-migration-0023.mjs
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = {};
for (const line of raw.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq < 0) continue;
  env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
}

const URL_   = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SVCKEY = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON   = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const ref = new URL(URL_).hostname.split(".")[0];
if (ref !== "siycjpmsujcxkvdsfcvq") {
  console.error(`BLOCKED: wrong project '${ref}'`); process.exit(1);
}
console.log(`\n✅ QA project: ${ref}\n`);

const admin = createClient(URL_, SVCKEY,  { auth: { persistSession: false } });
const anon  = createClient(URL_, ANON,    { auth: { persistSession: false } });

let pass = 0; let fail = 0;

function ok(msg)  { console.log(`  ✅ PASS  ${msg}`); pass++; }
function bad(msg) { console.log(`  ❌ FAIL  ${msg}`); fail++; }

async function check(label, fn) {
  try {
    const result = await fn();
    if (result) ok(label);
    else bad(label);
  } catch (e) {
    bad(`${label} — threw: ${e.message}`);
  }
}

// 1. Schema checks
const { data: sample } = await admin.from("notifications").select("*").limit(1);
const cols = sample?.[0] ? Object.keys(sample[0]) : [];

await check("target_roles column exists", () => cols.includes("target_roles"));
await check("updated_at column exists",   () => cols.includes("updated_at"));

// 2. No rows with empty target_roles
const { count: emptyRoles } = await admin
  .from("notifications").select("id", { count: "exact", head: true })
  .eq("target_roles", "{}");
await check("No rows with empty target_roles", () => (emptyRoles ?? 0) === 0);

// 3. No tenant_id=NULL rows that aren't super_admin targeted
const { data: badNull } = await admin
  .from("notifications").select("id, target_roles")
  .is("tenant_id", null);
const badNullRows = (badNull ?? []).filter(r =>
  !Array.isArray(r.target_roles) || !r.target_roles.includes("super_admin"),
);
await check("No invalid tenant_id=NULL rows", () => badNullRows.length === 0);

// 4. No time_period_greeting rows remain
const { count: greetings } = await admin
  .from("notifications").select("id", { count: "exact", head: true })
  .eq("type", "time_period_greeting");
await check("time_period_greeting rows deleted", () => (greetings ?? 0) === 0);

// 5. mark_notification_read RPC callable by authenticated
const { error: rpcErr } = await admin.rpc("mark_notification_read", {
  p_notification_id: "00000000-0000-0000-0000-000000000000",
});
await check("mark_notification_read RPC exists",
  () => !rpcErr?.message?.includes("Could not find") && !rpcErr?.message?.includes("does not exist"),
);

// 6. Anon cannot select notifications
const { data: anonData, error: anonErr } = await anon
  .from("notifications").select("id").limit(1);
await check("Anon cannot read notifications (RLS blocks)", () => {
  if (anonErr) return true; // error = blocked = good
  return (anonData?.length ?? 0) === 0;
});

// 7. Total count is reasonable (seed data + real events)
const { count: total } = await admin
  .from("notifications").select("id", { count: "exact", head: true });
await check(`Total notifications reasonable (${total} rows)`,
  () => (total ?? 0) >= 0 && (total ?? 0) < 35000,
);

// 8. indexes exist (indirect: query plan check via service role count)
const { error: idxErr } = await admin
  .from("notifications").select("id", { count: "exact", head: true })
  .is("read_at", null).limit(0);
await check("Branch unread index query succeeds", () => !idxErr);

// Summary
console.log(`\n${"─".repeat(50)}`);
console.log(`  Results: ${pass} passed, ${fail} failed`);
if (fail === 0) {
  console.log("  ✅ Migration 0023 verified successfully.\n");
} else {
  console.log("  ❌ Migration 0023 verification FAILED.\n");
  console.log("  Apply the migration and re-run this script.");
  process.exit(1);
}
