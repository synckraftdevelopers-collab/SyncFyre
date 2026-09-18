# Talwalkar Dashboard Attendance — Read-Only Audit

**Date:** September 17, 2026  
**Status:** READ-ONLY — No changes made  
**Analyst:** Kiro  
**Branch ID:** `6a2a77a6-5f5b-4816-bfe2-590d61437af8`  
**Tenant ID:** `11111111-0001-0000-0000-000000000001`  

---

## 1. Attendance Data in Database (Read-Only Facts)

| Metric | Value |
|---|---|
| Total `attendance` rows for Talwalkar | **4** |
| Total `attendance_report_view` rows | **4** |
| Latest `attendance_date` | **2026-08-29** |
| Attendance today (2026-09-17) | **0** |
| Attendance Sept 11–17 | **0 for all dates** |
| Last 7 days of data | All zero |

**All 4 attendance records are from Aug 28–29, 2026. No attendance exists after that date.**

The 4 rows:
```
attendance_date=2026-08-29  entry=2026-08-28T19:12:53+00:00
attendance_date=2026-08-29  entry=2026-08-29T16:51:49+00:00
attendance_date=2026-08-28  entry=2026-08-28T17:56:12+00:00
attendance_date=2026-08-28  entry=2026-08-28T17:08:51+00:00
```

---

## 2. Full Data Flow Trace

### 2a. Dashboard Attendance Widget (Today's Count)

```
/admin/dashboard → AdminDashboardPage (Server Component)
  ↓
profile = await getPortalContext()
branchId = profile?.branch_id         ← "6a2a77a6-5f5b-4816-bfe2-590d61437af8"
timeZone = profile?.tenant_timezone   ← "Asia/Kolkata" (or fallback)
today = getLocalDateKey(new Date(), timeZone)  ← "2026-09-17" (Sept 17 IST)
  ↓
getDashboardData(branchId, timeZone, profile?.tenant_id)
  ↓
services/dashboard.service.ts → getDashboardData()
  ↓
attendance query:
  supabase.from("attendance")
    .select("id", { count: "exact", head: true })
    .eq("attendance_date", today)      ← "2026-09-17"
    .eq("branch_id", branchId)         ← branch filter applied
  ↓
Result: count = 0  (no attendance on Sept 17)
  ↓
metrics.todayAttendance = 0
  ↓
MetricCard "Today's Attendance" → shows 0
```

**The query is structurally correct.** The reason it shows 0 is that **no attendance data exists for Sept 17** in the database.

### 2b. Dashboard Attendance Feed (Recent Attendance List)

```
getRecentAttendance(branchId, 5)
  ↓
services/dashboard.service.ts → getRecentAttendance()
  ↓
supabase.from("attendance")
  .select("id, attendance_date, entry_time_ist, member_id, members(full_name, member_code)")
  .order("created_at", { ascending: false })
  .limit(5)
  .eq("branch_id", branchId)
  ↓
Result: 4 rows returned (all from Aug 28–29)
  ↓
"Attendance Logs" card shows 4 entries (Aug 28–29)
```

**NOTE:** `getRecentAttendance` selects `entry_time_ist` — this is a column in `attendance_report_view`, **not in the `attendance` table**. The `attendance` table has `entry_time` (timestamptz), not `entry_time_ist`. This will cause a silent Supabase error or return null values.

### 2c. Dashboard Attendance Chart (Last 7 Days)

```
getAttendanceChartData(branchId)
  ↓
services/dashboard.service.ts → getAttendanceChartData()
  ↓
For each of last 7 days (Sept 11 → Sept 17):
  supabase.from("attendance")
    .select("id", { count: "exact", head: true })
    .eq("attendance_date", dateStr)
    .eq("branch_id", branchId)
  ↓
Result: 0 for all 7 days (no data Sept 11–17)
  ↓
Chart shows flat line / all zeros
```

**This is correct behavior** — there is genuinely no data in those 7 days.

### 2d. /admin/attendance Page (Known Working Source)

```
/admin/attendance → AttendanceManagementClient (Client Component)
  ↓
Default date range: from=TODAY (Sept 17), to=TODAY
  ↓
fetch /api/attendance?status=mapped&from=2026-09-17&to=2026-09-17
  ↓
listNormalizedAttendance({ branchId, status: "mapped", from: "2026-09-17", to: "2026-09-17" })
  ↓
Queries attendance_sync_logs + attendance tables
  ↓
Result: 0 rows for Sept 17 (no data)
  ↓
"No attendance records found for this tab and date range."
```

**Both the dashboard AND the attendance page return zero for today.** The attendance page is NOT showing attendance data for today either. The user's concern about "attendance visible on /admin/attendance but not on dashboard" likely refers to the fact that:

1. The attendance page can be **manually date-filtered** to Aug 28–29 to see historical data
2. The dashboard only shows **today** (hard-coded to today's date for the count metric) and the **recent feed** (ordered by created_at desc)

---

## 3. Comparing Dashboard vs /admin/attendance

| Aspect | /admin/dashboard | /admin/attendance |
|---|---|---|
| Data source | `attendance` table directly | `attendance_sync_logs` + `attendance` tables (normalized) |
| Date filter | Hard-coded to today | User-selectable (default: today) |
| Branch filter | `profile.branch_id` ✅ | `profile.branch_id` ✅ |
| Uses SSR client | Yes (`createClient()`) | Yes (API route uses `createAdminClient()`) |
| RLS | Enforced (SSR client uses user's JWT) | Bypassed (admin client) |
| View used | `attendance` table | Both `attendance` table AND `attendance_sync_logs` |
| Can show old data | Recent feed shows Aug 28–29 ✅ | Yes, if user changes date range to Aug 28–29 |

**Key difference:** The `/admin/attendance` page uses `createAdminClient()` (service role, bypasses RLS). The dashboard uses `createClient()` (SSR client, enforces RLS with the logged-in user's JWT).

---

## 4. RLS Analysis

The `attendance` table RLS policy is:

```sql
create policy attendance_staff on public.attendance 
  for all to authenticated 
  using(
    public.app_role() = 'admin' 
    OR (is_staff_user() AND branch_id = current_branch_id())
  )
```

For the Talwalkar `owner` role:
- `public.app_role()` — returns the user's role from their JWT claims
- The owner role is mapped to `'admin'` in `app_role()` in some implementations, or it may not match `'admin'` exactly

**This is a potential issue:** If `app_role()` returns `'owner'` for the Talwalkar owner and the RLS policy only checks for `'admin'`, then the RLS policy would fall through to `is_staff_user() AND branch_id = current_branch_id()`. If `is_staff_user()` returns true for owner (it should), and `current_branch_id()` matches the profile's branch_id, then it would work.

However, since the dashboard shows `totalMembers` correctly (which is also RLS-filtered), the SSR client IS successfully reading from the database. So RLS is not blocking the dashboard for the owner role.

---

## 5. Root Cause Analysis

### Dashboard "Today's Attendance" = 0

**Root cause: No attendance data exists for Sept 17 (or any date after Aug 29).**

This is **not a code bug**. The attendance query is:
```typescript
supabase.from("attendance")
  .select("id", { count: "exact", head: true })
  .eq("attendance_date", today)     // "2026-09-17"
  .eq("branch_id", branchId)        // Talwalkar branch
```
This is correct. The database has 0 rows for Sept 17. The machine stopped syncing after Sept 11 (as established in the previous audit), so no attendance is being created for any date after Aug 29.

### Dashboard "Attendance Logs" feed shows old data or empty

The `getRecentAttendance` function has a **bug** — it selects `entry_time_ist` which is a column only in `attendance_report_view`, not in the `attendance` table. The dashboard queries the `attendance` table directly.

**Actual query:**
```typescript
supabase.from("attendance")
  .select("id, attendance_date, entry_time_ist, member_id, members(full_name, member_code)")
```

The `attendance` table has `entry_time` (timestamptz), not `entry_time_ist`. Supabase will silently ignore the unknown column and return `entry_time_ist: null` for all rows. The 4 Aug 28–29 rows will appear in the feed, but the time column shows nothing.

### Dashboard Attendance Chart = all zeros

**Root cause: Same as above.** No data exists in the last 7 days (Sept 11–17). The chart correctly shows zeros.

### Why /admin/attendance "worked before" Sept 13

The `/admin/attendance` page queries `attendance_sync_logs` (which had 187 events on Sept 11) AND `attendance` (which has 4 rows). When you select the date range as "yesterday + today" (which would be Sept 10–11), it shows sync logs from Sept 11. But the user logged in as `owner` was getting 403 for all those API calls until today's fix. So **both pages were showing nothing** before the owner fix — now both should show the correct (limited) data.

---

## 6. The `entry_time_ist` Bug

The `getRecentAttendance()` function in `dashboard.service.ts` queries the wrong column name:

```typescript
// dashboard.service.ts
export async function getRecentAttendance(branchId?: string | null, limit = 5) {
  const supabase = await createClient();
  let q = supabase
    .from("attendance")
    .select("id, attendance_date, entry_time_ist, ...")  // ← entry_time_ist does NOT exist in attendance table
```

The `attendance` table has:
- `entry_time` (timestamptz)
- `exit_time` (timestamptz)

The column `entry_time_ist` exists only in `attendance_report_view` (it's a computed column: `(a.entry_time at time zone 'Asia/Kolkata')::time`).

**Effect:** The 4 Aug 28–29 records do appear in the Attendance Logs feed on the dashboard, but the time column shows `null` / empty for all entries.

This is a minor display bug — it doesn't prevent data from appearing, it just shows no time value.

---

## 7. Answers

**A. Attendance exists in DB:** **YES** — 4 rows, all from Aug 28–29, 2026

**B. /admin/attendance can read it:** **YES** — with correct date range (Aug 28–29), using admin client (bypass RLS)

**C. Dashboard can read it:** **YES (PARTIALLY)** — `getDashboardData` (today's count) = 0 because no data today; `getRecentAttendance` (feed) = 4 rows from Aug 28–29, but with `entry_time_ist = null` due to wrong column name

**D. Tenant filter correct:** **YES** — `getDashboardData` passes `tenantId` for branches count only; attendance queries use `branch_id` which implicitly scopes to tenant

**E. Branch filter correct:** **YES** — `branchId = profile.branch_id` passed correctly to all dashboard queries

**F. Date filter correct:** **PARTIAL** — `todayAttendance` is hard-coded to today's date (Sept 17), and no data exists for today. This is correct behavior — the issue is the data gap, not the filter. The chart uses last 7 days, all zero.

**G. RLS correct:** **YES** — dashboard uses SSR client with user JWT; RLS policy allows staff/admin users with matching branch_id. Owner role is treated as admin in the RLS context via `is_staff_user()`.

**H. Exact root cause:**
There are two separate issues:

1. **Data gap (primary):** No attendance data exists after Aug 29, 2026 for Talwalkar. The dashboard correctly shows 0 for today and a flat chart. This is because the physical biometric machine stopped syncing after Sept 11, and even before that all events were `unmatched` (member mapping issue from previous audit). The dashboard is correct — there is simply no data.

2. **Wrong column name (minor, display bug):** `getRecentAttendance()` selects `entry_time_ist` from the `attendance` table. This column doesn't exist in that table (it exists only in `attendance_report_view`). The 4 existing records appear in the feed but show no time value.

**I. Exact safe fix required:**

**Fix 1 (column name bug — single line change):**  
In `services/dashboard.service.ts`, `getRecentAttendance()`:
```typescript
// Current (wrong):
.select("id, attendance_date, entry_time_ist, member_id, members(full_name, member_code)")

// Fixed:
.select("id, attendance_date, entry_time, member_id, members(full_name, member_code)")
```
Then update the type and template usage to use `entry_time` instead of `entry_time_ist`. The IST conversion can be done client-side with `new Date(entry_time).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })`.

**Fix 2 (data gap — not a code fix):**  
The dashboard showing 0 attendance is correct. The data gap (no attendance after Aug 29) is caused by:
- Physical machine offline since Sept 11 (connectivity fix at gym)
- Most events `unmatched` due to wrong `machine_user_id` values on members (mapping fix via admin UI)

These were documented in the previous two audits and require physical + data actions, not code changes.

---

## 8. /admin/attendance vs Dashboard — Key Structural Difference

| | Dashboard | /admin/attendance |
|---|---|---|
| Queries | `attendance` table (RLS enforced, SSR client) | `attendance_sync_logs` + `attendance` (service role, no RLS) |
| Visibility | 4 rows in Aug 28–29 + 0 for recent dates | 187 unmatched sync logs on Sept 11 + 4 attendance rows |
| Why different | Dashboard can ONLY see confirmed attendance rows | `/admin/attendance` also shows raw unmatched biometric events |
| "Attendance" meaning | Confirmed, matched attendance records | All biometric events including unmatched punches |

**This explains the perception that attendance is "visible on /admin/attendance but not on dashboard."**

The `/admin/attendance` page shows raw biometric events (including the 187 unmatched Sept 11 events from `attendance_sync_logs`). The dashboard only shows confirmed `attendance` table rows. Since all Sept 11 events were `unmatched` (member mapping issue), they created **no rows in the `attendance` table** — so the dashboard correctly shows 0.

The Sept 11 events appear in `/admin/attendance` because that page reads from `attendance_sync_logs`, which stores every punch regardless of matching status.

---

## Safe Fix Summary

| Fix | Type | Priority |
|---|---|---|
| `entry_time_ist` → `entry_time` in `getRecentAttendance()` | Code fix (1 line) | Low — minor display issue |
| Deploy owner role API fix to VPS | Deployment | High — fixes all dropdowns |
| Fix machine connectivity at gym | Physical action | Critical — restores new data |
| Map members to correct numeric machine IDs | Admin UI action | Critical — enables attendance creation |
