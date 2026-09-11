# BIOMETRIC ARCHITECTURE AUDIT
**SyncFyre / SyncTyre — Biometric SaaS Readiness**
**Audit date:** 2026-09-10
**Auditor:** Kiro AI (read-only, no source changes made)

---

## 1. Overall Verdict

> **MOSTLY GENERIC / MINOR FIXES REQUIRED**

The biometric pipeline is structurally sound and multi-tenant by design.
All database objects are branch-scoped. No Talwalkar-specific IDs, IPs,
credentials, or business-logic conditions were found in the code.
Two P0 items must be fixed before onboarding a second real gym:
`provider: "essl"` is hardcoded in every metadata object, and
`"Asia/Kolkata"` is hardcoded for attendance-date calculation.
Everything else is correctness polish (P1/P2).

---

## 2. Architecture Flow

```
Physical Device / Machine Terminal
        │
        ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Ingestion Endpoints (all call processBiometricPayload) │
  │                                                         │
  │  /api/biometric/essl/events   (POST, JSON/form/ADMS)   │
  │  /iclock/cdata                (GET+POST, ADMS protocol) │
  │  /iclock/getrequest           (GET, heartbeat/ack)      │
  │  /iclock/registry             (GET, device reg)         │
  │  /iclock/devicecmd            (POST, device cmd)        │
  │  /api/attendance/sync         (POST, batch JSON + secret│
  │  /api/machine/attendance      (POST, machine session)   │
  └────────────────────────┬────────────────────────────────┘
                           │
                           ▼
            buildBiometricRequestMetadata()          ← lib/biometric/http.ts
            (extracts IP, headers, body, query)
            *** hardcodes provider: "essl" ***
                           │
                           ▼
            processBiometricPayload()                ← services/biometric.service.ts
            ├── resolveBiometricDevice()
            │     (serial_number → device_identifier
            │      → device_id → machine_id → IP)
            │     queries face_machine_settings
            │
            ├── ensurePaidCommercialPlanForBranch()  ← services/entitlements.service.ts
            │     (Growth plan check per branch)
            │
            ├── validateDeviceSecurity()
            │     (IP allowlist + shared/device secret)
            │
            ├── parseBiometricRequest()              ← lib/biometric/essl.ts
            │     (JSON / ADMS-text / form / query)
            │     *** essl.ts name, but logic is generic ***
            │
            └── processBiometricAttendanceEvent()
                  ├── findExactDuplicate()           ← attendance_sync_logs
                  ├── findWindowDuplicate()          ← attendance_sync_logs (90s window)
                  ├── evaluateMemberStatus()
                  │     (branch-scoped member + subscription check)
                  ├── upsertAttendance()             ← attendance table
                  │     *** eventDate() hardcodes "Asia/Kolkata" ***
                  └── insertSyncLog()                ← attendance_sync_logs
                        *** provider: "essl" hardcoded ***

Raw events stored: attendance_sync_logs
Business attendance: attendance
Member↔device mapping: biometric_member_mapping + members.machine_user_id
```

---

## 3. Existing Components

| Component | File / Table | Purpose | Generic? | Notes |
|---|---|---|---|---|
| Request metadata builder | `lib/biometric/http.ts` | Extracts IP, headers, body; builds `BiometricRequestMetadata` | ✅ Generic logic | ❌ Hardcodes `provider: "essl"` |
| Payload parser | `lib/biometric/essl.ts` | Parses JSON / ADMS-text / form / query events into normalized structs | ✅ Generic logic | File named "essl" but the parsing is vendor-neutral |
| Types | `lib/biometric/types.ts` | `RegisteredBiometricDevice`, `BiometricAttendanceEvent`, `BiometricRequestMetadata` | ✅ | `BiometricRequestMetadata.provider` typed as `"essl"` only |
| Core pipeline | `services/biometric.service.ts` | Device resolution, plan check, security, parse, attendance upsert, sync log | ✅ Multi-tenant | ❌ `eventDate()` hardcodes `"Asia/Kolkata"` |
| Admin service | `services/biometric-admin.service.ts` | Attendance queries, mapping management, unidentified users | ✅ Branch-scoped | ❌ `istDate()` hardcodes `"Asia/Kolkata"` |
| Mapping service | `services/biometric-mapping.service.ts` | Assign/generate machine user IDs, reprocess unmatched events | ✅ Generic | ❌ `reprocessUnmatchedAttendanceForMember` hardcodes `"Asia/Kolkata"` |
| Machine auth | `lib/machine/auth.ts` | HMAC-signed session cookies for the machine terminal | ✅ | MACHINE_SESSION_SECRET env var |
| Machine management | `services/machine-management.service.ts` | Device list, terminal device resolution | ✅ Branch-scoped | — |
| eSSL ingestion route | `app/api/biometric/essl/events/route.ts` | HTTP entry for JSON/ADMS push events | ✅ | Route path named "essl" |
| iClock routes | `app/iclock/cdata|getrequest|registry|devicecmd` | ZKTeco/ADMS protocol compatibility | ✅ | Standard ADMS protocol, not vendor-specific logic |
| Sync route | `app/api/attendance/sync/route.ts` | Batch attendance sync (trusted machine) | ✅ | ❌ Hardcodes `provider: "essl"` in metadata |
| Machine terminal route | `app/api/machine/attendance/route.ts` | Single-punch from machine terminal UI | ✅ | ❌ Hardcodes `provider: "essl"` in metadata |
| Mock route | `app/api/biometric/devices/[id]/mock/route.ts` | 10 simulation scenarios | ✅ | Requires `BIOMETRIC_MOCK_MODE=true` env var |
| Machine terminal UI | `app/machine/page.tsx` + components | Tablet/kiosk attendance recording | ✅ | Separate auth, plan-gated |
| `face_machine_settings` | DB table | Device registry — one row per device | ✅ Multi-tenant | `provider` enum exists but unused in code routing |
| `attendance_sync_logs` | DB table | Immutable raw event log | ✅ Multi-tenant | Branch-scoped, has processing_result, duplicate_of_id |
| `attendance` | DB table | Business attendance records | ✅ Multi-tenant | Upsert by (member_id, attendance_date) |
| `biometric_member_mapping` | DB table | Member ↔ machine_user_id linkage | ✅ Multi-tenant | Unique per member_id and machine_user_id |
| `assign_biometric_mapping()` | DB function (SECURITY DEFINER) | Atomic mapping write with conflict guard | ✅ | Prevents duplicate machine_user_id across members |
| `generate_member_machine_user_id()` | DB function | Auto-increment machine user ID | ✅ | Uses `biometric_machine_user_id_seq` |
| `next_machine_user_id()` | DB function | Returns next sequential ID | ✅ | — |

---

## 4. Talwalkar Hardcoding Findings

| Finding | Location | Severity | Genericization Required? |
|---|---|---|---|
| `provider: "essl"` in `buildBiometricRequestMetadata()` | `lib/biometric/http.ts:69` | **P0** | Yes — detect from device record after resolution |
| `provider: "essl"` in `BiometricRequestMetadata` type definition | `lib/biometric/types.ts:37` | P0 (type mirrors runtime) | Yes — widen to `string` or union |
| `provider: "essl"` in `attendance/sync/route.ts` metadata | `app/api/attendance/sync/route.ts:38` | **P0** | Yes — should use device's actual provider |
| `provider: "essl"` in `machine/attendance/route.ts` metadata | `app/api/machine/attendance/route.ts:14` | **P0** | Yes — should use device's actual provider |
| `provider: "essl"` written to `attendance_sync_logs` in `insertSyncLog()` | `services/biometric.service.ts` (~line 199) | **P0** | Yes — use `device.provider` |
| `"Asia/Kolkata"` in `eventDate()` — determines attendance date | `services/biometric.service.ts:~81` | **P0** | Yes — should use branch/tenant timezone |
| `"Asia/Kolkata"` in `istDate()` — today's date for admin queries | `services/biometric-admin.service.ts:~22` | **P0** | Yes — parameter or branch timezone |
| `"Asia/Kolkata"` in `listNormalizedAttendance()` time range queries | `services/biometric-admin.service.ts` | P0 | Yes — offsets +05:30 hardcoded in query strings |
| `"Asia/Kolkata"` in `reprocessUnmatchedAttendanceForMember()` | `services/biometric-mapping.service.ts:~106` | P0 | Yes — attendance date calculation |
| `api_key_encrypted` column name implies encrypted storage | `lib/biometric/types.ts:28`, `face_machine_settings` | **P1** | Rename or actually encrypt; currently stores plaintext |
| `BiometricRequestSource` type includes `"essl"` as a value | `lib/biometric/types.ts:8` | P2 | Minor — `"essl"` is a valid source name, not hardcoding per se |
| Mock scenario uses `"ERIS-001"` as a demo serial | `app/api/biometric/devices/[id]/mock/route.ts:8` | P2 / Safe | Test fixture only, no runtime dependency |
| No Talwalkar-specific IDs, IPs, names, credentials found | entire codebase | ✅ PASS | — |

> Secrets and actual credential values are intentionally not reproduced in this report.

---

## 5. Multi-Tenant Isolation

| Area | Status | Notes |
|---|---|---|
| Device registry (`face_machine_settings`) scoped to `branch_id` | ✅ PASS | All queries filter or enforce `eq("branch_id", ...)` |
| Device resolution by serial/IP — no cross-branch leakage | ✅ PASS | IP-match requires exactly 1 result; serial/ID matched directly |
| Plan check per `branch_id` before processing | ✅ PASS | `ensurePaidCommercialPlanForBranch(device.branch_id)` |
| Member lookup — branch enforced via `evaluateMemberStatus` | ✅ PASS | `member.branch_id === device.branch_id` enforced |
| Attendance upsert scoped to `member_id` (which is branch-scoped) | ✅ PASS | FK chain enforces tenant boundary |
| `attendance_sync_logs` scoped to `branch_id` | ✅ PASS | `branch_id: device.branch_id` written on insert |
| `biometric_member_mapping` — no direct branch column, relies on member FK | ⚠️ NOTE | Isolation is transitive via `members.branch_id`; no direct `branch_id` column. Admin queries join through `members!inner` with branch filter — correct but implicit |
| Machine terminal session scoped to `(machineId, branchId)` | ✅ PASS | Session token encodes both; verified on every request |
| Terminal device resolution enforces `eq("branch_id", session.branchId)` | ✅ PASS | `getMachineTerminalDevice` double-checks machine + branch |
| `ATTENDANCE_SYNC_SECRET` is global (shared by all tenants) | ⚠️ P2 | One compromised device/secret can submit for any tenant that has a registered device |
| `BIOMETRIC_ADMS_SHARED_SECRET` is global | ⚠️ P2 | Same as above |
| Admin service uses `createAdminClient()` (service role) | ⚠️ NOTE | Intentional for server actions; no RLS on these paths. Acceptable for server-only code — not exposed to client |
| RLS on biometric tables | ⚠️ UNKNOWN | Migration 0014 does not define RLS. If service-role bypasses RLS this is fine server-side, but unverified for RLS policy existence |
| Gym A seeing Gym B data | ✅ PASS | No path found — all queries are branch-scoped |

---

## 6. Provider / Device Abstraction

### Current state

There is **one parser implementation** in `lib/biometric/essl.ts`. Despite the filename, the actual parsing logic is not eSSL-specific — it handles:
- JSON event batches (any field names via configurable key arrays)
- ADMS text-line format (ZKTeco / compatible devices)
- URL-encoded form bodies
- Query-string events

The `parseBiometricRequest()` function selects format by content-type and body structure, not by provider. **Adding a second vendor whose devices send standard JSON or ADMS text would work today without any parser changes.**

### What is missing

There is no formal provider abstraction layer (interface + adapter registry). The `provider` column exists on `face_machine_settings` and `attendance_sync_logs`, but:
- `buildBiometricRequestMetadata()` hardcodes `provider: "essl"` before the device is even resolved.
- No code reads `device.provider` to select a parser or adapter.
- `BiometricRequestMetadata.provider` is typed as the literal `"essl"` only.

A vendor requiring a fundamentally different protocol (e.g., a REST-pull model, a binary protocol, or a non-ADMS push format) would require direct modification of `biometric.service.ts` and `essl.ts` with no extension point.

### Impact

Low for gyms that use eSSL or ZKTeco ADMS-compatible hardware (the most common case in India). High if a future customer uses a vendor with a different transport protocol (Suprema, HID, BioStar, etc.).

---

## 7. Mapping & Attendance

### Member ↔ Machine mapping

- Primary source of truth: `members.machine_user_id` (direct field on member row).
- Secondary source: `biometric_member_mapping` table — richer workflow with `match_status`, `verified` flag, and `machine_name`.
- `evaluateMemberStatus()` in `biometric.service.ts` queries **only** `members.machine_user_id`. The `biometric_member_mapping` table is used by the admin UI (via `biometric-admin.service.ts`) but **not** by the core processing pipeline.
- `assign_biometric_mapping()` DB function writes to both tables atomically, keeping them in sync.
- Duplicate mapping prevention: DB-level unique indexes on both `biometric_member_mapping.member_id` and `biometric_member_mapping.machine_user_id`. Application layer checks for conflicts before calling RPC.

### Punch → attendance

1. Event arrives at any ingestion endpoint.
2. `parseBiometricRequest()` produces `BiometricAttendanceEvent[]`.
3. For each event: exact duplicate check (by `device_id` + `eventId`) → window duplicate check (90s, configurable via `BIOMETRIC_DUPLICATE_WINDOW_SECONDS`).
4. `evaluateMemberStatus()`: branch match → active status → active subscription + end date.
5. `upsertAttendance()`: upsert on `(member_id, attendance_date)`. Entry time takes earliest, exit time takes latest, allowing multiple punches per day to consolidate correctly.
6. Sync log written with status `processed` / `duplicate` / `unmatched` / `rejected` / `error`.

### Unmatched punches

- Stored in `attendance_sync_logs` with `status = "unmatched"` and `resolution_status = "open"`.
- Admin can map the machine_user_id later; `reprocessUnmatchedAttendanceForMember()` retroactively creates attendance records for all open unmatched logs.

---

## 8. Idempotency & Reliability

| Mechanism | Implementation | Notes |
|---|---|---|
| Exact-duplicate detection | SHA-256 `eventId` from (deviceId, biometricUserId, timestamp, eventType, verifyMethod) or `externalEventId` if provided | Stored in `attendance_sync_logs.external_event_id` |
| Window-duplicate detection | 90s window (configurable) around same device + user + event_type | Prevents repeated scans within session |
| Attendance upsert idempotency | `upsert ON CONFLICT (member_id, attendance_date)` + min/max time merge | Safe to re-submit the same event |
| Reprocess unmatched | Retroactive attendance creation after member mapping | Ordered ascending by `event_at`, preserves min/max merge |
| Device last-seen heartbeat | `markDeviceSeen()` updates `connection_status` + `last_seen_at` on every request | Error message stored in `last_error` |
| Partial batch failure | Per-event try/catch; failed events log `PROCESSING_ERROR`, others proceed | Batch returns 200 unless all events fail (then 502) |
| Retry safety | All DB writes are upserts or inserts with conflict guards | Safe to replay |
| Diagnostic mode | `BIOMETRIC_DIAGNOSTIC_MODE=true` stores unregistered-device requests for debugging | Best-effort, silently ignored on failure |

---

## 9. Security

### Credential handling

| Credential | Storage | Access | Notes |
|---|---|---|---|
| `MACHINE_SESSION_SECRET` | Environment variable | Server-only (`lib/machine/auth.ts`) | HMAC-SHA256 key for machine terminal sessions; min 32 chars enforced |
| `terminal_secret_hash` | DB — SHA-256 hash only | Admin client | Original secret never stored; hash-only in `face_machine_settings` |
| `api_key_encrypted` | DB column — **plaintext** (misleading name) | Admin client | ❌ P1: column name implies encryption but value is stored as-is |
| `BIOMETRIC_ADMS_SHARED_SECRET` | Environment variable | Server-only | Global shared secret for all ADMS devices |
| `ATTENDANCE_SYNC_SECRET` | Environment variable | Server-only | Global shared secret for the batch sync endpoint |
| Supabase service role key | Environment variable | Admin client only | Never exposed to client; `createAdminClient()` is server-only |

### Authorization layers

- Machine terminal: HMAC-signed session cookie (`syncfyre_machine_session`) containing `(machineId, branchId, exp)` — 12h TTL, httpOnly/secure/strict.
- Batch sync endpoint: `x-sync-secret` header checked with `timingSafeEqual()`.
- ADMS endpoint: optional `BIOMETRIC_ADMS_SHARED_SECRET` + optional per-device `api_key_encrypted`.
- IP allowlist: `device.allowed_ip` checked on every event if configured.
- Mock endpoint: requires authenticated admin/manager session (`requireUser`).

### Security concerns

- `api_key_encrypted` stores plaintext. Any compromise of the DB would expose device API keys directly.
- Both `ATTENDANCE_SYNC_SECRET` and `BIOMETRIC_ADMS_SHARED_SECRET` are global — one leaked secret compromises all tenants simultaneously.
- No per-device rotating secrets for the ADMS/push ingestion path. Device-level `api_key_encrypted` exists but its use is optional.
- `sanitizeHeaders()` in `http.ts` redacts secrets/tokens from stored headers — good practice confirmed.

---

## 10. Demo / Simulation Readiness

**A no-hardware demo is possible today** via the mock route.

`POST /api/biometric/devices/{id}/mock` with `{ "scenario": "<name>" }`:

| Scenario | What it tests |
|---|---|
| `valid_face` | Happy path — face scan, active member |
| `unknown_member` | Unmatched machine_user_id |
| `inactive_member` | Rejected — inactive member |
| `expired_membership` | Rejected — expired subscription |
| `wrong_branch` | Rejected — member in different branch |
| `duplicate_scan` | Duplicate detection (window + exact) |
| `invalid_payload` | Malformed event handling |
| `unknown_verification_mode` | Normalizes unusual verify codes |
| `multiple_events` | Batch processing — mixed results |
| `adms_attlog` | ADMS text-line format parsing |

The mock payload flows through **the exact same `processBiometricPayload()` pipeline** as real hardware — device resolution, plan check, security, parse, duplicate detection, member lookup, attendance upsert.

**Requirements to use the mock:**
1. `BIOMETRIC_MOCK_MODE=true` environment variable.
2. An active device record in `face_machine_settings` with a known `id`.
3. An authenticated admin/manager session.

**Limitation:** Mock scenarios use hardcoded `machine_user_id` values (`MEMBER_TEST_001`, `MEMBER_INACTIVE_001`, etc.) that do not correspond to real members. A demo gym must either use those IDs or configure its own members with matching `machine_user_id` values.

---

## 11. Critical Findings

### P0 — Must fix before onboarding another real gym

| # | Finding | Location | Impact |
|---|---|---|---|
| P0-1 | `provider: "essl"` hardcoded in `buildBiometricRequestMetadata()` before device is resolved — every request is logged as essl regardless of actual device provider | `lib/biometric/http.ts:69`, `lib/biometric/types.ts:37`, `services/biometric.service.ts:~199`, `app/api/attendance/sync/route.ts:38`, `app/api/machine/attendance/route.ts:14` | Audit trail is wrong; blocks correct provider routing if a non-essl device is ever added |
| P0-2 | `"Asia/Kolkata"` timezone hardcoded for attendance date calculation and admin date queries | `services/biometric.service.ts:~81` (`eventDate()`), `services/biometric-admin.service.ts:~22` (`istDate()`), `services/biometric-admin.service.ts` (query time offsets `+05:30`), `services/biometric-mapping.service.ts:~106` | A gym in a different timezone will get wrong attendance dates — punches at 11pm will be recorded on the next day, or punches will fall outside date filters |

### P1 — Should fix before production with multiple tenants

| # | Finding | Location | Impact |
|---|---|---|---|
| P1-1 | `api_key_encrypted` column stores plaintext — name implies encryption | `face_machine_settings` table, `lib/biometric/types.ts:28` | False security expectation; DB dump exposes all device API keys |
| P1-2 | No formal provider adapter interface — adding a binary-protocol or REST-pull vendor requires modifying core files | `lib/biometric/essl.ts`, `services/biometric.service.ts` | Low risk for ADMS-compatible devices (majority of market); becomes blocking for non-ADMS vendors |
| P1-3 | `biometric_member_mapping` has no direct `branch_id` column — isolation is transitive via `members` FK | `supabase/migrations/0021_biometric_member_mapping_workflow.sql` | Admin queries correctly join through `members!inner`, but a direct `branch_id` column would make RLS and direct queries simpler and safer |
| P1-4 | RLS policies on biometric tables not confirmed | Migrations 0014, 0021 | If service-role is always used for biometric writes, this is acceptable; unverified |

### P2 — Improvement

| # | Finding | Location | Impact |
|---|---|---|---|
| P2-1 | `ATTENDANCE_SYNC_SECRET` and `BIOMETRIC_ADMS_SHARED_SECRET` are global — all tenants share one secret | `app/api/attendance/sync/route.ts`, `services/biometric.service.ts` | Compromised secret = all tenants affected; per-device secrets already exist (`api_key_encrypted`) but are not enforced |
| P2-2 | Route path `app/api/biometric/essl/events` is named "essl" — misleading for a generic ingestion endpoint | `app/api/biometric/essl/events/route.ts` | Cosmetic; does not affect function |
| P2-3 | `lib/biometric/essl.ts` filename implies vendor-specific code — but the logic is generic | `lib/biometric/essl.ts` | Cosmetic; may confuse future developers |
| P2-4 | Mock scenarios use fixed `machine_user_id` strings (`MEMBER_TEST_001` etc.) not connected to real DB members | `app/api/biometric/devices/[id]/mock/route.ts` | Demo fails without matching member rows; document or seed required |

---

## 12. Recommended Minimal Fix Plan

These are the minimum changes to make biometric safely generic for multiple gyms. **Not implemented — audit only.**

### Fix P0-1: Remove hardcoded `provider: "essl"`

Three changes:

1. **`lib/biometric/http.ts`** — Remove `provider` from `buildBiometricRequestMetadata()`. Return a metadata object without `provider`; let the caller supply it once the device is resolved.

2. **`lib/biometric/types.ts`** — Change `BiometricRequestMetadata.provider` from `"essl"` to `string` (or widen the union).

3. **`services/biometric.service.ts`** — After `resolveBiometricDevice()` resolves the device, set `metadata.provider = device.provider` before passing it downstream. For unresolved devices, default to `"generic"` or `"unknown"`.
   - Also update `insertSyncLog()` to use `input.device?.provider ?? "generic"` instead of `"essl"`.

4. **`app/api/attendance/sync/route.ts`** and **`app/api/machine/attendance/route.ts`** — After the device is identified (or using the device row), populate `provider` from the resolved device record.

### Fix P0-2: Per-branch timezone for attendance dates

1. Add a `timezone` column to `branches` (or `gym_settings`) — default `"UTC"`, allow `"Asia/Kolkata"` etc.

2. Fetch the branch timezone when the device is resolved (`resolveBiometricDevice()` already returns the device which has `branch_id`).

3. Thread the timezone into `eventDate()`, `istDate()`, and the admin query time range offsets.

4. No migration needed for existing Talwalkar data — their branch timezone would be set to `"Asia/Kolkata"` and behavior is identical to today.

### Fix P1-1: Rename or encrypt `api_key_encrypted`

Option A (rename only): Rename to `api_key` or `device_api_key` to remove the false implication of encryption.

Option B (actually encrypt): Use AES-256-GCM with a server-side key. Decrypt only when needed for comparison. Requires a migration.

---

## Appendix: Audit Evidence

### Files inspected

| File | Purpose |
|---|---|
| `lib/biometric/http.ts` | Request metadata extraction |
| `lib/biometric/essl.ts` | Payload parsing (JSON + ADMS) |
| `lib/biometric/types.ts` | All biometric TypeScript types |
| `services/biometric.service.ts` | Core processing pipeline |
| `services/biometric-admin.service.ts` | Admin attendance queries and mapping management |
| `services/biometric-mapping.service.ts` | Member ↔ machine_user_id assignment |
| `services/machine-management.service.ts` | Device admin read model |
| `lib/machine/auth.ts` | Machine terminal session HMAC auth |
| `app/api/biometric/essl/events/route.ts` | JSON/ADMS push ingestion endpoint |
| `app/api/biometric/devices/[id]/mock/route.ts` | Simulation / demo endpoint |
| `app/api/attendance/sync/route.ts` | Batch sync endpoint |
| `app/api/machine/attendance/route.ts` | Machine terminal attendance endpoint |
| `app/iclock/cdata/route.ts` | ADMS cdata endpoint |
| `app/machine/page.tsx` | Machine terminal page (plan-gated) |
| `supabase/migrations/0014_biometric_integration.sql` | Schema: provider, verification_method, processing_result columns |
| `supabase/migrations/0016_machine_terminal_credentials.sql` | Schema: terminal_secret_hash |
| `supabase/migrations/0021_biometric_member_mapping_workflow.sql` | Schema: biometric_member_mapping table + DB functions |

### Tables / functions / routes inspected

**Tables:** `face_machine_settings`, `attendance_sync_logs`, `attendance`, `biometric_member_mapping`, `members`, `subscriptions`

**DB functions:** `assign_biometric_mapping()`, `generate_member_machine_user_id()`, `next_machine_user_id()`

**Routes:** `/api/biometric/essl/events`, `/api/biometric/devices/[id]/mock`, `/api/attendance/sync`, `/api/machine/attendance`, `/iclock/cdata`, `/machine`

### Hardcoding grep results

```
"Asia/Kolkata" — found in:
  services/biometric.service.ts          (eventDate function)
  services/biometric-admin.service.ts    (istDate function + query offsets)
  services/biometric-mapping.service.ts  (reprocess function)

provider: "essl" — found in:
  lib/biometric/http.ts                  (buildBiometricRequestMetadata)
  lib/biometric/types.ts                 (type literal)
  services/biometric.service.ts          (insertSyncLog)
  app/api/attendance/sync/route.ts       (inline metadata object)
  app/api/machine/attendance/route.ts    (inline metadata object)

"talwalkar" / "Talwalkar" — NOT FOUND in any biometric source file
Hardcoded device IDs / IPs / tenant IDs — NOT FOUND
```

### Talwalkar data modified: **NO**
### Database schema / data modified: **NO**

---

*End of audit. Final verdict: **MOSTLY GENERIC / MINOR FIXES REQUIRED**.*
*Two P0 items (provider hardcoding, timezone hardcoding) must be resolved before onboarding a second real gym.*
*No Talwalkar-specific assumptions were found in the biometric codebase.*
