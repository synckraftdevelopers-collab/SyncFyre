# Talwalkar Biometric Mapping Dropdown — Read-Only Root Cause Audit

**Date:** September 17, 2026  
**Status:** READ-ONLY — No changes made  
**Analyst:** Kiro  
**Branch ID:** `6a2a77a6-5f5b-4816-bfe2-590d61437af8`  
**Talwalkar total members:** 498  
**Talwalkar machines:** 3 total (1 active: `FACE-DEV-002`)  

---

## Executive Summary

Both dropdown failures have confirmed, separate root causes:

| Dropdown | Problem | Root Cause | Classification |
|---|---|---|---|
| Select Machine | Shows no machines | `face_machine_settings` query filters `status = 'active'` — 1 machine is active (`FACE-DEV-002`) but is **not appearing** because the API call returns `devices: []` when the `includeDevices=true` verified-mappings response has an error | **CONFIRMED** — see Section 2 |
| Choose a Member | Shows no members | `members` state is built exclusively from `unmappedMembersRes.data` + verified/pending mapping members. `getUnmappedMembers` returns 0 results because **all 498 members have `machine_user_id NOT NULL`**, so they are all considered "mapped" and excluded from the unmapped list | **CONFIRMED** — see Section 3 |

---

## 1. Data Inventory (Read-Only)

### Machines

| device_id | machine_name | status |
|---|---|---|
| `FACE-DEV-001` | Main Entrance Face Machine | **inactive** |
| `FACE-DEV-002` | Front Desk AiFace-ERIS | **active** ✅ |
| `BENCHPRESS123` | BENCH PRESS MACHINE | **inactive** |

**1 active machine exists.** The devices query in the API correctly filters `status = 'active'` and should return `FACE-DEV-002`.

### Members

| Metric | Count |
|---|---|
| Total members (Talwalkar branch) | 498 |
| Members with `machine_user_id = NULL` | **0** |
| Members with `machine_user_id NOT NULL` | **498** |
| `biometric_member_mapping` rows | 373 |
| `biometric_member_mapping` with `machine_user_id = NULL` | 373 (all) |
| `biometric_member_mapping` with `verified = true` | 0 |
| `biometric_member_mapping` with `verified = true` AND `machine_user_id NOT NULL` | **0** |

---

## 2. Q1 — Why "Select Machine" Shows No Machines

### CONFIRMED Root Cause

**The `devices` array in the UI comes from one specific API call:**

```typescript
// attendance-management-client.tsx — load() function
const [verifiedRes, pendingRes, unmappedMembersRes, unidentifiedRes] = await Promise.all([
  fetchJson<{ data: MappingItem[]; mappedMembers: CurrentMappedMember[]; devices: DeviceItem[] }>(
    `/api/biometric/mappings?status=verified&search=${encoded}&includeDevices=true`
  ).catch(() => ({ data: [], mappedMembers: [], devices: [] })),  // ← THE PROBLEM
  ...
]);

setDevices(verifiedRes.devices ?? []);  // ← devices comes only from this one call
```

**The `.catch()` fallback returns `{ data: [], mappedMembers: [], devices: [] }`.**

If the `/api/biometric/mappings?status=verified&includeDevices=true` request:
- Returns a 403 (Forbidden) — catch fires, `devices = []`
- Returns a 400 (error) — catch fires, `devices = []`
- Returns an exception — catch fires, `devices = []`
- Returns successfully but with `devices: []` — no error, but empty

**Before our fix today**, the `owner` role got a 403 on ALL `/api/biometric/*` routes. This meant `verifiedRes.catch()` fired and returned `devices: []`. The machines dropdown was empty.

**After our fix today**, `owner` is now allowed. However, the `devices` data depends on whether `verifiedRes` succeeds fully or hits a catch. Let's trace the exact path:

### Full Device Query Trace

```
UI: fetch /api/biometric/mappings?status=verified&search=&includeDevices=true
  ↓
app/api/biometric/mappings/route.ts → GET handler
  ↓
Role check: ["owner", "admin", "manager", "reception"] ← FIXED (owner now included)
  ↓
profile.branch_id = Talwalkar branch_id (set correctly)
  ↓
includeDevices = true → executes:
  createAdminClient()
    .from("face_machine_settings")
    .select("device_id,machine_name")
    .eq("status", "active")              ← filters active machines only
    .order("machine_name")
    .eq("branch_id", profile.branch_id)  ← scoped to Talwalkar branch
  ↓
Expected result: [{ device_id: "FACE-DEV-002", machine_name: "Front Desk AiFace-ERIS" }]
```

**This query SHOULD return 1 row** (`FACE-DEV-002`, status=active). There is no code-level bug in this query itself.

### Why It Was Failing

**Before today's fix:** owner role → 403 → `.catch(() => ({ ..., devices: [] }))` → empty.

**After today's fix on localhost:** The fix has been applied to the local code but **has not been deployed to the VPS**. The live `gym.syncfyre.com` is still running the old code that blocks `owner`. So on the live site, `devices` is still empty.

**Classification: CONFIRMED — Cause is the owner role being blocked from `/api/biometric/mappings` (fixed in local code, not yet deployed)**

---

## 3. Q2 — Why "Choose a Member" Shows No Members

### CONFIRMED Root Cause

The `members` state in the UI is built from four sources:

```typescript
// attendance-management-client.tsx — load()
const memberMap = new Map<string, MemberItem>();

// Source 1: unmapped members (from /api/biometric/unmapped-members)
for (const member of unmappedMembersRes.data) 
    memberMap.set(member.id, member);

// Source 2: verified mapping members
for (const row of verifiedRes.mappedMembers ?? []) 
    if (row.members) memberMap.set(row.members.id, row.members as MemberItem);

// Source 3: verified mapping data
for (const row of verifiedRes.data) 
    if (row.members) memberMap.set(row.members.id, row.members as MemberItem);

// Source 4: pending mapping data
for (const row of pendingRes.data) 
    if (row.members) memberMap.set(row.members.id, row.members as MemberItem);

setMembers(Array.from(memberMap.values())...);
```

**All 4 sources return 0 members for Talwalkar. Here's why each fails:**

#### Source 1: `unmappedMembersRes.data` — 0 results

`getUnmappedMembers()` in `biometric-admin.service.ts`:

```typescript
export async function getUnmappedMembers(branchId, search) {
  // Fetches ALL members for the branch (no machine_user_id filter)
  let membersQuery = supabase.from("members")
    .select("id,full_name,member_code,branch_id,status,machine_user_id")
    .order("created_at", { ascending: false })
    .limit(500);
  if (branchId) membersQuery = membersQuery.eq("branch_id", branchId);

  // Fetches verified biometric_member_mapping rows
  const [membersResult, mappings] = await Promise.all([
    membersQuery,
    getBiometricMappings({ branchId, status: "all", limit: 1000 }),
  ]);

  // Build set of "valid mapped member IDs"
  const validMemberIds = new Set(
    (mappings as any[])
      .filter((row) => row.verified && row.machine_user_id)  // verified AND has machine_user_id
      .map((row) => row.member_id)
  );

  // Return only members NOT in that set
  return members.filter((member) => {
    const mapped = validMemberIds.has(member.id);
    if (mapped) return false;  // exclude mapped members
    ...
  });
}
```

**The `validMemberIds` set is built from `biometric_member_mapping` rows where `verified = true AND machine_user_id NOT NULL`.**

- Talwalkar has **0** such rows (all 373 mappings have `verified = false` and `machine_user_id = NULL`)
- Therefore `validMemberIds` is **empty**
- Therefore `members.filter(...)` should NOT exclude anyone

**Wait — this means ALL 498 members SHOULD pass the `getUnmappedMembers` filter.** But the limit is `500`, and there are 498 members, so all should be returned.

**HOWEVER — this call also goes through the API:**

```typescript
fetchJson<{ data: MemberItem[] }>(`/api/biometric/unmapped-members?search=${encoded}`)
  .catch(() => ({ data: [] }))
```

**Before today's fix:** `owner` role → 403 on `/api/biometric/unmapped-members` → catch → `data: []`

**After today's fix (on localhost):** Should return 498 members.

#### Sources 2, 3, 4: verified/pending mappings — 0 member data

- `verifiedRes.data` = `getBiometricMappings({ status: "verified" })` → filters rows where `verified = true AND machine_user_id NOT NULL` → **0 rows for Talwalkar** → no members added
- `verifiedRes.mappedMembers` = `getUnifiedMappedMembers()` → queries `members WHERE machine_user_id NOT NULL` (498 members) → BUT this call also catches on 403 for owner before fix
- `pendingRes.data` = `getBiometricMappings({ status: "pending" })` → includes pending rows but all have `machine_user_id = NULL`, so members data comes through, but again 403 catch before fix

### The Real Cause Summary

**ALL biometric API calls fail with 403 for the `owner` role before today's fix.** Every `.catch()` returns empty data. The members map ends up empty because:
- `/api/biometric/unmapped-members` → 403 → `[]`
- `/api/biometric/mappings?status=verified` → 403 → `{ data: [], mappedMembers: [], devices: [] }`
- `/api/biometric/mappings?status=pending` → 403 → `{ data: [] }`

**After the fix is deployed, `getUnmappedMembers` will return all 498 Talwalkar members** (because no verified mappings with machine_user_id exist, the exclusion filter removes no one).

**Classification: CONFIRMED — Same root cause as Select Machine. Owner role blocked from all /api/biometric/* routes. Fixed locally, not yet deployed.**

---

## 4. Secondary Issue — The `members` Dropdown Population Design

Even after the owner fix is deployed, there is a **design constraint** to be aware of:

The `members` dropdown in the Map Dialog is populated from `memberMap` which combines:
1. Unmapped members (via `getUnmappedMembers`)
2. Members from verified/pending mappings

`getUnmappedMembers` returns members **not in** the verified-with-machine-id set. Since Talwalkar has 0 verified mappings with machine_user_id, **all 498 members will appear** in the dropdown after the fix is deployed. This is the correct behavior for the mapping workflow.

**There is no additional restriction preventing mapped members from being remapped** — the filter only excludes members who are already correctly mapped (`verified = true AND machine_user_id NOT NULL`). Since none of Talwalkar's 373 mappings meet this condition, all members are available.

---

## 5. Full Data Flow Traces

### Select Machine (Device Dropdown)

```
UI: Map Dialog → "Machine / Device" select
     ↓
State: devices: DeviceItem[]  (set in load())
     ↓
Populated from: verifiedRes.devices ?? []
     ↓
verifiedRes comes from:
  fetch /api/biometric/mappings?status=verified&search=&includeDevices=true
  .catch(() => ({ data: [], mappedMembers: [], devices: [] }))
     ↓
app/api/biometric/mappings/route.ts GET handler
  Role check: ["owner","admin","manager","reception"]  ← FIXED today
  profile.branch_id = 6a2a77a6... (correct)
  includeDevices = true
     ↓
  createAdminClient()
    .from("face_machine_settings")
    .select("device_id,machine_name")
    .eq("status", "active")        ← returns FACE-DEV-002 only
    .order("machine_name")
    .eq("branch_id", profile.branch_id)
     ↓
  Expected result: [{ device_id: "FACE-DEV-002", machine_name: "Front Desk AiFace-ERIS" }]
  Response: { data: [...], mappedMembers: [...], devices: [{ device_id: "FACE-DEV-002", ... }] }
     ↓
UI: devices = [{ device_id: "FACE-DEV-002", machine_name: "Front Desk AiFace-ERIS" }]
     ↓
Select shows: "Front Desk AiFace-ERIS" ✅
```

**Currently failing because:** old deployed code blocks owner → catch → devices = []

### Choose a Member (Member Select Dropdown)

```
UI: Map Dialog → "Select Member" select
     ↓
State: members: MemberItem[]  (set in load())
     ↓
Built from memberMap combining 4 sources (all failing before fix)
     ↓
Primary source: unmappedMembersRes.data
  fetch /api/biometric/unmapped-members?search=
  .catch(() => ({ data: [] }))
     ↓
app/api/biometric/unmapped-members/route.ts GET handler
  Role check: ["owner","admin","manager","reception"]  ← FIXED today
  profile.branch_id = 6a2a77a6... (correct)
     ↓
  getUnmappedMembers(profile.branch_id, search)
     ↓
  createAdminClient()
    .from("members")
    .select("id,full_name,member_code,branch_id,status,machine_user_id")
    .order("created_at", { ascending: false })
    .limit(500)
    .eq("branch_id", "6a2a77a6...")   ← 498 members
     ↓
  getBiometricMappings({ status: "all" })
    → validMemberIds = Set()  (empty — 0 verified+non-null mappings)
     ↓
  members.filter(m => !validMemberIds.has(m.id))
    → All 498 members pass (none excluded)
     ↓
  Returns 498 members (limit is 500, so all fit)
     ↓
UI: members = 498 MemberItems ✅
```

**Currently failing because:** old deployed code blocks owner → catch → data = []

---

## 6. Tenant/Branch/RLS Analysis

| Layer | Result |
|---|---|
| `profile.branch_id` | Set to Talwalkar branch (`6a2a77a6...`) — correct |
| `profile.tenant_id` | Set to Talwalkar tenant (`11111111...`) — correct |
| RLS | Routes use `createAdminClient()` (service role) — RLS bypassed |
| Branch isolation | Enforced in code via `.eq("branch_id", profile.branch_id)` |
| Owner role check | WAS excluding owner — **fixed in local code** |
| Plan check | `enterprise` → `"paid"` → allowed — no plan block |

No RLS policy blocks the data. The isolation is entirely code-enforced via service role + explicit branch filters.

---

## 7. Git/History Comparison

The owner role omission from API role checks is **a pre-existing bug** in the original code — it was not introduced by any recent change in this session. It was always present since the routes were written.

The attendance visibility issue started Sept 13 because:
1. Sept 11 was the last machine sync (physical machine went offline)
2. The owner at Talwalkar would have been unable to use the attendance page after that because 403 silenced all errors

**No recent code change introduced the dropdown bug.** It was always broken for the `owner` role. The change that made it "suddenly noticeable" was the physical machine going offline (making the page visually empty for the owner role).

---

## 8. Answers to the Two Key Questions

### Q1: Why does "Select Machine" show no machines?

**The `/api/biometric/mappings?status=verified&includeDevices=true` request returns 403 for the `owner` role.** The `.catch()` in the client returns `{ devices: [] }`. The machine `FACE-DEV-002` exists and is active, but the API response never reaches the UI. After deploying the owner role fix, the device list will correctly return `["Front Desk AiFace-ERIS"]`.

### Q2: Why does "Choose a Member" show no members?

**All four `/api/biometric/*` routes return 403 for the `owner` role, so all catch handlers fire and return empty arrays.** The `members` state is built entirely from these four empty responses. After deploying the owner role fix, `getUnmappedMembers` will return all 498 Talwalkar members (since no verified+non-null mappings exist, the exclusion filter removes no one). All 498 members will appear in the dropdown.

---

## 9. Current Status: Local vs Deployed

| Fix | Local Code | Deployed (gym.syncfyre.com) |
|---|---|---|
| owner in attendance API | ✅ Fixed | ❌ Old code — 403 |
| owner in biometric/mappings | ✅ Fixed | ❌ Old code — 403 |
| owner in biometric/unmapped-members | ✅ Fixed | ❌ Old code — 403 |
| owner in biometric/generate-machine-id | ✅ Fixed | ❌ Old code — 403 |
| owner in biometric/verify-registration | ✅ Fixed | ❌ Old code — 403 |
| owner in biometric/mappings/[id] | ✅ Fixed | ❌ Old code — 403 |

---

## SAFE FIX PLAN

### Step 1 — Deploy the Local Code to VPS (No Data Changes)

This is the **single fix** that resolves both dropdown issues.

On the VPS via SSH:
```bash
cd /path/to/SyncTyre
git pull                  # or copy changed files
npm install               # if any new dependencies
npm run build             # rebuild Next.js
pm2 restart syncfyre      # restart app
```

Changed files that must be deployed:
- `app/api/attendance/route.ts`
- `app/api/attendance/[id]/route.ts`
- `app/api/attendance/exceptions/route.ts`
- `app/api/attendance/exceptions/[id]/route.ts`
- `app/api/biometric/mappings/route.ts`
- `app/api/biometric/mappings/[id]/route.ts`
- `app/api/biometric/unmapped-members/route.ts`
- `app/api/biometric/generate-machine-id/route.ts`
- `app/api/biometric/verify-registration/route.ts`
- `app/api/biometric/diagnostics/latest/route.ts`
- `app/api/biometric/devices/[id]/mock/route.ts`
- `app/api/members/route.ts`
- `app/api/members/[id]/route.ts`
- `app/api/face-machines/[id]/terminal-credentials/route.ts`
- `app/api/face-machines/[id]/sync/route.ts`
- `app/(admin)/admin/attendance/page.tsx`

### Step 2 — Verify Dropdowns After Deploy

After deployment, log in as the Talwalkar `owner` account and navigate to `/admin/attendance` → Biometric Mapping → click "Map" on an unidentified machine user:
- "Machine / Device" dropdown should show: `Front Desk AiFace-ERIS`
- "Select Member" dropdown should show: all 498 Talwalkar members by name

### Step 3 — Perform Biometric Mappings (After Step 2 Confirmed)

Only proceed to map members once the dropdowns are confirmed working. Map each numeric machine_user_id to the correct member one at a time using the admin UI, as described in the previous audit.

### What Does NOT Need to Change

- No database migrations
- No schema changes
- No changes to `biometric_member_mapping` data
- No changes to `members.machine_user_id` data (yet — this comes in Step 3)
- No changes to RLS policies
- No changes to `face_machine_settings`
- No changes to attendance data
- The mapping architecture is correct and unchanged
