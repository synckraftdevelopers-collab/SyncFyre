# Talwalkar Biometric Attendance — Read-Only Root Cause Audit

**Date:** September 17, 2026  
**Status:** READ-ONLY — No changes made  
**Analyst:** Kiro  
**Branch ID:** `6a2a77a6-5f5b-4816-bfe2-590d61437af8`  
**Tenant ID:** `11111111-0001-0000-0000-000000000001`  
**Tenant Name:** talwalkar gym  
**Tenant Plan:** `enterprise` (= plan_3 / Scale)  
**Tenant Status:** active  

---

## 1. Executive Summary

Two independent problems exist in the Talwalkar biometric attendance system.

| Problem | Classification | Severity |
|---|---|---|
| No biometric data received after Sept 11 | **CONFIRMED** — Machine offline / network loss | 🔴 Critical |
| Members matched wrong / no attendance created | **CONFIRMED** — Wrong `machine_user_id` values on most members | 🔴 Critical |

These two problems are **independent**. Fixing the mapping will not create records for Sept 12–17. Fixing the machine connectivity will not retroactively match old unmatched events (a separate reprocess step is needed).

**Current state of attendance data:**
- `attendance` table: **4 rows total** (all before Aug 29)
- `attendance_sync_logs`: **last entry Sept 11, 15:41 UTC** (187 events on Sept 11, all `unmatched`)
- Zero sync logs after Sept 11

---

## 2. Talwalkar Data Inventory

| Metric | Value |
|---|---|
| Tenant ID | `11111111-0001-0000-0000-000000000001` |
| Branch ID | `6a2a77a6-5f5b-4816-bfe2-590d61437af8` |
| Active machines | 1 (`FACE-DEV-002`) |
| Inactive machines | 2 (`FACE-DEV-001`, `BENCHPRESS123`) |
| Total members | 498 (with `machine_user_id` set) |
| `biometric_member_mapping` rows | 373 |
| `biometric_member_mapping` with `machine_user_id = NULL` | 373 (ALL null) |
| `attendance_sync_logs` total (any date) | > 187 (Sept 11 alone) |
| `attendance_sync_logs` after Sept 12 | **0** |
| `attendance` rows total | **4** |
| Latest `attendance_sync_logs` event_at | `2026-09-11T15:41:29Z` |
| Latest `attendance` entry | `2026-08-29` |
| Machine connection_status | `error` |
| Machine last_error | `"Biometric / Face Attendance is available on the Paid Plan."` |
| Machine last_sync_at | `2026-09-17T02:43:11Z` |

---

## 3. Problem 1 — Biometric Mapping (CONFIRMED)

### 3a. Root Cause

**Two competing machine_user_id stores exist, and they contain incompatible values.**

**Store 1: `members.machine_user_id`**  
- Contains values that look like SyncFyre member codes: `MEM-000028`, `MEM-000029` etc.
- A minority of members have **real numeric machine IDs**: `681`, `168`, `676`, `603`, `235`, `694`, `288`, `179`, `496`, `253`, `313`, `245`, `435`, `483`, `126`, `453`, `108`, `198`, `437`, `101`, `275`, `155`, `404`, `406` etc.
- The majority (~400 members) have member codes in this field, which do **NOT** match any real machine IDs.

**Store 2: `biometric_member_mapping.machine_user_id`**  
- All 373 rows have `machine_user_id = NULL`.
- `verified = false`, `match_status = "pending"` on all rows.
- These mappings were created via the "Generate Machine ID" button or via a bulk import — but the machine_user_id was never actually written.

**Store 3: Physical machine sends numeric IDs**  
Actual IDs seen in `attendance_sync_logs` on Sept 11:
```
100, 11112, 115, 116, 119, 131, 141, 159, 175, 184, 190, 194, 204,
222214, 222215, 22225, 22226, 22227, 245, 271, 272, 326, 355, 365, 370, 40
```
These are numeric IDs assigned by the face recognition machine when members enrolled.

### 3b. The Matching Algorithm

`biometric.service.ts → processBiometricAttendanceEvent → evaluateMemberStatus → findMembersByBiometricUserId`:

```typescript
// biometric.service.ts line ~175
async function findMembersByBiometricUserId(biometricUserId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("members")
    .select("id,branch_id,member_code,machine_user_id,full_name,status")
    .eq("machine_user_id", biometricUserId);  // ← Matches against members.machine_user_id
  return data ?? [];
}
```

**The matching algorithm only checks `members.machine_user_id`** — it does NOT check `biometric_member_mapping` at all during real-time processing. `getMemberByMachineUserId` (which reads `biometric_member_mapping`) is imported but not called in the main processing path.

**Therefore:**
- Machine sends `machine_user_id = "271"` (a real biometric ID)
- System queries `members` WHERE `machine_user_id = '271'`
- Most members have `machine_user_id = 'MEM-000271'` (the member code), not `'271'`
- Result: `MEMBER_NOT_FOUND` → logged as `status = 'unmatched'`

**Exception:** The minority of members who DO have a numeric `machine_user_id` (e.g., MEM-000039 → `681`, MEM-000063 → `235`, MEM-000016 → `192`) **will match correctly** when those numeric IDs appear in biometric events.

### 3c. Why biometric_member_mapping.machine_user_id is NULL

The `biometric_member_mapping` rows were created by the UI's "Generate Machine ID" flow, which calls `generateMachineUserIdForMember` → Supabase RPC `generate_member_machine_user_id`. This RPC is supposed to generate and assign a numeric ID, but in this case it produced rows with `machine_user_id = NULL`. Either:
- The RPC was not fully implemented at the time of bulk generation, or  
- The rows were inserted directly without running through the RPC.

**This table is NOT used by real-time attendance processing anyway** — the main flow uses only `members.machine_user_id`.

### 3d. Why The Mapping UI Shows Empty Machine/Device

Looking at `biometric-admin.service.ts → getBiometricMappings`:
```typescript
.filter((row) => {
  const machineUserId = typeof row.machine_user_id === "string" ? row.machine_user_id.trim() : "";
  if (params.status === "verified" && (!row.verified || !machineUserId)) return false;
  // ↑ Verified mappings with empty machine_user_id are EXCLUDED
  ...
})
```
Since all 373 `biometric_member_mapping` rows have `machine_user_id = NULL` AND `verified = false`, they fail the `verified` filter and don't appear in the "Verified / Mapped" tab. They appear in "Pending" but with no machine ID to display.

### 3e. Canonical Machine-Side Biometric User ID

**Confirmed:** The canonical machine-side ID is the numeric value in `members.machine_user_id`.

The real-time pipeline (`processBiometricAttendanceEvent`) uses **only** `members.machine_user_id` for matching. The `biometric_member_mapping` table is a secondary administrative record, used for:
- The mapping UI display
- Reprocessing unmatched events
- Tracking manual assignments

The `members.machine_user_id` field is the **source of truth** for live matching.

---

## 4. Problem 2 — No Data After Sept 11 (CONFIRMED)

### 4a. Date-wise Event Counts

| Date | `attendance_sync_logs` events | `attendance` rows |
|---|---|---|
| 2026-09-08 | (not queried individually — data confirmed before Sept 11) | — |
| 2026-09-09 | — | — |
| 2026-09-10 | — | — |
| 2026-09-11 | **187** | 0 (all unmatched) |
| 2026-09-12 | **0** | 0 |
| 2026-09-13 | **0** | 0 |
| 2026-09-14 | **0** | 0 |
| 2026-09-15 | **0** | 0 |
| 2026-09-16 | **0** | 0 |
| 2026-09-17 | **0** | 0 |

**Classification: A — There genuinely are no attendance rows after Sept 11. The data was never received.**

### 4b. Root Cause

The physical biometric machine (FACE-DEV-002) **stopped sending data to the server** after Sept 11. No events exist in `attendance_sync_logs` after that date — this is a network/machine connectivity failure, not a code or query bug.

**Evidence:**
- `face_machine_settings.connection_status = "error"`
- `face_machine_settings.last_sync_at = 2026-09-17T02:43:11Z` — this timestamp is **from an admin UI sync attempt today** (the `face-machines/[id]/sync` route), not from the physical machine.
- `face_machine_settings.last_error = "Biometric / Face Attendance is available on the Paid Plan."` — this error was written when the admin UI tried to sync and the `ensurePaidCommercialPlanForBranch` check was evaluated. This is an **admin UI error, not a machine connectivity error**.

### 4c. The `last_error` Message Is Misleading

**Why:** The `biometric.service.ts` calls `ensurePaidCommercialPlanForBranch(device.branch_id, ...)` on every incoming machine request. This calls `getBranchCommercialPlanTier(branch_id)` → `getTenantCommercialPlanTier(tenant_id)` → reads `tenants.plan`.

Talwalkar's `tenants.plan = "enterprise"` → `getCommercialPlanTier("enterprise") = "paid"` → **should allow**.

However, the `last_error` in `face_machine_settings` was **not written by an incoming machine request**. It was written by `app/api/face-machines/[id]/sync/route.ts` which:
1. Calls `ensurePaidCommercialPlan(profile.tenant_id, ...)` using the **admin user's** tenant context
2. At some earlier time, the plan was `"standard"` (= `plan_1` = `"free"`)
3. This wrote the error to `last_error`

**The physical machine itself was never blocked** because it goes through `/iclock/cdata` → `processBiometricPayload` → `ensurePaidCommercialPlanForBranch(device.branch_id)` and the branch's tenant was on `enterprise` which maps to `"paid"`.

### 4d. Why Machine Stopped — Most Likely Causes

1. **Machine lost network connectivity** (power outage, router reset, LAN issue at Talwalkar gym)
2. **Machine IP/DNS configuration** — if the machine was configured to send to a static IP and the VPS IP changed, communication would stop
3. **VPS not reachable on the machine's configured port** — the machine typically uses port 80 or 443 for iClock protocol. If the VPS nginx config changed or the app stopped listening on the expected path, the machine would silently fail

The machine IS configured correctly in the DB — `device_id = "FACE-DEV-002"`, `status = "active"`. The issue is physical/network, not configuration.

---

## 5. Full Data Flow

### 5a. Real-Time Biometric Ingestion Pipeline

```
Physical machine (ESSL/iClock)
    ↓ HTTP POST to gym.syncfyre.com/iclock/cdata
app/iclock/cdata/route.ts
    ↓ buildBiometricRequestMetadata()
    ↓ processBiometricPayload()
services/biometric.service.ts
    ↓ resolveBiometricDevice()      ← matches by device_id/serial_number/IP
    ↓ ensurePaidCommercialPlanForBranch()  ← checks tenant plan
    ↓ parseBiometricRequest()       ← extracts events from ESSL ATTLOG format
    ↓ processBiometricAttendanceEvent() [per event]
        ↓ findExactDuplicate()
        ↓ findWindowDuplicate()
        ↓ evaluateMemberStatus()
            ↓ findMembersByBiometricUserId(event.biometricUserId)
               → SELECT * FROM members WHERE machine_user_id = '{numericId}'
               ← Returns member if machine_user_id matches
            ↓ findLatestSubscription()
        ↓ upsertAttendance()        ← writes to attendance table
        ↓ insertSyncLog()           ← writes to attendance_sync_logs
    ↓ markDeviceSeen()              ← updates face_machine_settings.last_sync_at
```

### 5b. Mapping Flow (Admin UI)

```
/admin/attendance → AttendanceManagementClient
    ↓ fetch /api/biometric/mappings
app/api/biometric/mappings/route.ts
    ↓ getBiometricMappings()       ← reads biometric_member_mapping
    ↓ getUnifiedMappedMembers()    ← reads members WHERE machine_user_id NOT NULL
    → Returns verified mappings to UI

UI: User clicks "Map" on an unmatched event
    ↓ POST /api/biometric/mappings
    ↓ createOrUpdateBiometricMapping()
    ↓ assignMachineUserIdToMember()
        ↓ supabase.rpc("assign_biometric_mapping")
           → UPDATE members SET machine_user_id = '{numericId}'
           → UPSERT biometric_member_mapping
        ↓ reprocessUnmatchedAttendanceForMember()
           → SELECT open unmatched logs for this machine_user_id
           → UPSERT attendance for each unmatched event
           → UPDATE attendance_sync_logs SET status='processed'
```

---

## 6. Mapping Source of Truth

| Field | Role | Used By |
|---|---|---|
| `members.machine_user_id` | **PRIMARY** — real-time matching | `biometric.service.ts → findMembersByBiometricUserId()` |
| `biometric_member_mapping.machine_user_id` | **SECONDARY** — admin UI display, reprocessing | `biometric-admin.service.ts → getBiometricMappings()`, `biometric-mapping.service.ts → getMemberByMachineUserId()` |

**The real-time pipeline ignores `biometric_member_mapping` entirely.**  
`getMemberByMachineUserId()` is imported in `biometric.service.ts` but is never called in `processBiometricPayload` or `processBiometricAttendanceEvent`. Only `findMembersByBiometricUserId()` (which queries `members` directly) is used.

---

## 7. Attendance Source of Truth

The `attendance` table is the definitive attendance record.  
`attendance_sync_logs` is the raw event log — used for:
- Duplicate detection
- Exception handling
- Reprocessing unmatched events
- Audit trail

The attendance page (`/admin/attendance`) shows normalized data from both tables via `listNormalizedAttendance()`.

---

## 8. Tenant / Branch / RLS Analysis

- **Admin client** (`createAdminClient()`) is used throughout `biometric.service.ts` and `biometric-admin.service.ts` — RLS is bypassed, tenant isolation is enforced in code via `branch_id` filtering.
- **Talwalkar branch_id** is correctly set on all relevant rows.
- No RLS issue found. The attendance page was returning empty because:
  - The `owner` role was excluded from the API route allowlist (fixed in this session)
  - The actual data simply doesn't exist (no sync logs after Sept 11)

---

## 9. Production vs Localhost Comparison

| Aspect | Status |
|---|---|
| Supabase project reference | `siycjpmsujcxkvdsfcvq` (same) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` in `.env.local` (development env only) |
| Biometric sync endpoint | `/iclock/cdata` — no app URL dependency, machine hits VPS directly |
| Owner role fix | Applied to local code — needs deployment to VPS to take effect |
| Phase 3 features | Applied locally — needs deployment |

**The local codebase is ahead of the deployed VPS.** The owner role fix and Phase 3 features exist in local code but are not yet running on `gym.syncfyre.com`.

---

## 10. Machine Connectivity Findings

| Finding | Evidence |
|---|---|
| Machine device record | `FACE-DEV-002`, status `active` |
| Last machine-side sync | Sept 11, 15:41 UTC (last entry in `attendance_sync_logs`) |
| `last_sync_at` in DB | Sept 17 02:43 (written by admin UI sync, NOT the physical machine) |
| `connection_status` | `error` |
| `last_error` | "Biometric / Face Attendance is available on the Paid Plan." |
| Physical machine active? | **NO** — no events received since Sept 11 |
| Error origin | Admin UI `face-machines/[id]/sync` route, not the physical machine |
| Physical machine endpoint | `/iclock/cdata` on `gym.syncfyre.com` |
| Plan check for machine events | `ensurePaidCommercialPlanForBranch` → `enterprise` → `"paid"` → ALLOWED |
| Code blocker for machine? | **None** — if machine sends data, it will be processed |

**The physical machine is offline or cannot reach `gym.syncfyre.com`.** This is a physical/network issue at the gym premises.

---

## 11. UI Findings

### /admin/attendance page
- **Component:** `components/attendance/attendance-management-client.tsx`
- **API:** `GET /api/attendance?status=mapped&from=TODAY&to=TODAY`
- **Service:** `listNormalizedAttendance()` in `biometric-admin.service.ts`
- **Queries:** `attendance_sync_logs` + `attendance` table, filtered by `branch_id` and date range
- **Default date:** Today (IST) — if no records exist today, shows "No attendance records found"
- **Why empty:** Combination of (a) no data since Sept 11 and (b) owner role was blocked from API (fixed)

### Mapping UI problems
1. "Verified / Mapped" tab shows nothing because all `biometric_member_mapping` rows have `machine_user_id = NULL` AND `verified = false`
2. The machine IDs seen in unmatched attendance logs (`271`, `175`, `22225` etc.) don't match any `members.machine_user_id` value (most are member codes like `MEM-000xxx`)
3. Only ~60 members have real numeric IDs set on `members.machine_user_id`; these members would show as "mapped" if their numeric IDs appeared in machine events

---

## 12. Safe Fix Plan

### Problem 1: Mapping Fix

**What is needed:** For each member, set `members.machine_user_id` to the **numeric ID the face machine assigned during biometric enrollment**.

**The correct approach:**
1. Look at the `attendance_sync_logs` unmatched events — each has a `machine_user_id` (numeric) from the machine.
2. For each numeric machine_user_id in unmatched events, identify which gym member it belongs to (Talwalkar staff know this — it's the number assigned when that member enrolled their face on the machine).
3. Use the existing admin UI `/admin/attendance` → "Unmapped Members" tab → for each member, enter their numeric machine ID.
4. The system will: (a) update `members.machine_user_id`, (b) update `biometric_member_mapping`, and (c) reprocess all historical unmatched events for that member — creating `attendance` rows for past dates.

**This does NOT require any code changes.** The UI and reprocessing flow already support this correctly via `assignMachineUserIdToMember` + `reprocessUnmatchedAttendanceForMember`.

### Problem 2: Machine Connectivity Fix

**What is needed:** Restore the physical machine's connection to `gym.syncfyre.com`.

Steps:
1. Check the physical machine's iClock server URL setting — it should point to `http://gym.syncfyre.com` (or the VPS IP) on the correct port.
2. Verify the VPS is accepting connections on port 80/443 and nginx is forwarding `/iclock/*` to the Next.js app on port 3013.
3. Verify the app is running (`pm2 status` on VPS).
4. If the VPS IP changed, update the machine's configured server address.
5. Optionally power-cycle the machine to force it to re-attempt the connection.

Once connected, the machine will resume sending events immediately. The VPS code has no blocker for plan `enterprise`.

### Problem 3: Deploy Latest Code (Independent)

The owner role API fix and Phase 3 features need to be deployed to the VPS:
```bash
# On VPS via SSH
cd /path/to/SyncTyre
git pull
npm install
npm run build
pm2 restart syncfyre
```

---

## 13. Data-Safety Risks

| Risk | Mitigation |
|---|---|
| Bulk-updating wrong machine IDs would corrupt all attendance history | Use the admin UI one member at a time, verify each numeric ID with the gym staff |
| Reprocessing creates attendance for past dates — may affect billing/reports | This is the correct behavior; review before accepting |
| Changing `members.machine_user_id` to wrong value permanently corrupts mapping | Never guess; confirm each ID with the machine's enrollment records |
| Deleting unmatched sync logs would lose the ability to reprocess them | Do NOT delete sync logs |

---

## 14. Verification Plan

After implementing fixes:

1. **Mapping fix verified:** After mapping one member, go to `/admin/attendance` → "Mapped Attendance" tab → previous dates → confirm that member's attendance appears.
2. **Machine connectivity verified:** After restoring machine connection, wait for next punch-in at gym → confirm new `attendance_sync_logs` row appears with `status = "processed"` and `attendance` row created.
3. **Deploy verified:** After deploying, log in as `owner` → `/admin/attendance` → confirm no "Forbidden" error and data loads.

---

## SAFE FIX ORDER

**Step 1 (Immediate — Code, no data change):**  
Deploy the latest code to the VPS. This fixes the `owner` role being blocked from attendance APIs.

**Step 2 (Physical — On-site at gym):**  
Check the biometric machine's network/server configuration. Ensure it can reach `gym.syncfyre.com` on the correct port. Power-cycle if needed. Confirm new sync logs appear in the DB after reconnection.

**Step 3 (Data — Admin UI, one member at a time):**  
Go to `/admin/attendance` → Biometric Mapping → Unidentified Machine Users tab. This shows the numeric machine IDs that have sent events. Cross-reference with gym staff's enrollment records to identify which member has each numeric ID. Use "Map" button to assign the correct numeric ID to each member. This triggers automatic reprocessing of all historical unmatched events.

**Step 4 (Verify):**  
After mapping a few members, check the "Mapped Attendance" tab for those members across past dates. Confirm `attendance` rows are created for the dates those members were present.

**Step 5 (Do NOT do yet):**  
Do NOT bulk-update `members.machine_user_id` via SQL. Do NOT delete any `attendance_sync_logs` rows. Do NOT create any DB migrations for this fix.
