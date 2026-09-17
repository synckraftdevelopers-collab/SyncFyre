# SyncFyre Biometric — Generic SaaS Architecture Read-Only Audit

**Date:** September 17, 2026  
**Status:** READ-ONLY — No changes made  
**Analyst:** Kiro  
**Scope:** All biometric services, routes, schemas, migrations  

---

## 1. Executive Summary

SyncFyre's biometric architecture is **substantially more generic than it appears** at first glance. The core processing pipeline (`lib/biometric/` + `services/biometric.service.ts`) is provider-agnostic, multi-tenant capable, and correctly isolated. However, several P0–P1 gaps exist that prevent this from being a clean, fully self-service generic SaaS offering:

| Area | Status |
|---|---|
| Core processing pipeline | ✅ Generic |
| Device schema | ✅ Generic (provider enum, connection_mode enum, serial/identifier/IP lookup) |
| Tenant isolation | ✅ Correct in processing path; ⚠️ partial gap in device lookup |
| Member mapping | ⚠️ Dual-source confusion (members.machine_user_id vs biometric_member_mapping) |
| Provider abstraction | ⚠️ `provider: "essl"` hardcoded in sync log insertions |
| Idempotency | ✅ Two-layer (exact + time window) |
| Raw event storage | ✅ Immutable with full metadata |
| PLAN_LOCKED processing result | ⚠️ Not in the `processing_result` CHECK constraint |
| Credential security | ✅ Hashed (terminal secret); ⚠️ API key stored in cleartext |
| Demo mode | ✅ Exists (BIOMETRIC_MOCK_MODE + named scenarios) |
| New gym onboarding | ⚠️ Partially self-service; requires admin SQL/UI to register device |
| Multi-tenant device lookup | ⚠️ P0 gap — device resolution queries all active devices globally |

---

## 2. Current Architecture: Complete Data Flow

```
Physical Machine (ESSL AiFace/ERIS)
      │ HTTP push (ADMS protocol: ATTLOG lines or JSON)
      ▼
/iclock/cdata   (or /iclock/registry, /iclock/getrequest, /iclock/devicecmd)
  OR /api/biometric/essl/events  (JSON endpoint)
      │
      ▼
lib/biometric/http.ts
  buildBiometricRequestMetadata()
  ├─ extracts IP (x-forwarded-for / x-real-ip)
  ├─ sanitizes headers (redacts secrets/tokens)
  ├─ reads raw body (text)
  └─ returns: { payload, metadata }
      │
      ▼
services/biometric.service.ts
  processBiometricPayload()
  │
  ├─ 1. DEVICE RESOLUTION (resolveBiometricDevice)
  │       tries in order:
  │       serial_number → device_identifier → device_id → UUID → IP match
  │       queries face_machine_settings WHERE status='active'
  │       ⚠️ NO TENANT FILTER HERE — global scan
  │
  ├─ 2. ENTITLEMENT CHECK
  │       ensurePaidCommercialPlanForBranch(device.branch_id)
  │       branches → tenant → plan → getCommercialPlanTier()
  │       'free' → rejected, logs PLAN_LOCKED
  │       'paid' → proceeds
  │
  ├─ 3. SECURITY CHECK (validateDeviceSecurity)
  │       allowed_ip constraint check
  │       shared secret (BIOMETRIC_ADMS_SHARED_SECRET env)
  │       device api_key_encrypted check
  │
  ├─ 4. PAYLOAD PARSING (lib/biometric/essl.ts → parseBiometricRequest)
  │       auto-detects format: json / adms_text / form / query / unknown
  │       produces [BiometricAttendanceEvent]
  │
  └─ 5. PER-EVENT PROCESSING (processBiometricAttendanceEvent)
          │
          ├─ Exact duplicate check
          │     attendance_sync_logs WHERE device_id + external_event_id
          │
          ├─ Window duplicate check (default 90s window)
          │     attendance_sync_logs WHERE device_id + machine_user_id + event_type + timestamp range
          │
          ├─ Member evaluation (evaluateMemberStatus)
          │     members WHERE machine_user_id = event.biometricUserId
          │     ⚠️ NO BRANCH/TENANT FILTER — global scan
          │     then: finds sameBranch match (device.branch_id == member.branch_id)
          │     then: checks status = 'active'
          │     then: findLatestSubscription → checks active, not expired, not paused
          │
          ├─ Attendance upsert (upsertAttendance)
          │     attendance.upsert ON CONFLICT member_id,attendance_date
          │     keeps earliest entry_time / latest exit_time
          │
          └─ Sync log insert (insertSyncLog)
                attendance_sync_logs ← full metadata, processing_result, raw_payload

      │
      ▼
attendance table (confirmed, matched records)
attendance_sync_logs (all events, all statuses)
      │
      ▼
/api/attendance (GET)
  → biometric-admin.service.ts → listNormalizedAttendance()
  → merges attendance_sync_logs + attendance + member lookups

      │
      ▼
/admin/attendance (UI client component)
      │
      ▼
/admin/dashboard (getDashboardData → attendance table count for today)
```

---

## 3. Device / Machine Schema

### Fields in `face_machine_settings`

| Field | From Migration | Notes |
|---|---|---|
| `id` (UUID PK) | 0001 | ✅ |
| `branch_id` (FK → branches) | 0001 | ✅ Branch ownership |
| `tenant_id` (FK → tenants) | 0018 | ✅ Tenant ownership (added in superadmin migration) |
| `machine_name` | 0001 | Display name |
| `device_id` | 0001 | UNIQUE per branch (`unique(branch_id, device_id)`) |
| `status` (active/inactive) | 0001 | ✅ |
| `connection_status` (unknown/online/offline/error) | 0001 | ✅ |
| `last_sync_at` | 0001 | ✅ |
| `last_error` | 0001 | ✅ |
| `machine_ip` | 0001 | Optional (for poll/IP-match) |
| `machine_api_url` | 0001 | For pull/poll mode |
| `api_key_encrypted` | 0001 | ⚠️ Stored cleartext (name is misleading) |
| `settings` (JSONB) | 0001 | Flexible settings bag |
| `provider` (generic/essl) | 0014 | ✅ Provider enum |
| `manufacturer` | 0014 | Optional |
| `model` | 0014 | Optional |
| `serial_number` | 0014 | Device lookup key |
| `device_identifier` | 0014 | Alternative device lookup key |
| `connection_mode` (push/pull/adms/unknown) | 0014 | ✅ |
| `last_seen_at` | 0014 | ✅ (separate from last_sync_at) |
| `allowed_ip` | 0014 | IP whitelist for security |
| `terminal_secret_hash` | 0016 | ✅ Hashed machine credential |
| `terminal_secret_created_at` | 0016 | ✅ |

**Multi-tenant support:** YES. `unique(branch_id, device_id)` constraint means two tenants CAN have devices with the same `device_id` string as long as they're in different branches. However, the device lookup in `findDeviceByField` queries globally (no tenant filter) — see P0 gap below.

---

## 4. Tenant Isolation Analysis

### Device Resolution — P0 GAP

```typescript
// biometric.service.ts
async function findDeviceByField(field, candidate) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("face_machine_settings")
    .select("*")
    .eq("status", "active")
    .eq(field, candidate)    // ← NO tenant_id or branch_id filter
    .limit(1)
    .maybeSingle();
}
```

**Risk:** If Tenant A's machine sends `device_id = "FACE-001"` and Tenant B also has a machine with `device_id = "FACE-001"` (different branches so no unique constraint violation), the query returns whichever row Supabase picks first. The subsequent `evaluateMemberStatus` checks `device.branch_id === member.branch_id` which prevents cross-tenant attendance creation, but the wrong device record would be loaded.

**In practice today:** Talwalkar uses `device_id = "FACE-DEV-002"` and the Demo Gym uses `device_id = "DEMO-FACE-ERIS"` — different values, so no current collision risk. The `findDeviceByIp` fallback limits to exactly 1 result and returns null if 2 match — that's a reasonable global protection.

**Classification:** P0 — requires a tenant-scoped device lookup when tenant context is available from headers/query.

### Member Lookup — Partial Gap

```typescript
async function findMembersByBiometricUserId(biometricUserId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("members")
    .select("id,branch_id,member_code,machine_user_id,full_name,status")
    .eq("machine_user_id", biometricUserId);  // ← No tenant filter
}
```

**Risk scenario:** Tenant A's member has `machine_user_id = "729"`. Tenant B's member also has `machine_user_id = "729"`. The query returns both. The code then checks `sameBranch = matches.find(row => row.branch_id === device.branch_id)` — this correctly scopes to the device's branch. Since a device belongs to one branch (and branch belongs to one tenant), this prevents cross-tenant attendance creation.

**Classification:** LIKELY SAFE (due to branch filter), but P1 improvement to add tenant_id or branch_id to the member query to reduce surface area.

### Attendance Creation

The `upsertAttendance` function uses `member.branch_id` (from the branch-scoped member lookup). Attendance records include both `member_id` and `branch_id`. Safe.

### Admin API Isolation

All admin API routes use `profile.branch_id` to scope queries. The `getBiometricMappings` function filters by `members.branch_id` via inner join. The `listNormalizedAttendance` function filters by `branch_id`. Safe for authenticated users.

---

## 5. Provider Abstraction

### Current State

The `provider` field exists in `face_machine_settings` (generic/essl enum) and `attendance_sync_logs`. The `BiometricRequestMetadata.provider` field in TypeScript is hardcoded to `"essl"`:

```typescript
// lib/biometric/http.ts — always sets provider to "essl"
metadata: {
  provider: "essl",
  ...
}
```

```typescript
// biometric.service.ts insertSyncLog — always writes "essl"
provider: "essl",
```

```typescript
// BiometricRequestMetadata type — only allows "essl"
export interface BiometricRequestMetadata {
  provider: "essl";   // ← hardcoded
  ...
}
```

### Provider Logic Assessment

| Component | Generic? | Notes |
|---|---|---|
| `lib/biometric/essl.ts` | PARTIALLY — named "essl" but handles both JSON and ADMS formats | **HARDCODED** name, but logic is generic |
| `parseBiometricRequest()` | GENERIC — auto-detects JSON/ADMS/form/query | ✅ |
| Verification mode mapping | GENERIC — maps both numeric and string modes | ✅ |
| Event type mapping | GENERIC | ✅ |
| HTTP metadata extraction | GENERIC | ✅ |
| `processBiometricPayload` | GENERIC — processes any device | ✅ |
| `provider: "essl"` in sync log | HARDCODED | P2 fix |
| `/iclock/*` routes | PROVIDER-SPECIFIC — iClock is ESSL/ZKTeco protocol | HARDWARE-SPECIFIC |
| `/api/biometric/essl/events` | PROVIDER-SPECIFIC in name, GENERIC in code | P2 rename |
| Mock scenarios | HARDCODED to ESSL device names | P3 |
| `face_machine_settings.provider` enum | GENERIC but only `generic` and `essl` | P2 — expand enum for new providers |

### Current Provider Support

| Connection Model | Status | Route |
|---|---|---|
| **A. Device pushes (ADMS/iClock)** | ✅ Fully supported | `/iclock/*` |
| **B. Device pushes (JSON)** | ✅ Fully supported | `/api/biometric/essl/events` |
| **C. SyncFyre polls device** | ⚠️ Partially — UI sync button, no automatic polling | `/api/face-machines/[id]/sync` |
| **D. Local bridge** | ❌ Not supported | — |
| **E. Vendor cloud webhook** | ❌ Not supported | — |
| **F. Manual import** | ❌ Not directly (member import exists, not biometric events) | — |

---

## 6. Raw Event Model

### `attendance_sync_logs` Schema

All raw events are stored with:
- `id` — surrogate PK ✅
- `branch_id` — tenant context via branch ✅
- `device_id` — device identifier ✅
- `machine_id` — FK to face_machine_settings ✅
- `machine_user_id` — raw user ID from machine ✅
- `event_type` — entry/exit ✅
- `event_at` — machine event timestamp ✅
- `event_received_at` — server receipt timestamp ✅
- `external_event_id` — idempotency key ✅
- `raw_payload` (JSONB) — original payload ✅ immutable after insert
- `normalized_payload` (JSONB) — extracted fields ✅
- `request_metadata` (JSONB) — HTTP metadata (path, headers, IP) ✅
- `provider` — device provider ✅
- `verification_method` — face/fingerprint/card/etc ✅
- `status` — processed/duplicate/rejected/unmatched/error ✅
- `processing_result` — detailed result code ✅
- `error_message` — reason for failure ✅
- `attendance_id` — FK to resulting attendance (if any) ✅
- `member_id` — resolved member (if any) ✅
- `duplicate_of_id` — FK to original if duplicate ✅
- `resolution_status` / `resolution_action` / `resolved_by` / `resolved_at` — manual resolution workflow ✅

**Immutability:** Raw events are INSERT-only. The `status`, `processing_result`, and resolution fields are updated when reprocessing, but `raw_payload`, `event_at`, `external_event_id` are never modified. **CONFIRMED IMMUTABLE RAW PAYLOAD** ✅

**Separate stages:** The pipeline does combine parsing + processing in one call, but the raw event is stored before and after processing. The raw_payload is always written. This is close to a two-stage model.

---

## 7. Idempotency

### Two-Layer Duplicate Detection — CONFIRMED ✅

**Layer 1 — Exact match:**
```typescript
SELECT id FROM attendance_sync_logs 
WHERE device_id = $deviceId AND external_event_id = $externalEventId
```
Unique constraint: `unique(device_id, external_event_id)` on `attendance_sync_logs`.

**Layer 2 — Time window:**
```typescript
SELECT id FROM attendance_sync_logs 
WHERE device_id = $deviceId AND machine_user_id = $userId
  AND event_type = $type AND status IN ('processed', 'duplicate')
  AND event_at BETWEEN ($timestamp - window) AND ($timestamp + window)
```
Window size: configurable via `BIOMETRIC_DUPLICATE_WINDOW_SECONDS` env (default 90s).

**External event ID generation** (when not provided by device):
```typescript
SHA256(deviceId + "|" + biometricUserId + "|" + timestamp + "|" + eventType + "|" + verificationMethod)
```
Deterministic — same event from the same device always produces the same ID.

**Assessment:** Idempotency is well-implemented and handles both machine-provided IDs and computed IDs.

---

## 8. Member Mapping Architecture

### Sources of Truth

| Source | Purpose | Used By |
|---|---|---|
| `members.machine_user_id` | **PRIMARY** — real-time processing | `findMembersByBiometricUserId()` → live attendance creation |
| `biometric_member_mapping` | **SECONDARY** — admin UI, reprocessing, workflow state | `getBiometricMappings()`, `reprocessUnmatchedAttendanceForMember()` |
| `member_machine_mappings` | **LEGACY TABLE** — exists in production DB, migration comment says "real import reconciliation data" | Unknown; NOT referenced by application code |

### Dual-Source Confusion — P1 GAP

The `assign_biometric_mapping` RPC atomically writes to BOTH `members.machine_user_id` AND `biometric_member_mapping`. This is correct when the mapping UI is used. However:

1. When migration `0014` ran, it backfilled `members.machine_user_id = member_code` for any members without a machine_user_id — creating 498 non-numeric "dummy" IDs for Talwalkar that don't match machine events.

2. The `biometric_member_mapping` table has `machine_user_id = NULL` for all 373 Talwalkar rows — these rows were presumably created via `generate_member_machine_user_id` which should populate the field but appears to have failed.

3. Live processing ignores `biometric_member_mapping` entirely. It only reads `members.machine_user_id`. The two tables can be out of sync.

### Multi-Device Support

**Current:** One member can only have ONE `machine_user_id`. The `assign_biometric_mapping` RPC uses `ON CONFLICT (member_id) DO UPDATE` — one mapping per member.

**Assessment:** No multi-device support for a single member today. P3 gap.

### Tenant/Branch Scoping

`biometric_member_mapping` has NO `tenant_id` or `branch_id` column. It's scoped only through the `member_id` FK → `members.branch_id`. The `getBiometricMappings` query uses `members!inner(...).branch_id` filter to scope correctly.

---

## 9. Device Health

### Current States

| State | How Set | Field |
|---|---|---|
| `online` | `markDeviceSeen(device, null)` after successful event batch | `connection_status` |
| `error` | `markDeviceSeen(device, message)` on any failure | `connection_status` |
| `unknown` | Default (never explicitly cleared after error) | `connection_status` |
| `offline` | Set by `face-machines/[id]/sync` when machine API fails | `connection_status` |

`last_seen_at` is updated on every push from a physical machine.  
`last_sync_at` is also updated (confusingly named — same as last_seen_at for push mode).

**Stale threshold:** Not defined in code. No automatic staleness detection.

**Classification:** P2 — no stale/drift detection, no distinction between "never received any data" vs "was online, now offline".

---

## 10. Connectivity Models

| Model | Supported | Route/Mechanism |
|---|---|---|
| Push (ADMS/iClock firmware) | ✅ YES | `/iclock/cdata`, `/iclock/registry`, `/iclock/getrequest`, `/iclock/devicecmd` |
| Push (JSON REST) | ✅ YES | `/api/biometric/essl/events` |
| Pull (admin-initiated sync test) | ⚠️ PARTIAL — one-shot test, no scheduler | `/api/face-machines/[id]/sync` |
| Machine terminal session | ✅ YES | `/api/machine/session` (for the machine.syncfyre.com interface) |
| Vendor cloud webhook | ❌ NO | — |
| Local bridge | ❌ NO | — |
| Polling scheduler/cron | ❌ NO | — |
| Manual event import | ❌ NO | — |

---

## 11. Credential Security

| Credential | Storage | Security Rating |
|---|---|---|
| `terminal_secret_hash` | SHA-based hash stored in DB | ✅ SECURE |
| `api_key_encrypted` | Stored in `face_machine_settings.api_key_encrypted` — name implies encryption but no encryption code found | ⚠️ NEEDS IMPROVEMENT |
| `BIOMETRIC_ADMS_SHARED_SECRET` | Environment variable only | ✅ SECURE |
| `BIOMETRIC_MOCK_MODE`, `BIOMETRIC_DIAGNOSTIC_MODE` | Environment variable only | ✅ SECURE |
| Device credentials returned by API | `terminal-credentials` route returns plaintext secret ONCE, never again | ✅ SECURE |
| Headers redaction | `sanitizeHeaders()` redacts `authorization`, `x-api-key`, `x-biometric-token`, `x-sync-secret` | ✅ SECURE |
| Supabase service role key | Environment only, never returned to browser | ✅ SECURE |

**The `api_key_encrypted` field name is misleading** — it holds an API key that is stored as-is (no encryption). Timing-safe comparison is used when validating it. P2 fix: rename to `api_key` and document, or actually encrypt it.

---

## 12. RLS / Security

### `face_machine_settings` RLS (post migration 0044)

```sql
-- Read: super_admin sees all; owner/admin/manager sees own tenant; staff sees own branch
-- Write: super_admin sees all; management sees own tenant OR own branch
```

**Assessment:** ✅ Correct after 0044. Before 0044, admin role bypassed tenant isolation — this was fixed.

### `attendance` RLS

```sql
attendance_staff: for all to authenticated
  using(app_role()='admin' OR (is_staff_user() AND branch_id=current_branch_id()))
```

**Issue:** `app_role()='admin'` — if `app_role()` for `owner` does NOT return `'admin'`, the owner can only read their own branch (via `is_staff_user()`). This is likely OK in practice since `is_staff_user()` covers owner-level staff.

### `attendance_sync_logs` RLS

```sql
sync_logs_staff: for select to authenticated
  using(app_role()='admin' OR (is_staff_user() AND branch_id=current_branch_id()))
```

Same issue as attendance. However, the admin-facing attendance routes use `createAdminClient()` (service role), bypassing RLS entirely. The branch isolation is enforced in code.

### `biometric_member_mapping` RLS

**Not found in any migration file.** The `biometric_member_mapping` table has NO RLS policy defined. All access goes through `createAdminClient()` (service role) in biometric-admin.service.ts, which bypasses RLS. This means any authenticated Supabase client with the service role key can read all mappings across all tenants.

**Classification:** P1 — table should have RLS even if app-level code uses admin client, as defence-in-depth.

---

## 13. Failure Handling

| Scenario | Handling |
|---|---|
| Device offline (machine not sending) | No detection; `connection_status` stays at last value until next push |
| VPS offline | Machine queues internally (ADMS firmware buffers); will re-send when VPS is back |
| Malformed payload | `INVALID_PAYLOAD` result, logged to sync_logs, returns OK to machine (prevents machine retry loop) |
| Unknown machine user | `MEMBER_NOT_FOUND` / `unmatched` status, logged, returns OK |
| Missing member mapping | Same as above |
| Missing device registration | `DEVICE_NOT_REGISTERED`, returns OK |
| Exact duplicate | Detected, not double-processed, returns OK |
| Window duplicate | Logged as duplicate, returns OK |
| Member inactive | `MEMBER_INACTIVE`, `rejected` status, returns OK |
| Expired membership | `MEMBERSHIP_EXPIRED`, `rejected` status, returns OK |
| Plan locked | `PLAN_LOCKED`, `rejected` status, **⚠️ not in CHECK constraint** |
| Late/out-of-order events | Not handled specially; processed in order received |
| DB error during upsert | `PROCESSING_ERROR`, logged if possible, returns OK |
| Cross-branch member | `WRONG_BRANCH`, `rejected`, returns OK |

**Dead-letter/quarantine:** All non-SUCCESS events remain in `attendance_sync_logs` with status `unmatched/error/rejected` and `resolution_status='open'`. The `reprocessUnmatchedAttendanceForMember` function provides manual recovery for unmatched events.

**Retry:** No automatic retry. The machine's firmware will re-send if it doesn't get HTTP 200. The code always returns 200/OK (with plain "OK" body), preventing infinite retry loops from the machine side.

---

## 14. PLAN_LOCKED Processing Result — P0 Gap

```typescript
// biometric.service.ts
processingResult: "PLAN_LOCKED",
```

But the `processing_result` CHECK constraint in the DB is:

```sql
check (processing_result in (
  'SUCCESS', 'MEMBER_NOT_FOUND', 'MEMBER_INACTIVE', 'MEMBERSHIP_EXPIRED',
  'MEMBERSHIP_FROZEN', 'WRONG_BRANCH', 'DUPLICATE_EVENT', 
  'DEVICE_NOT_REGISTERED', 'INVALID_PAYLOAD', 'PROCESSING_ERROR'
))
```

`PLAN_LOCKED` is NOT in this list. The `insertSyncLog` call with `processingResult: "PLAN_LOCKED"` will fail with a DB constraint violation. The outer try/catch in `processBiometricPayload` does not catch `insertSyncLog` errors — it will propagate and likely cause a 500.

**Classification: P0 — active bug that can cause errors when a tenant's plan is downgraded or a new device is created for a free tenant.**

---

## 15. Observability

### Current (from sync_logs + device status)

| Data | Available? | Where |
|---|---|---|
| Per-device event count | ✅ YES | `attendance_sync_logs.device_id` |
| Per-tenant event count | ✅ YES (via branch) | `attendance_sync_logs.branch_id` |
| Processing result breakdown | ✅ YES | `attendance_sync_logs.processing_result` |
| Unmatched events | ✅ YES | `resolution_status='open'` |
| Device connection status | ✅ YES | `face_machine_settings.connection_status` |
| Last seen | ✅ YES | `face_machine_settings.last_seen_at` |
| Last error | ✅ YES | `face_machine_settings.last_error` |
| Sync logs with full HTTP metadata | ✅ YES | `request_metadata` JSONB |
| SuperAdmin visibility of cross-tenant | ⚠️ PARTIAL — no SuperAdmin UI for this |
| Alerts on stale devices | ❌ MISSING |
| Sync lag metric | ❌ MISSING |
| Retry count | ❌ MISSING |
| Raw payload for debugging | ✅ YES (via diagnostic mode) |

---

## 16. Talwalkar Compatibility

**Current Talwalkar setup:**
- Machine: `FACE-DEV-002` (`Front Desk AiFace-ERIS`), provider `essl`, connection_mode `push`, status `active`
- Physical protocol: ADMS/iClock push to `/iclock/cdata`
- Member mapping: `members.machine_user_id` (mix of member codes and numeric machine IDs)
- Attendance: 4 rows (Aug 28–29, 2026)

**Compatibility guarantee:** Any future change to this architecture MUST:
1. Preserve `/iclock/*` routes with identical ADMS response format
2. Preserve `members.machine_user_id` as the live-processing lookup field
3. Not change the `unique(member_id, attendance_date)` constraint behavior
4. Not delete or migrate existing `attendance_sync_logs` records
5. Not change the `assign_biometric_mapping` RPC contract

---

## 17. Demo Architecture

### Current State — ✅ EXISTS

```
BIOMETRIC_MOCK_MODE=true → enables /api/biometric/devices/[id]/mock
  ↓
POST /api/biometric/devices/{device_uuid}/mock
  body: { scenario: "valid_face" | "unknown_member" | ... }
  ↓
Builds realistic payload (ESSL format or ADMS)
  ↓
Runs through FULL processBiometricPayload pipeline
  ↓
Creates real DB records (attendance_sync_logs, attendance)
```

**10 named test scenarios:** valid_face, unknown_member, inactive_member, expired_membership, wrong_branch, duplicate_scan, invalid_payload, unknown_verification_mode, multiple_events, adms_attlog.

**SAFETY CONCERN:** Mock events go through the same pipeline and write to the same tables as real events. There is NO `is_simulated` flag on sync logs or attendance records. A mock event creates a real `attendance` row that appears on the dashboard.

**Classification:** P2 — demo/test events should be marked as simulated and filterable.

---

## 18. Scalability

### Current Constraints

| Concern | Current State | Risk |
|---|---|---|
| Synchronous processing | Each push event is processed synchronously in the HTTP request | OK for current scale; P3 for high volume |
| DB queries per event | ~6 queries per event (device lookup, duplicate checks, member lookup, subscription lookup, attendance upsert, sync log insert) | OK for current; P3 for very high volume |
| `listNormalizedAttendance` limit | Hard-coded `limit: 200` | P2 — limits UI visibility |
| No queue/background processing | All processing is in-request | P3 — for 1000+ gyms |
| Per-tenant isolation at DB level | RLS + branch filters | ✅ OK |
| Polling not implemented | No cron for sync | P1 — some devices require polling |
| Device lookup global scan | No tenant scope on device resolution | P0 security concern |
| `biometric_member_mapping` has no branch_id | Relies on member FK | P1 |

---

## 19. Source-of-Truth Matrix

| Concept | Current Source | Notes |
|---|---|---|
| Tenant | `tenants` table | ✅ |
| Branch | `branches` table (has `tenant_id`) | ✅ |
| Device | `face_machine_settings` (has `branch_id` + `tenant_id`) | ✅ |
| Provider | `face_machine_settings.provider` enum | ⚠️ Only generic/essl |
| Machine User ID (canonical) | `members.machine_user_id` | Live processing uses this |
| Machine User ID (workflow) | `biometric_member_mapping.machine_user_id` | Admin UI + reprocessing |
| Raw Event | `attendance_sync_logs` | ✅ Immutable payload |
| Normalized Event | `attendance_sync_logs.normalized_payload` | ✅ |
| Attendance | `attendance` table | ✅ |
| Device Health | `face_machine_settings.connection_status + last_seen_at + last_error` | ✅ |
| Sync State | `attendance_sync_logs.resolution_status` | ✅ |
| Credentials | `face_machine_settings.terminal_secret_hash` (hashed) + `api_key_encrypted` (cleartext) | ⚠️ |
| Audit Log | `activity_logs` | ✅ (partial — not all biometric events logged here) |

---

## 20. Gap Analysis

### P0 — Security / Data Isolation Risks

| Gap | Description |
|---|---|
| P0.1 Device lookup no tenant scope | `findDeviceByField()` queries all active devices globally. Two tenants with the same device_id string (different branches) could collide. |
| P0.2 PLAN_LOCKED not in CHECK constraint | `attendance_sync_logs.processing_result` CHECK constraint doesn't include `'PLAN_LOCKED'`. Insert will fail with DB constraint violation when plan is locked. |

### P1 — Required for Generic SaaS

| Gap | Description |
|---|---|
| P1.1 Member lookup no branch filter | `findMembersByBiometricUserId()` scans all tenants; branch check happens after. Safe in practice but adds unnecessary DB load and surface area. |
| P1.2 `biometric_member_mapping` has no RLS | No row-level security on the mapping table. App uses admin client, but defence-in-depth requires RLS. |
| P1.3 No `tenant_id`/`branch_id` on `biometric_member_mapping` | Cannot efficiently query mappings by tenant without joining through members. |
| P1.4 Migration 0014 member_code backfill | Set `machine_user_id = member_code` for any member without one — created 400+ Talwalkar members with invalid machine IDs. New gym onboarding process needs to not set machine_user_id until a real machine ID is assigned. |
| P1.5 Polling/pull not implemented | Some device brands require the server to poll. New gym with a polling-only device cannot onboard without code changes. |
| P1.6 No device registration UI/self-service | Adding a device requires admin to INSERT a row. No guided UI flow for new gym owners. |

### P2 — Reliability Improvements

| Gap | Description |
|---|---|
| P2.1 `provider: "essl"` hardcoded in sync log writes | Should derive from device record's `provider` field |
| P2.2 `api_key_encrypted` stored cleartext | Field name implies encryption but none is applied |
| P2.3 Mock events not marked as simulated | Demo/test events create real attendance rows |
| P2.4 No stale device detection | No threshold/alert for devices that haven't been seen recently |
| P2.5 listNormalizedAttendance limit=200 | Caps admin attendance view; could miss events |
| P2.6 `BiometricRequestMetadata.provider` type hardcoded to `"essl"` | Should be `"essl" | "generic" | string` |

### P3 — Future Scale / Advanced Features

| Gap | Description |
|---|---|
| P3.1 Synchronous per-request processing | At high event volume (1000+ gyms), a background queue (Redis/SQS/Supabase Realtime) would be needed |
| P3.2 No multi-device per member | One member can only have one biometric ID |
| P3.3 No vendor cloud webhook support | No Hikvision/ZKTeco cloud webhook receiver |
| P3.4 No analytics/observability UI for SuperAdmin | No cross-tenant device health dashboard |

---

## 21. Target Architecture

The existing architecture is already close to the ideal. The target state is:

```
Physical Machine (any provider)
      │
Provider Adapter Layer (lib/biometric/essl.ts already covers this for ESSL/ADMS/JSON)
      │ standardized BiometricAttendanceEvent[]
      ▼
Ingestion Gateway (app/iclock/* + app/api/biometric/*)
  ├─ Plan check (KEEP as-is; fix PLAN_LOCKED enum gap)
  ├─ Device resolution (ADD tenant scope)
  └─ Security check (KEEP as-is)
      │
      ▼
Raw Event Store (attendance_sync_logs)
  ├─ KEEP immutable raw_payload
  ├─ FIX PLAN_LOCKED in CHECK constraint
  └─ ADD branch_id to biometric_member_mapping
      │
      ▼
Member Resolution
  ├─ PRIMARY: members.machine_user_id (KEEP — no change)
  ├─ SECONDARY: biometric_member_mapping (KEEP — fix NULL issue for Talwalkar)
  └─ ADD branch_id filter to findMembersByBiometricUserId
      │
      ▼
Attendance Engine (KEEP as-is — correct and working)
      │
      ▼
Dashboard / Reports (FIX entry_time_ist bug)
```

---

## 22. Implementation Phases

### Phase A — Critical Safety (P0 fixes, no data changes)

1. Add `'PLAN_LOCKED'` to `attendance_sync_logs.processing_result` CHECK constraint (migration)
2. Add tenant/branch scope to `findDeviceByField()` — pass device's tenant context from request metadata or fallback to branch lookup

### Phase B — Mapping Cleanup (P1, Talwalkar-safe)

3. Add `branch_id` column to `biometric_member_mapping` (migration, backfill via members)
4. Add RLS policy to `biometric_member_mapping`
5. Add `branch_id` filter to `findMembersByBiometricUserId()`
6. Fix migration 0014's `machine_user_id = member_code` backfill — add a migration that sets `machine_user_id = NULL` for members where the value matches `member_code` format AND no real numeric ID exists (Talwalkar-specific cleanup, but generic logic)

### Phase C — Provider Generalization (P2)

7. Derive `provider` in `insertSyncLog` from `device.provider` instead of hardcoding `"essl"`
8. Expand `provider` enum in `face_machine_settings` and `attendance_sync_logs` for additional providers
9. Add actual encryption for `api_key_encrypted` or rename + document

### Phase D — Demo/Simulation Safety (P2)

10. Add `is_simulated boolean default false` to `attendance_sync_logs` and `attendance`
11. Set `is_simulated=true` when mock mode is active
12. Filter simulated rows from dashboard and admin attendance views (by default)

### Phase E — New Gym Self-Service (P1)

13. Build device registration UI in `/admin/settings` or `/admin/machines`
14. Add connection test flow (already has `face-machines/[id]/sync` — just needs UI)
15. Add device onboarding wizard: provider selection → connection test → machine user discovery

### Phase F — Observability (P2–P3)

16. SuperAdmin cross-tenant device health view
17. Stale device detection (configurable threshold)
18. Sync lag alerts

---

## 23. Migration Requirements

| Migration | Content | Safety |
|---|---|---|
| 0046_plan_locked_processing_result | ALTER TABLE attendance_sync_logs CHECK constraint to add PLAN_LOCKED | Safe — additive |
| 0047_biometric_mapping_branch | ADD branch_id to biometric_member_mapping, backfill via members | Safe — backfill only |
| 0048_biometric_mapping_rls | CREATE POLICY on biometric_member_mapping | Safe — additive |
| 0049_member_machine_id_cleanup | SET machine_user_id=NULL where value = member_code format (only members with no verified biometric mapping) | **REQUIRES REVIEW** before Talwalkar execution |
| 0050_simulated_flag | ADD is_simulated to attendance + sync_logs | Safe — additive |

---

## 24. Rollback Strategy

All proposed migrations are additive (ADD COLUMN, ADD CONSTRAINT, ADD POLICY). None drop columns or tables.

- P0 Phase A migrations can be rolled back by removing the new CHECK value (alter constraint drop/recreate).
- Phase B migrations can be rolled back by dropping the branch_id column and policy.
- 0049 (machine_user_id cleanup) is the only migration that modifies member data — must have a dry-run preview before executing. Can be rolled back by re-running 0014's backfill logic.

---

## 25. Test Strategy

| Test | Type | What to verify |
|---|---|---|
| Device resolution with duplicate device_ids | Unit | Ensure tenant A's device returns tenant A's record |
| PLAN_LOCKED event storage | Integration | Confirm sync log is written without constraint error |
| Cross-tenant member lookup | Unit | Confirm machine_user_id match returns correct branch |
| Idempotency — exact duplicate | Integration | Same event twice → one attendance row |
| Idempotency — window duplicate | Integration | Two events within 90s → one attendance row |
| Reprocessing | Integration | After mapping, confirm historical unmatched events create attendance |
| Mock event isolation | Integration | Mock event does not appear in dashboard without filter |
| New gym device registration | E2E | Register device → test connection → map user → verify attendance |

---

## FINAL STATUS

**GENERIC SaaS READY:** PARTIAL

The core processing engine is generic and multi-tenant capable. The device schema is extensible. The idempotency model is solid. The primary gap preventing "fully generic SaaS ready" status is the global device lookup (P0.1) and the PLAN_LOCKED constraint bug (P0.2).

**TALWALKAR SAFE:** YES

No proposed changes break Talwalkar's existing flow. The `reprocessUnmatchedAttendanceForMember` function correctly handles historical unmatched events once member IDs are mapped. The physical machine reconnection and member mapping actions (documented in previous audit) use existing, tested code paths.

**CRITICAL P0 GAPS:**
- P0.1 — `findDeviceByField()` has no tenant scope → potential device collision between tenants sharing same device_id string
- P0.2 — `PLAN_LOCKED` not in `attendance_sync_logs.processing_result` CHECK constraint → DB error when triggered

**P1 GAPS:**
- P1.1 — `findMembersByBiometricUserId()` no branch filter (safe in practice, not architecturally clean)
- P1.2 — `biometric_member_mapping` has no RLS policy
- P1.3 — `biometric_member_mapping` has no `branch_id` column
- P1.4 — Migration 0014 backfilled `machine_user_id = member_code` creating invalid IDs for members without real biometric enrollment
- P1.5 — Poll/pull connectivity model not implemented
- P1.6 — No self-service device registration UI

**P2 GAPS:**
- P2.1 — `provider: "essl"` hardcoded in sync log writes
- P2.2 — `api_key_encrypted` stored cleartext
- P2.3 — Mock events not marked as simulated
- P2.4 — No stale device detection
- P2.5 — `listNormalizedAttendance` hard limit of 200 rows

**P3 GAPS:**
- P3.1 — Synchronous processing (fine for current scale)
- P3.2 — No multi-device per member
- P3.3 — No vendor cloud webhook support
- P3.4 — No SuperAdmin observability dashboard
