# Generic Biometric SaaS Architecture — Audit + Implementation Plan

Status: **READ-ONLY AUDIT. No source file, schema, migration, or tenant data was changed to produce this document**, with one unrelated exception noted below. Every finding was confirmed by reading the live repository (staged from the connected `SyncTyre` folder) on 2026-09-17, cross-checked against a prior independent audit already in the repo, `docs/BIOMETRIC_SAAS_READINESS_AUDIT.md` (dated 2026-09-10, "Kiro AI"). That audit's findings were re-verified line-by-line against the current source in this pass; where noted, this document supersedes/extends it rather than duplicating it.

*Unrelated to this audit: a live hydration-error bug report arrived from the user mid-session (`components/layout/portal-shell.tsx`, a redundant manual `<Suspense>` wrapper around `{children}` that didn't match Next's own router-injected Suspense boundaries). That one-line fix was applied and committed separately, outside and before this audit's scope — it is not a biometric file and did not touch anything this document covers.*

---

## 0. Verdicts (per the requested execution-mode report)

**GENERIC SaaS READINESS: PARTIAL**

The architecture is *structurally* generic and multi-tenant already — device, branch, and tenant isolation are real and enforced in code and RLS, the parser is vendor-neutral despite its filename, idempotency is solid, and raw-event preservation already exists. What is missing is a **formal provider adapter boundary** (there is one parser, not a registry of adapters) and **two confirmed hardcodes** that block a second real, differently-configured gym: `provider: "essl"` is written unconditionally instead of read from the resolved device, and the attendance-date timezone is hardcoded to `"Asia/Kolkata"` in four places. Neither is a rewrite — both are narrow, mechanical fixes to existing call sites.

**TALWALKAR SAFETY: SAFE**

No Talwalkar-specific ID, IP, credential, or business-logic branch exists anywhere in the biometric code path (grep-confirmed, see §21). Talwalkar's device row, mappings, and attendance history are untouched by this audit and are not proposed to be touched by any P0/P1 fix below — every fix operates on *code paths*, not on Talwalkar's *data*.

**P0** (blocks onboarding a second real gym with different provider/timezone needs): remove the two hardcodes (§5, §9 below).
**P1** (should do before scaling past a handful of tenants): formal `BiometricProvider` adapter interface; encrypt/rename `api_key_encrypted`; add `branch_id` directly to `biometric_member_mapping`; device health/sync-monitoring surface; confirm RLS on all four biometric tables explicitly (one is unconfirmed).
**P2** (polish): per-device rotating secrets instead of global shared secrets; cosmetic file/route naming; demo-mock scoping and explicit simulated-event tagging; provider folder structure if/when a second real provider is actually onboarded.

---

## 1. Current architecture

SyncFyre already runs one real biometric pipeline, not a prototype. Every ingestion endpoint funnels into the same core function, `processBiometricPayload()` in `services/biometric.service.ts`, regardless of which route or protocol the device used to reach the server:

```
Physical device / terminal
        │
        ▼
Ingestion endpoints (all call the same pipeline):
  POST /api/biometric/essl/events     (JSON / ADMS text / form / query — generic despite the path name)
  POST /api/attendance/sync           (batch JSON, x-sync-secret header)
  POST /api/machine/attendance        (single punch, machine terminal session cookie)
  POST /api/biometric/devices/[id]/mock  (simulator — same pipeline, admin/manager auth + BIOMETRIC_MOCK_MODE)
        │
        ▼
buildBiometricRequestMetadata()   ← lib/biometric/http.ts   (IP, headers, body — hardcodes provider:"essl", §5)
        │
        ▼
processBiometricPayload()         ← services/biometric.service.ts
  ├─ resolveBiometricDevice()        serial_number → device_identifier → device_id → id → machine_ip/allowed_ip
  │                                   queries face_machine_settings; returns tenant_id + branch_id with the device
  ├─ ensurePaidCommercialPlanForBranch()   ← services/entitlements.service.ts (see §17 — a SECOND, legacy evaluator)
  ├─ validateDeviceSecurity()         IP allowlist + shared/per-device secret, timing-safe compare
  ├─ parseBiometricRequest()          ← lib/biometric/essl.ts (vendor-neutral despite the filename, §11)
  └─ processBiometricAttendanceEvent()  (per parsed event)
        ├─ findExactDuplicate()        attendance_sync_logs, device_id + external_event_id
        ├─ findWindowDuplicate()       attendance_sync_logs, 90s window (configurable)
        ├─ evaluateMemberStatus()      branch-scoped member lookup → status → subscription
        ├─ upsertAttendance()          attendance table, upsert on (member_id, attendance_date)
        └─ insertSyncLog()             attendance_sync_logs (raw payload always preserved)

Device registry:      face_machine_settings   (tenant_id auto-derived from branch_id by trigger, §4)
Raw event log:        attendance_sync_logs    (immutable-in-practice, branch/tenant scoped)
Business attendance:  attendance
Member↔device mapping: members.machine_user_id (primary, read by the pipeline) + biometric_member_mapping (richer workflow table, kept in sync by one DB function)
```

This already matches the target data flow in the brief (device → ingestion → device resolution → tenant/branch resolution → raw storage → normalization → member resolution → attendance → reports) almost exactly — the gaps are named precisely in the sections below, not invented generically.

## 2. Target architecture (what changes, framed against what exists)

The target is explicitly **an evolution**, not a new pipeline: keep `processBiometricPayload()` as the single entry point, keep `face_machine_settings`/`attendance_sync_logs`/`attendance`/`biometric_member_mapping` as the four tables, and add exactly three things on top: (a) a `BiometricProvider` adapter interface that the existing parser is wrapped in rather than replaced by, (b) a branch/tenant-resolved timezone instead of a hardcoded one, and (c) a device-health/sync-monitoring read model over data the schema mostly already has. No new device table, no new tenant/branch resolution mechanism (the existing one is already correct), no new idempotency mechanism (the existing one is already correct).

## 3. Data flow

Covered fully in §1's diagram; every arrow in the brief's target flow (`DEVICE → CONNECTION/INGESTION → DEVICE RESOLUTION → TENANT+BRANCH RESOLUTION → RAW EVENT STORAGE → NORMALIZATION → MEMBER RESOLUTION → ATTENDANCE ENGINE → ATTENDANCE RECORD → DASHBOARD/REPORTS`) has a real, already-built function behind it today; none of the arrows are missing, only the provider-selection and timezone-selection steps inside two of those boxes need to become dynamic instead of hardcoded.

## 4. Device model / registry

`face_machine_settings` already carries effectively every field the brief asks for, confirmed column-by-column against migrations `0014`, `0016`, `0018`, `0044`:

| Requested field | Existing column | Notes |
|---|---|---|
| device_id | `device_id` | app-facing identifier |
| tenant_id | `tenant_id` | **auto-synced from `branch_id` by a trigger** (`sync_face_machine_tenant_id`, migration 0018) — cannot drift from the branch it belongs to |
| branch_id | `branch_id` | required, FK |
| provider | `provider` | column exists; **not yet read by the pipeline** (§5) |
| manufacturer, model, serial_number | same names | present |
| external_device_id | `device_identifier` | present, used in device resolution |
| connection_type | `connection_mode` (`push`\|`pull`\|`adms`\|`unknown`) | present |
| endpoint | `machine_api_url` | present |
| status | `status` (`active`\|`inactive`) | present |
| last_seen_at, last_sync_at, last_error | same names | present, updated by `markDeviceSeen()` on every request |
| configuration | `settings` (jsonb) | present |
| created_at/updated_at | present | standard |

Not present, and not requested explicitly but worth naming: `port` and a first-class `health_status` enum (derived today, not stored — see §13). **No duplicate device table is needed or proposed.** The device-to-tenant/branch binding is already unambiguous and already enforced at the database level (the trigger), which is stronger than the brief's minimum ask (it asks that a device "must explicitly belong to" tenant+branch; here it structurally cannot belong to a tenant other than the one its branch belongs to).

Confirmed device-identifier collision safety: `resolveBiometricDevice()` matches by `serial_number` → `device_identifier` → `device_id` → `id`, each queried as its own field with no cross-tenant filter needed because these are meant to be globally-unique identifiers per field (a `serial_number` uniquely identifies one physical unit). **`device_id` (the app-facing string like `DEVICE-001`) is not declared globally unique in the schema** — migration 0044's comment confirms a `unique(branch_id, device_id)` constraint exists (it explicitly names a device `DEMO-FACE-ERIS` "to satisfy the unique(branch_id, device_id) constraint" alongside Talwalkar's `FACE-DEV-002`), meaning **`device_id` is scoped per-branch, exactly matching the brief's "Tenant A: DEVICE-001, Tenant B: DEVICE-001, both independently supported" requirement — already true today.**

## 5. Provider abstraction

**This is the one real structural gap**, and it is the same gap the prior Kiro audit already found (P0-1 there): there is no `BiometricProvider` interface or adapter registry. What exists instead is one function, `parseBiometricRequest()` in `lib/biometric/essl.ts`, whose actual logic (confirmed by reading the full file) is **already vendor-neutral** — it branches on payload *shape* (JSON array/rows/attlogs, ADMS newline-delimited text, form-encoded, query-string), not on a vendor name, and normalizes any of eight+ common field-name spellings (`userId`/`user_id`/`machine_user_id`/`employeeCode`/…) into one `BiometricAttendanceEvent`. **A second vendor whose devices send standard JSON or ADMS text already works today with zero code changes** — the gap is only that nothing *selects* a provider identity, records it correctly, or would let a genuinely different protocol (binary, REST-pull, vendor-cloud-poll) plug in without editing this file directly.

Confirmed hardcode sites for `provider: "essl"` (all four still present, re-verified against current source, matching the prior audit exactly):

1. `lib/biometric/http.ts:70` — `buildBiometricRequestMetadata()` sets it before the device is even resolved.
2. `lib/biometric/types.ts:63` — `BiometricRequestMetadata.provider` is typed as the literal `"essl"` only (and `RegisteredBiometricDevice.provider` is typed `"generic" | "essl"` — already narrower than the DB, which only constrains it to those same two values today: `check (provider in ('generic', 'essl'))`, migration 0014).
3. `services/biometric.service.ts:340` — `insertSyncLog()` writes `provider: "essl"` into `attendance_sync_logs` regardless of the resolved device's actual `provider` column.
4. `app/api/attendance/sync/route.ts:51` and `app/api/machine/attendance/route.ts:18` — both inline-construct metadata with `provider: "essl"` for the same reason.

**Recommended design (not implemented — audit only):** define the interface the brief asks for —

```ts
interface BiometricProvider {
  id: string;                      // matches face_machine_settings.provider
  capabilities: { push?: boolean; pull?: boolean; cloudApi?: boolean; webhook?: boolean };
  parse(payload: unknown, metadata: BiometricRequestMetadata, device: RegisteredBiometricDevice): ParsedBiometricPayload;
  testConnection?(device: RegisteredBiometricDevice): Promise<{ ok: boolean; message?: string }>;
  healthCheck?(device: RegisteredBiometricDevice): Promise<{ status: DeviceHealthStatus; message?: string }>;
}
```

— and register the existing, already-generic `parseBiometricRequest()` as the implementation for a `"generic"` (or `"adms"`) provider entry, so the *existing* logic becomes the default adapter rather than being thrown away. Widen `face_machine_settings.provider` and the corresponding TypeScript types from the closed `"generic" | "essl"` union to an open registry key (`text`, validated against the adapter registry's known ids rather than a hardcoded SQL `check` list, so adding a provider is a code-level registry entry, not a migration). Then: after `resolveBiometricDevice()` returns a device, set `metadata.provider = device.provider` once, in one place, before `insertSyncLog()` and before the parser is invoked — this single change (not four separate ones) removes all four hardcodes at their root, since 3 of the 4 sites currently duplicate a literal that should instead be threaded from the device. A vendor with a genuinely different transport (binary protocol, REST-pull, cloud webhook) gets a new adapter implementing the same interface, registered under a new `provider` id — no change to `biometric.service.ts`'s orchestration logic.

## 6. Connection types

| Type in the brief | Existing support | Evidence |
|---|---|---|
| Device → SyncFyre push | ✅ Yes | `/api/biometric/essl/events`, `connection_mode: "push"` |
| SyncFyre → device polling | ❌ Not implemented | No polling loop exists anywhere in the codebase; `connection_mode` has a `"pull"` value reserved in the schema but nothing reads it to drive a poll |
| Local bridge → SyncFyre | ✅ Partially, via push | A local bridge that forwards ADMS-text or JSON to `/api/biometric/essl/events` works today identically to a device pushing directly — no bridge-specific code needed |
| Vendor cloud → SyncFyre | ❌ Not implemented | No outbound HTTP client to a vendor's cloud API exists |
| Webhook | ✅ Structurally, via push | The push endpoints already are webhooks in shape (unauthenticated-by-secret POST with a JSON/text body); a vendor's own webhook format would need its own adapter (§5) but the receiving mechanics (route, secret validation, device resolution) are reusable as-is |
| Manual/imported events | ⚠️ Partial | `reprocessUnmatchedAttendanceForMember()` (§8) retroactively creates attendance from already-stored raw events after a mapping is fixed — this is a form of manual reprocessing, but there is no UI/API to hand-enter a one-off attendance event outside the biometric pipeline (that exists elsewhere in the app, outside biometric scope, and is out of scope here) |

`connection_mode` already exists as a per-device field precisely so a future polling or cloud-pull adapter can be selected per device without a schema change — the column is ahead of the code that would act on it. Recommended: implement `pull`/`cloudApi` support only when a specific vendor is actually being onboarded that needs it (per the brief's own instruction in §14/17 not to build unrequested integrations speculatively).

## 7. Tenant/branch isolation

Every event is resolved device-first, exactly as the brief requires, never member-first:

```
incoming request → device candidate (serial/identifier/id/IP) → face_machine_settings row
  → device.tenant_id, device.branch_id (already attached to the resolved row)
  → THEN, and only then: machine_user_id → member lookup, filtered to device.branch_id
```

Confirmed in `evaluateMemberStatus()` (`biometric.service.ts`): it queries `members` by `machine_user_id` with no `branch_id` filter in the SQL itself, then filters in application code to `matches.find(row => row.branch_id === device.branch_id)` before using any result. This is safe in effect — no cross-branch member is ever returned to a caller or used to create attendance — but it is a query-shape inefficiency worth a P2 note: it pulls every member across every tenant sharing that `machine_user_id` into server memory before filtering, rather than filtering in the query. **This already correctly supports the brief's explicit requirement** ("Device A → machine_user_id 729 → Member X; Device B → machine_user_id 729 → Member Y, if different tenants/branches") because `machine_user_id` is not a global-uniqueness constraint in the schema — only `biometric_member_mapping.machine_user_id` has a unique index, and that index is *not* branch/tenant-scoped either (see §8's exact citation), so two different tenants' members legitimately can and do share the same `machine_user_id` value; the branch filter is what keeps them from ever resolving to each other.

Device isolation: confirmed multi-tenant safe by the `unique(branch_id, device_id)` constraint (§4) and by RLS (§18).

## 8. Mapping architecture

**One canonical mapping source, confirmed**: `members.machine_user_id` is what `evaluateMemberStatus()` — the only function in the *live ingestion path* that resolves a punch to a member — actually reads. `biometric_member_mapping` is a richer workflow table (adds `match_status`, `verified`, `machine_name`) used by the **admin mapping UI** (`biometric-admin.service.ts`) but not read by the ingestion pipeline itself. These are kept from becoming two competing sources of truth by one atomic function, `assign_biometric_mapping()` (migration 0021, `security definer`), which writes `members.machine_user_id` and upserts `biometric_member_mapping` in the same transaction, and which explicitly rejects reassigning a `machine_user_id` that's already claimed by another *active* member unless `allow_reassign` is passed. **This answers the brief's §9 question directly, from evidence, not theory**: `members.machine_user_id` is and should remain canonical for the ingestion pipeline; `biometric_member_mapping` is and should remain the workflow/audit layer around it, written through the same RPC — not a second live-path source.

Exact uniqueness scope, read from migration 0021: `biometric_member_mapping_machine_user_id_key` is a unique index on `machine_user_id` **with no branch or tenant qualifier** (`where btrim(machine_user_id) <> ''`, nothing else). This means, as written today, `assign_biometric_mapping()` would currently refuse to let Tenant B assign `machine_user_id = "729"` to a member if Tenant A already has *any* member (active or not, in the `biometric_member_mapping` row's case) mapped to `"729"` — a real constraint mismatch against the brief's explicit multi-tenant same-ID requirement, *for the admin-assigned mapping table*, even though the live ingestion path (`evaluateMemberStatus`, §7) already handles the same-ID-different-tenant case correctly by filtering on branch. **This is a genuine, previously-undocumented gap** (not raised by the prior Kiro audit): the mapping-assignment path and the ingestion-resolution path currently disagree about whether `machine_user_id` is globally or branch-scoped unique. Recommended fix (design only): change `biometric_member_mapping_machine_user_id_key` to a composite unique index scoped by branch (via a join, or by adding `branch_id` directly to the table — which also closes the prior audit's P1-3 finding about the missing direct `branch_id` column in one move) rather than leaving `machine_user_id` globally unique.

## 9. Raw events

Already fully implemented and already retained, not destroyed after processing — `attendance_sync_logs` stores `raw_payload`, `normalized_payload`, `request_metadata` (sanitized headers, path, query, IP), `event_received_at`, `processing_result`, and `duplicate_of_id`, for every single ingestion attempt including rejected, duplicate, unmatched, and error outcomes (confirmed: `insertSyncLog()` is called on every branch of `processBiometricPayload()`, not only on success). This already satisfies the brief's §5 requirement in full — replay, debugging, reconciliation, and support are all already possible from this table today. Second confirmed hardcode, timezone: `eventDate()` in `biometric.service.ts` (line ~87), `istDate()` and the `+05:30` literal query offsets in `biometric-admin.service.ts`, and the attendance-date calculation inside `reprocessUnmatchedAttendanceForMember()` in `biometric-mapping.service.ts` all hardcode `"Asia/Kolkata"`. A gym in a different timezone gets attendance recorded on the wrong calendar date near midnight. Recommended fix (design only): add a `timezone` column to `branches` (default `"Asia/Kolkata"`, so every existing tenant's behavior is byte-for-byte identical after the migration — no backfill needed beyond the default), thread it from the already-resolved `device.branch_id` into these four functions.

## 10. Normalization

Already implemented exactly as specified: `BiometricAttendanceEvent` (`lib/biometric/types.ts`) is the one internal contract every format converges to — `eventId`, `deviceId`, `biometricUserId`, `timestamp`, `verificationMethod`, `eventType`, `source`, plus the original `rawPayload`. All format-specific parsing (`parseJsonPayload`, `parseAdmsPayload`, `parseAdmsLine`, the field-name alias lists) lives inside `lib/biometric/essl.ts` only; `biometric.service.ts` (the attendance engine's caller) never inspects a raw payload shape itself — it only ever touches the normalized `BiometricAttendanceEvent`. This already matches the brief's "provider-specific parsing must remain inside the adapter; the attendance engine must not contain provider-specific parsing logic" requirement.

## 11. Attendance engine

Already separated from ingestion concerns as specified: `processBiometricAttendanceEvent()` handles exact-duplicate check → window-duplicate check → member/subscription evaluation → upsert with entry/exit min/max merge, and contains zero format-specific or provider-specific logic — it operates purely on the normalized `BiometricAttendanceEvent`. Multiple-punches-per-day, out-of-order events (the entry/exit merge takes `Math.min`/`Math.max` across repeated punches, so an out-of-order duplicate scan can only tighten or widen the recorded window, never corrupt it), and member/branch/subscription status are all handled here. Overnight/cross-midnight cases are governed by the same timezone hardcode noted in §9 — fixing that fix applies here too, not as a separate change.

## 12. Idempotency

Already solid, and the prior audit's assessment is confirmed unchanged: exact-duplicate detection by `(device_id, eventId)` where `eventId` is either the provider's own `external_event_id` (preferred, when present) or a SHA-256 of `(deviceId, biometricUserId, timestamp, eventType, verificationMethod)` — **not** the naive `machine_user_id + timestamp` the brief explicitly warns against; the fallback hash includes the device and event type too, meaningfully reducing collision risk versus that naive version. A secondary 90-second window-duplicate check (`BIOMETRIC_DUPLICATE_WINDOW_SECONDS`, configurable) catches near-duplicate scans that wouldn't hash identically (e.g., a slightly different reported timestamp for the same physical punch). Attendance itself is written via `upsert(..., onConflict: "member_id,attendance_date")`, making replays of the same logical event safe at the database level regardless of application-layer duplicate detection — two independent layers of protection. **No changes recommended here** — this already meets the brief's requirement to preserve, not replace, working idempotency.

## 13. Device health

**Data exists (`status`, `connection_status`, `last_seen_at`, `last_sync_at`, `last_error`, all updated on every request by `markDeviceSeen()`); a consistent, documented health-state calculation does not yet exist.** `connection_status` today is a simple three-value field (`unknown`/`online`/`error`) set directly by whether the last request errored — there is no `OFFLINE` or `STALE` state and no threshold-based staleness detection (a device that stopped sending events entirely, rather than erroring, stays `"online"` forever). Recommended design (not implemented): compute a derived health status rather than storing a fourth state column —

```
ONLINE   : connection_status = "online" AND now() - last_seen_at < staleness_threshold
STALE    : connection_status = "online" AND now() - last_seen_at >= staleness_threshold
ERROR    : connection_status = "error"
OFFLINE  : last_seen_at is null, or status = "inactive"
UNKNOWN  : connection_status = "unknown" (never contacted)
```

with `staleness_threshold` a documented, explicit default (e.g., 24 hours — a gym device that hasn't punched anyone in a full day is worth flagging) rather than an invented arbitrary number left undocumented, per the brief's own instruction. A `retry_count` field does not exist and is not proposed — the push-based architecture here doesn't retry outbound to the device, so a retry counter would have no real meaning; what matters operationally is staleness, which the above covers.

## 14. Sync monitoring

No dedicated cross-device/cross-tenant sync-monitoring surface exists today. `app/(superadmin)/superadmin/devices/page.tsx` is the closest thing — it lists every device with provider, connection status, integration status, and last sync time, across all tenants, SuperAdmin-only. It does **not** show sync lag, unmatched-user counts, or failed-event counts per device (those exist as raw data in `attendance_sync_logs` but aren't aggregated onto this page). Tenant-side, `services/machine-management.service.ts`'s `getMachineManagementData()` already computes `todayEvents` per device, correctly tenant/branch-scoped (confirmed: it explicitly scopes by `branch_id` when available, falls back to `tenant_id` for a cross-branch admin, and comments that this is "defence-in-depth alongside RLS" for the case both are null) — a good foundation, just missing unmatched-count and failed-event-count columns. Recommended: extend both existing read models (not build a new one) to also surface `unmatched_users` (count of `attendance_sync_logs` with `status='unmatched'` in a rolling window) and `failed_events` (`status='error'`) per device, and add those columns to both the SuperAdmin devices page and the tenant-side machine management page.

## 15. Failure handling

| Scenario | Current handling |
|---|---|
| Malformed payload | `INVALID_PAYLOAD` result, sync log written, event not silently dropped |
| Unknown device | `DEVICE_NOT_REGISTERED`, diagnostic log written if `BIOMETRIC_DIAGNOSTIC_MODE=true`, request still returns 200 "OK" to the device (correct — most hardware terminals treat a non-200 as a reason to retry-storm) |
| Unknown member | `MEMBER_NOT_FOUND`, stored as `unmatched`, never discarded |
| Wrong branch | `WRONG_BRANCH`, stored as `rejected`, never silently merged into another branch |
| Duplicate event | `DUPLICATE_EVENT`, logged with `duplicate_of_id` pointing at the original |
| Partial batch failure | Per-event try/catch inside the processing loop; one event's exception does not stop the rest of the batch from being attempted; overall HTTP status reflects whether *all* events in the batch failed (502/422) vs partial success (200) |
| Network timeout / device offline | Not directly applicable — this is a push architecture, so SyncFyre never calls the device and cannot time out against it; a device that stops pushing is invisible until it starts again (this is what §13's staleness detection is for) |
| Provider API failure, HTTP 500/429 from a vendor cloud | Not yet applicable — no outbound vendor-cloud calls exist yet (§6); relevant only once a `cloudApi`/`pull` adapter is built |

No dead-letter queue exists and **none is recommended** at current volume — every failure mode already lands in `attendance_sync_logs` with a specific `processing_result`, which functions as the dead-letter/quarantine store already (nothing is truly lost, it's just labeled by outcome rather than routed to a separate table), consistent with the brief's own instruction not to add queue infrastructure the current volume doesn't need.

## 16. Credential security

| Credential | Storage today | Assessment |
|---|---|---|
| `MACHINE_SESSION_SECRET` | Env var, ≥32 chars enforced at read time | Server-only, never exposed |
| `terminal_secret_hash` | DB, SHA-256 hash only | Original secret shown once at provisioning, never persisted — good |
| `api_key_encrypted` | DB column, **plaintext despite the name** | **P1 finding, confirmed still present.** The column name implies encryption that isn't actually applied. |
| `BIOMETRIC_ADMS_SHARED_SECRET`, `ATTENDANCE_SYNC_SECRET` | Env vars, global (one value for every tenant) | Not per-tenant; a leak compromises every tenant's ingestion endpoint simultaneously (P2) |
| Supabase service-role key | Env var | Server-only, `createAdminClient()` never reaches the browser |

`sanitizeHeaders()` in `http.ts` (confirmed by reading it) redacts `authorization`, any header containing `secret`/`token`, and `x-api-key` before anything is stored in `attendance_sync_logs.request_metadata` — credentials are not written into the raw-event audit trail. **No API response anywhere in the biometric surface returns a secret**: `getMachineTerminalDevices()` explicitly strips configuration/secrets and returns only `{id, machine_name, device_id, connection_status, last_seen_at}` (confirmed by its own type annotation, "Configuration secrets are intentionally excluded"). Recommended: rename `api_key_encrypted` → `api_key` (cheapest, removes the false claim) or actually encrypt it with a server-side key (bigger, requires a migration) — a product decision, not made here.

## 17. Entitlement integration

**A previously-undocumented finding, not in the prior Kiro audit**: biometric feature gating currently goes through **two separate entitlement code paths reading the same `tenants.plan` column through two different mapping functions**, not one:

1. **Route-level (middleware.ts)**: `/admin/machines`, `/api/biometric`, `/api/face-machines`, `/api/machine` are all mapped to the `"biometric"` feature key in `FEATURE_ROUTE_PREFIXES`, evaluated by the canonical `evaluateFeature()` from `lib/entitlements/evaluate.ts` (`FEATURE_REGISTRY.biometric.phase = "phase_2"`, i.e., Growth or Scale).
2. **Ingestion-level (`biometric.service.ts`)**: `ensurePaidCommercialPlanForBranch(device.branch_id, "Biometric / Face Attendance")` calls `services/entitlements.service.ts`, which calls `getCommercialPlanTier()` from the **older, separate** `lib/entitlements.ts` file — a binary free/paid mapping (`trial`/`standard` = free, `professional`/`enterprise` = paid), not the phase-based evaluator.

Both currently produce the same practical outcome (Essential-tier tenants are locked out either way, since `plan_1` maps to "free" in the legacy mapping and phase_2 requires `plan_2`+ in the canonical one) — **but they are two independent implementations of the same rule**, which is exactly the kind of drift risk the brief's "do NOT create another plan evaluator" instruction is meant to prevent; this audit does not add a third evaluator, and flags that a future cleanup (not part of this task) should point `ensurePaidCommercialPlanForBranch` at the canonical `hasCurrentFeature("biometric")` instead of the legacy tier check, so there is exactly one evaluator, not two. **This is a documentation finding, not a P0 — current behavior is correct, just duplicated.**

`PLAN_LOCKED` handling already meets the brief's exact requirement: when the entitlement check fails, `processBiometricPayload()` returns `PLAN_LOCKED`, calls `markDeviceSeen()` (so the device isn't falsely flagged offline), **does not create an attendance record**, and **does still write the raw event to `attendance_sync_logs`** with `processing_result: "PLAN_LOCKED"` — nothing is silently dropped. No "paid/free" string is hardcoded into this path; it reads the resolved tenant plan through the (legacy, but real) evaluator each time. This requirement is **already fully met**.

## 18. RLS / server-side isolation

Confirmed directly from `0044_machine_rls_tenant_scope.sql` (the RLS policy definitions were read in full, not inferred): `face_machine_settings` read/write policies are `is_super_admin() OR (management role AND tenant_id = current_tenant_id()) OR (staff user AND branch_id = current_branch_id())` — properly tenant- and branch-scoped, and this migration explicitly documents fixing a prior bug where admin users could see another tenant's machines (a real historical bug, already fixed, not a current gap). `machine-management.service.ts` additionally applies its own tenant/branch filter as defense-in-depth even when using the plain (RLS-subject) client, and explicitly comments why when using the service-role admin client elsewhere (RLS is bypassed for service role, so the query itself must enforce isolation — confirmed done everywhere the admin client is used for biometric reads). RLS status on the other three biometric tables, reconciled against the prior audit's "UNKNOWN" flag: `attendance_sync_logs` and `attendance` inherit the standard per-table branch-scoped policy pattern established in `0001_initial_schema.sql` for every core business table (not re-read in full for this pass, but this is the same table family already governed by that migration's generic per-table RLS loop, not a special case) — **`biometric_member_mapping` is the one table this audit could not confirm has RLS at all**: migration `0021_biometric_member_mapping_workflow.sql` creates the table and its functions but does not itself enable RLS or define a policy on it, and no later migration reviewed in this pass adds one either. Every read of it in application code goes through `createAdminClient()` (service role, bypasses RLS by design) with the isolation enforced in the query itself (branch filter via the `members!inner` join) — which is safe in practice for the paths audited, but it means the table currently has **no independent RLS backstop** the way `face_machine_settings` does. **Recommended P1**: add the same tenant/branch-scoped RLS pattern to `biometric_member_mapping` (via a join to `members` for the branch check, since it has no direct `branch_id` column yet — see §8's related recommendation to add one, which would make this RLS policy simpler too).

## 19. Demo architecture

A real simulator already exists and already reuses the production pipeline exactly as the brief demands: `POST /api/biometric/devices/{id}/mock` requires `BIOMETRIC_MOCK_MODE=true` and an authenticated admin/manager, builds a payload for one of ten named scenarios (valid scan, unknown member, inactive member, expired membership, wrong branch, duplicate, invalid payload, unusual verification code, multi-event batch, ADMS text format), and passes it through **the exact same `processBiometricPayload()`** real devices use — device resolution, plan check, security validation, parsing, duplicate detection, member evaluation, attendance upsert, sync logging, all identical. This already satisfies "do not create a completely separate fake attendance system."

Two gaps versus the brief's more specific ask: (1) the mock endpoint is not restricted to devices belonging to a tenant classified `is_demo=true` (the tenant governance flag documented in the plan-expiry audit's §6) — today any admin/manager can trigger it against any device their role can see, including a real customer's device, so simulated events could in principle land in a real tenant's attendance data if misused; (2) simulated events are distinguished only by convention (fixed synthetic IDs like `MEMBER_TEST_001` that don't match real members) rather than an explicit `is_simulated` flag on the resulting `attendance_sync_logs`/`attendance` rows, so a report can't cleanly filter "real vs. simulated" without knowing those magic strings. Recommended (design only): gate the mock route additionally on `assertDemoOperationAllowed(tenant)` (the existing governance function from `lib/tenants/governance.ts`, already used elsewhere for demo-only operations) so it can only be exercised against a device belonging to a properly classified demo tenant, and add a `simulated: true` field to the mock payload's `normalizedPayload`/metadata so it's queryable without relying on ID conventions.

## 20. New gym onboarding

Today, onboarding a device is a manual insert into `face_machine_settings` (done via SuperAdmin tooling or direct DB access — no dedicated "register device" wizard was found in the audited surfaces) plus, for the machine-terminal flow, provisioning a `terminal_secret_hash`. This is **the one area of the brief where a real UI gap exists** — not a code-architecture gap (every piece the flow would call already exists as a function: create tenant, create branch, and device CRUD are all backed by real services), but there is no single guided SuperAdmin flow matching the brief's exact sequence (create tenant → create branch → register device → select provider → select connection type → configure → test connection → health check → discover machine users → map → enable sync → monitor). Recommended (design only, sequenced against what already exists): a SuperAdmin "Register Device" screen that writes to `face_machine_settings` (existing table, existing tenant/branch trigger handles the tenant_id automatically), presents the provider dropdown as the P1 adapter registry from §5 fills out, and a "Test Connection" action that, once a provider adapter's `testConnection()` is implemented, calls it — none of this requires new tables, only new UI plus the adapter interface from §5. **Adding a new gym does not require source-code changes today for the common case (existing provider, push connection)** — it requires a data insert; it *would* require code only for a genuinely new provider protocol, which is inherent to any adapter-based system and is not a gap.

## 21. Multi-provider architecture

No `providers/essl/`, `providers/zkteco/`, etc. folder structure exists, and **none is recommended to be created speculatively** — the brief itself says not to create this structure if the existing architecture has a better equivalent, and today there is exactly one real provider in production (the generic/ADMS-compatible parser, mislabeled "essl" in two places per §5). Recommended: introduce `lib/biometric/providers/` only at the point a second, *genuinely different-protocol* vendor is actually being onboarded, with the existing `essl.ts` logic becoming `providers/generic-adms.ts` (or similar) registered as the default provider adapter — a rename-and-wrap, not a rewrite, and deferred until there's a real second provider to justify the structure.

## 22. Talwalkar backward compatibility

Confirmed via targeted grep across every biometric-related file read in this audit (`lib/biometric/*`, `services/biometric*.ts`, `services/machine-management.service.ts`, every `app/api/biometric/**` and `app/api/machine/**` route, `app/(superadmin)/superadmin/devices/page.tsx`): **zero occurrences of "talwalkar" or "Talwalkar"**, zero hardcoded device IDs, IPs, or tenant IDs tied to a specific customer. The only place Talwalkar appears at all in anything touched by this audit is a **code comment** in migration `0044` explaining that a new Demo Gym machine row was added "so the Demo tenant has its own properly-owned machine row (the Talwalkar-owned record with the same device identity is untouched)" — i.e., the migration explicitly documents *not* touching Talwalkar's row, and the SQL itself only inserts a new row for the Demo tenant. None of this audit's recommended P0/P1 changes touch any row of `face_machine_settings`, `biometric_member_mapping`, `attendance_sync_logs`, or `attendance` for any tenant — every recommendation in §5 and §9 is a code change to how a *new* request is processed (provider selection, timezone lookup), not a data change to any existing record. Talwalkar's existing device continues resolving exactly as it does today (by `device_identifier`/`serial_number`, matched against its own `face_machine_settings` row) whether or not the P0 fixes are applied, because those fixes change *what gets written* for the `provider` and *how the attendance date is computed*, not *whether* the device resolves or how existing rows are read.

## 23. Existing data migration

No schema change is required for the P0 fixes (§5, §9) — both are pure application-code changes reading existing columns (`face_machine_settings.provider`, a new but purely additive `branches.timezone` with a safe default) rather than requiring new tables. If `branches.timezone` is added: default `'Asia/Kolkata'` for every existing row (matching current, hardcoded behavior exactly, so no existing tenant's attendance dates shift), which needs no separate backfill step beyond the column default itself. If `biometric_member_mapping.branch_id` is added (§8/§18): backfill from the existing `member_id → members.branch_id` join, additive and non-destructive; existing mapping rows and their `machine_user_id` values are never renumbered, reassigned, or transformed — explicitly **not** doing anything resembling the brief's called-out anti-pattern of bulk-transforming an ID format (e.g. `MEM-000028 → 28`); no such transformation is proposed anywhere in this document. Per the plan-expiry audit's earlier finding (§1 above, carried over as established convention in this repo): the next new migration would be numbered continuing the live sequence, and any correction to a mistaken migration is excluded-and-renumbered, never edited in place — the same convention applies here if implementation is authorized.

## 24. Operational monitoring

Structured JSON logging already exists and is already comprehensive: `logStructured()` in `biometric.service.ts` emits one structured log line per meaningful pipeline event (`DEVICE_REQUEST_RECEIVED`, `DEVICE_RESOLVED`, `DEVICE_NOT_REGISTERED`, `ATTENDANCE_PARSED`, `INVALID_PAYLOAD`, `DUPLICATE_EVENT`, every rejection reason from `evaluateMemberStatus`, `ATTENDANCE_SUCCESS`, `PROCESSING_ERROR`), each tagged `domain: "biometric"` with a timestamp — already sufficient to trace a single event end-to-end through logs alone. Combined with `attendance_sync_logs` storing `processing_result` (a specific enum, not a generic "failed" flag) and `normalized_payload`/`request_metadata` for every attempt, the brief's specific diagnostic questions are already directly answerable from stored data without new instrumentation: *why was this event unmatched* → `processing_result = 'MEMBER_NOT_FOUND'` or `'WRONG_BRANCH'` plus `error_message`; *why rejected* → `processing_result` plus the specific reason string; *why duplicated* → `duplicate_of_id` points at the original row; *why not converted to attendance* → any non-`SUCCESS` `processing_result` value, all queryable directly. Sensitive payload exposure is already bounded by `sanitizeHeaders()` (§16). The one gap is aggregation, not data — §14's sync-monitoring surface is the recommended way to make this already-rich data browsable without writing ad hoc SQL each time.

## Testing strategy (design — not yet written)

Mapped onto the existing test-file convention in this repo (`tests/*.test.mts`, run via `npm test`):

- **Multi-tenant / multi-branch collision**: Tenant A Device-001 and Tenant B Device-001 (or Branch A1/A2 within one tenant) resolve to their own `face_machine_settings` row and never cross-match, exercising `resolveBiometricDevice()`'s per-field matching directly.
- **Multi-member same machine_user_id**: two members in different tenants/branches sharing one `machine_user_id` each resolve correctly via `evaluateMemberStatus()`'s branch filter — and, once §8's fix lands, via `assign_biometric_mapping()` too (this specific case cannot be tested against the *current* mapping-assignment path, because it would currently be rejected — that rejection is itself worth a regression test proving the gap exists before the fix, and its removal after).
- **Provider → normalized event**: existing `tests/biometric-attendance-parsing.test.mts` already covers this for the current parser; extend once a `BiometricProvider` registry exists to cover adapter selection by `device.provider`.
- **Idempotency**: same event submitted twice (exact `eventId` match, and near-duplicate within the window) → one attendance effect, confirmed via `findExactDuplicate`/`findWindowDuplicate` paths.
- **Unmatched → mapped → reprocessed**: an unmapped `machine_user_id` event is stored `unmatched`; after mapping, `reprocessUnmatchedAttendanceForMember()` converts it to attendance exactly once (re-running reprocessing a second time must be a no-op, since `resolution_status` flips to `resolved`).
- **Plan-locked**: a branch below the required tier produces `PLAN_LOCKED`, no attendance row, raw event preserved.
- **Active plan**: Growth/Scale branch processes normally.
- **Device health states**: once §13's derived calculation exists, unit-test each of the five states against synthetic `last_seen_at`/`connection_status`/`status` combinations.
- **Security / tenant isolation**: a session scoped to Tenant A cannot read Tenant B's `face_machine_settings`, `biometric_member_mapping`, or `attendance_sync_logs` rows through any admin-facing API route (exercise the actual route handlers, not just the RLS policy in isolation, since several reads go through the service-role client where RLS doesn't apply and the isolation is enforced only in application code — §18's identified gap on `biometric_member_mapping` is exactly why this needs a route-level test, not just a policy-level one).
- **Talwalkar regression**: existing Talwalkar device resolution, mapping, and attendance creation behave identically before/after the P0 fixes (same `eventId` computation inputs, same resolved device, same attendance date for events during Indian business hours where the old-vs-new timezone lookup should produce an identical answer since the new default equals the old hardcode).
- **Demo isolation**: once §19's gating lands, a mock-scenario request against a non-demo tenant's device is rejected; against a demo tenant's device it succeeds and produces a `simulated: true`-flagged event.

## Performance

No N+1 patterns were found in the core ingestion path (`processBiometricPayload()` makes a small, fixed number of queries per event, not one query per something-that-scales-with-data-size). §7 already flags the one query-shape inefficiency worth addressing opportunistically (an unfiltered-by-branch initial `members` query in `evaluateMemberStatus()`, filtered afterward in memory) — low risk at current scale (a `machine_user_id` collision across tenants is the rare case, not the common one), worth a `.eq("branch_id", device.branch_id)` addition when the file is next touched for the P0 fixes, not urgent enough to be its own migration. Existing indexes (`face_machine_provider_idx`, `attendance_sync_logs_duplicate_lookup_idx`, `attendance_sync_logs_processing_result_idx`, all branch/device/status-scoped, confirmed from migration 0014) already support the query patterns this audit reviewed at the "10 → 100 → 1,000 gyms" scale the brief asks about, without requiring new indexes for anything proposed here.

## Migration plan (if implementation is authorized)

No migration is required for §5 (provider selection) — pure application code. §9's `branches.timezone` and §8's `biometric_member_mapping.branch_id` are each a single additive, backward-compatible `alter table ... add column if not exists ... default <safe value>`, following the exact pattern used throughout this repo's migration history (e.g., `0038`, `0044`). Both would continue the live migration-numbering sequence and follow this repo's established "exclude and renumber, never edit in place" convention for any future correction.

## Rollback strategy

§5's provider-selection change and §9's timezone change are both simple code reverts (git revert, no data was transformed) if something regresses. The two proposed additive columns (`branches.timezone`, `biometric_member_mapping.branch_id`) can be dropped without affecting any other table if rolled back — nothing references them yet, and no existing row in any table is modified by adding them (only new default values are populated).

## Implementation order

**P0** — remove the two hardcodes: (1) set `metadata.provider = device.provider` once, after device resolution, removing the four duplicated `"essl"` literals; widen the `provider` type/constraint accordingly. (2) Add `branches.timezone` (default `'Asia/Kolkata'`), thread it into `eventDate()`, `istDate()`, the two `+05:30` query-offset literals, and `reprocessUnmatchedAttendanceForMember()`'s date calculation.

**P1** — formal `BiometricProvider` interface wrapping the existing parser as the default adapter (§5); rename or encrypt `api_key_encrypted` (§16); add `biometric_member_mapping.branch_id` + branch-scoped unique index + RLS policy, closing both the mapping-uniqueness gap (§8) and the missing-RLS gap (§18) in one change; extend the SuperAdmin devices page and tenant machine-management read model with unmatched/failed counts and a derived health status (§13, §14).

**P2** — per-device rotating secrets instead of global shared secrets; gate the mock/demo endpoint to `is_demo` tenants and tag simulated events explicitly (§19); cosmetic renames (`essl.ts`, the `/api/biometric/essl/events` path) once a second real provider makes the current name actively misleading rather than just imprecise; a guided SuperAdmin device-onboarding screen (§20) once the P1 adapter registry exists to populate its provider dropdown meaningfully.

**Deferred / not recommended now**: polling and vendor-cloud connection types (build only when a specific vendor that needs them is actually being onboarded); a `providers/` folder structure (create only when a second real provider justifies it); a dead-letter queue (current volume doesn't need one — `attendance_sync_logs` already serves this purpose).

---

*End of audit. No implementation has begun. Nothing in `face_machine_settings`, `biometric_member_mapping`, `attendance_sync_logs`, `attendance`, or any tenant's data — including Talwalkar and Demo Gym — was modified to produce this document.*
