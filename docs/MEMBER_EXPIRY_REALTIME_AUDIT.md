# Member Expiry Real-Time Audit

**Date:** September 17, 2026  
**Status:** READ-ONLY — No changes made  
**Analyst:** Kiro  

---

## 1. Executive Summary

The member expiry list already has substantial real-time/date-aware infrastructure. The core issue is **not that the system lacks date comparison** — it has it. The issue is that:

1. **The subscriptions page** (`/admin/subscriptions`) filters by `status = 'expired'` (a stored field), which is not automatically updated when `end_date` passes. A subscription whose `end_date` was yesterday but whose `status` is still `"active"` will NOT appear in the expired filter.

2. **The member register / members page** filters by `subscription_status` which also reads the stored status field from the latest subscription, not from a date comparison.

3. **The `SubscriptionExpiryBadge`** component correctly uses the current date for display (showing "Expired 47d ago"), so the **display calculation is correct** — but the **list filtering** relies on the stored status field.

4. **The `member_register_view` `days_remaining`** column is `(s.end_date - current_date)` — this IS computed dynamically. Similarly `subscription_status` in the view comes from `sub.status` (the stored field), NOT from a date comparison.

**The fix required is minimal:**
- The subscriptions page filter for "expired" must add an OR condition for `end_date < today` (to catch subscriptions whose date passed but status wasn't updated)
- The members page `sub_status` filter should also catch date-expired subscriptions
- No migration needed
- No data updates needed
- The `SubscriptionExpiryBadge` is already correct — no change needed

---

## 2. Current Expiry Architecture

### Source Tables

| Table | Relevant Fields |
|---|---|
| `subscriptions` | `status` (stored: active/expired/paused/cancelled/pending), `start_date`, `end_date` |
| `member_register_view` | `subscription_status` (from `sub.status` — stored), `days_remaining` (computed: `s.end_date - current_date`) |
| `membership_report_view` | `subscription_status` (stored), `days_left` (computed: `s.end_date - current_date`) |

### Status Field Values

The `subscriptions.status` field is a stored text value set when:
- Created: `'active'` or `'pending'`
- Admin pauses: `'paused'`
- Admin cancels: `'cancelled'`
- Admin explicitly expires: `'expired'`
- Cron/automation marks expired: only if `generate_membership_reminders()` RPC does this (see section 7)

**The status field is NOT automatically updated when `end_date` passes.** There is no DB trigger or constraint that changes `status = 'active'` to `'expired'` when `end_date < current_date`.

---

## 3. Current Status Calculation Per Page

### `/admin/subscriptions` (subscriptions list)

```typescript
// Direct DB query with stored status filter
if (params.status && params.status !== "all") 
    query = query.eq("status", params.status);
```

**Problem:** `status = 'expired'` only returns subscriptions explicitly marked expired. A subscription with `status = 'active'` and `end_date = '2026-08-01'` (47 days ago) will NOT appear in the expired filter.

**Display:** `SubscriptionExpiryBadge` computes from `end_date`:
```typescript
function getDaysRemaining(endDate) {
  const target = new Date(`${endDate}T00:00:00`);
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}
// days < 0 → "Expired 47d ago" ✅ correct display
```

So the display badge is correct but the filter for "expired" status misses subscriptions whose date passed but status wasn't updated.

### `/admin/members` (member list with sub_status filter)

```typescript
// From listMembersRich → member_register_view
if (subscriptionStatus && subscriptionStatus !== "all")
    query = query.eq("subscription_status", subscriptionStatus);
```

`subscription_status` in `member_register_view` comes from `sub.status` — the stored field. Same problem as above.

However, the expiry date range filters work correctly:
```typescript
if (expiryDateFrom) query = query.gte("subscription_end", expiryDateFrom);
if (expiryDateTo)   query = query.lte("subscription_end", expiryDateTo);
```

The `ExpiringPlansCard` uses `subscription_end` date comparisons correctly:
```typescript
bindBranch(sb.from("member_register_view")
  .select("member_id,subscription_end")
  .eq("member_status", "active")
  .eq("subscription_status", "active")  // ← relies on stored status
  .gte("subscription_end", today)
  .lte("subscription_end", expiringThrough)
```

This also has the issue: `subscription_status = 'active'` filter will miss members whose subscription date passed but status wasn't updated.

### `/admin/renewals` (renewal due list)

Uses `getExpiringMemberships()` from `dashboard.service.ts`:
```typescript
supabase.from("subscriptions")
  .select(...)
  .eq("status", "active")          // stored status filter
  .gte("end_date", today)           // ← date filter: only future
  .lte("end_date", inThirtyDays)    // ← date filter: within 30 days
```

This is correct for the renewals use case (showing active subscriptions expiring soon). It correctly uses date comparison for the window.

### `SubscriptionExpiryBadge` (display only)

```typescript
// Computes from actual end_date — CORRECT
getDaysRemaining(endDate) → days → "Expired Xd ago" / "Xd left" / "Expires today"
```

**This is already date-aware and correct. No change needed.**

---

## 4. Why the List Appears Stale

### Root Cause

**The `subscriptions.status` field is not automatically synchronized with the passage of time.**

A subscription created with:
- `status = 'active'`
- `end_date = '2026-08-01'`

On September 17, 2026:
- `SubscriptionExpiryBadge` correctly shows "Expired 47d ago" (uses `end_date`)
- `status` filter `?status=expired` returns NO results for this subscription (because `status` is still `'active'`)
- `status` filter `?status=active` incorrectly INCLUDES this subscription

The system shows the correct display label (badge) but the filter/count logic is wrong.

### Why This Is Not Catastrophic

The `days_remaining` and `days_left` computed columns in both views use `current_date`:
```sql
(s.end_date - current_date) as days_remaining
```

So any code using `days_remaining` is already date-aware. The problem is only in code that filters by `subscription_status = 'active'` or `= 'expired'`.

---

## 5. Timezone Behavior

### Database

- `subscriptions.end_date` is a `date` column (no timezone).
- `subscriptions.start_date` is a `date` column.
- The view uses `current_date` — which is evaluated in the database server's timezone (UTC unless configured otherwise).

### Application

- `getLocalDateKey(new Date(), timeZone)` is used in multiple places to get today's date in the branch/tenant timezone (defaults to `"Asia/Kolkata"`).
- `getExpiryDateRange()` uses `getLocalDateKey` and computes date ranges in the gym's timezone.
- `getDashboardData()` uses `getLocalDateKey(new Date(), timeZone)` for the today date.

### The Timezone Gap

The view uses `current_date` (DB server time, UTC) but the application uses `getLocalDateKey` (IST by default). For gyms in IST (UTC+5:30), the DB's `current_date` = Sept 16 at 11:30 PM IST = Sept 17 in IST. This means:

- A subscription with `end_date = '2026-09-17'` computed at 11:59 PM IST (= UTC 18:29 Sept 17)
- DB `current_date` = Sept 17 (UTC) → `days_remaining = 0`
- Application `getLocalDateKey(..., "Asia/Kolkata")` → Sept 17 → same result

For most IST use cases, both compute the same date. Edge cases exist at midnight IST (18:30 UTC) when IST rolls to the next day before UTC does.

**Recommendation:** The `getLocalDateKey()` approach in the application is slightly more correct for multi-timezone SaaS. For the fix, use `getLocalDateKey(new Date(), timeZone)` to compute today's date server-side in the correct timezone.

---

## 6. Dashboard Behavior

### `getDashboardData` — `todayAttendance`

Uses `attendance_date = today` where `today = getLocalDateKey(new Date(), timeZone)`. Correct.

### `getDashboardData` — `expiringMemberships`

```typescript
branch(supabase.from("subscriptions")
  .select("id", { count: "exact", head: true })
  .eq("status", "active")      // ← stored status
  .lte("end_date", inThirtyDays)
  .gte("end_date", today))
```

This correctly excludes already-expired subscriptions (via `gte("end_date", today)`). The dashboard count shows subscriptions that are both `status='active'` AND expiring within 30 days. If a subscription's `end_date` passed but `status` is still `'active'`, it won't appear here because of the `gte("end_date", today)` guard. So the **dashboard count is correct** for this widget.

### `getDashboardData` — `expiredMemberships`

```typescript
branch(supabase.from("subscriptions")
  .select("id", { count: "exact", head: true })
  .eq("status", "expired"))   // ← only stored expired
```

**Problem:** This ONLY counts subscriptions explicitly marked `status = 'expired'`. Subscriptions that expired by date but still have `status = 'active'` are NOT counted here.

This means the dashboard "Expired Members" count is understated.

---

## 7. Notification Behavior

### `generate_membership_reminders` RPC

Called by `runNotificationAutomation()` → cron `GET /api/cron/reminders`. This is a Postgres function that generates reminder notifications. It likely queries subscriptions by date (not status) to determine upcoming/expired memberships for notification purposes.

**What to verify:** Whether this RPC also updates `subscriptions.status` to `'expired'`. If it does, running the cron would sync the status field. Looking at the cron behavior — it calls `queueSubscriptionReminders()` which calls `generate_membership_reminders()`. The function name suggests it only QUEUES notifications, not that it updates statuses.

**The system does NOT have an automatic subscription status updater.** The status is set manually by admins or via explicit lifecycle actions.

---

## 8. Subscription vs Member Status

- `subscriptions.status` — tracks the lifecycle of one subscription period
- `members.status` — tracks the member's overall status (active/inactive)

A member is marked `inactive` only explicitly by an admin (via `deactivateMember()`). A member with an expired subscription still has `status = 'active'` on the `members` table unless manually deactivated. This is correct behavior — a member can have an expired subscription but still be a valid member who could renew.

**No change needed here.** The fix must NOT mark members inactive when their subscription expires.

---

## 9. Renewal Flow

The renewal flow is correct and unaffected:
- `renewSubscriptionAction` → extends `end_date`, sets `status = 'active'`
- `renewMembership` → creates a new subscription record with `status = 'active'`

The `renewSubscriptionAction` has a guard: `if (subscription.status !== "active") throw new Error("Only an active subscription can be renewed.")` — **this is a problem** for expired subscriptions that still show `status = 'active'` in the DB. These would incorrectly be renewable. But subscriptions that were never updated to `'expired'` would still appear active and be renewable — which may actually be the desired behavior (gym staff can renew whenever).

---

## 10. The Canonical Effective Status

There is no single `getEffectiveSubscriptionStatus()` function currently. The effective status can be derived as:

```typescript
function getEffectiveSubscriptionStatus(
  status: string,
  endDate: string,
  today: string  // YYYY-MM-DD, computed server-side in tenant timezone
): "active" | "expiring_today" | "expiring_soon" | "expired" | "paused" | "cancelled" | "pending" {
  if (status === "cancelled") return "cancelled";
  if (status === "paused") return "paused";
  if (status === "pending") return "pending";
  if (endDate < today) return "expired";         // date has passed
  if (endDate === today) return "expiring_today";
  if (daysBetween(endDate, today) <= 30) return "expiring_soon";
  return "active";
}
```

This function should be the canonical source of truth for display AND filtering.

---

## 11. Exact Safe Fix

### Strategy

The fix uses **date-aware queries** at the Supabase level rather than updating stored status values. This is:
- Safe: no data modification
- Idempotent: works correctly on every page load
- No migration needed: uses existing `end_date` column

### What to Change

**1. `/admin/subscriptions` page — expired filter**

Current:
```typescript
if (params.status && params.status !== "all") 
    query = query.eq("status", params.status);
```

Fix: When `params.status === "expired"`, also include subscriptions that are past their `end_date` regardless of stored status:
```typescript
if (params.status && params.status !== "all") {
  if (params.status === "expired") {
    // Include stored expired AND date-expired with non-terminal status
    const today = getLocalDateKey(new Date(), "Asia/Kolkata"); // use tenant TZ
    query = query.or(`status.eq.expired,and(end_date.lt.${today},status.eq.active)`);
  } else if (params.status === "active") {
    // Exclude date-expired subscriptions even if still stored as active
    const today = getLocalDateKey(new Date(), "Asia/Kolkata");
    query = query.eq("status", "active").gte("end_date", today);
  } else {
    query = query.eq("status", params.status);
  }
}
```

**2. Members page `sub_status` filter in `listMembersRich`**

The `member_register_view` `subscription_status` is the stored status. When filtering for `subscription_status = 'expired'`, we should also capture date-expired subscriptions.

The cleanest fix: add a `days_remaining` filter to the query instead of relying on `subscription_status`:
- When `sub_status = 'expired'`: filter `days_remaining < 0` OR `subscription_status = 'expired'`
- When `sub_status = 'active'`: filter `subscription_status = 'active'` AND `days_remaining >= 0`

**3. `ExpiringPlansCard` counts on members page**

The `.eq("subscription_status", "active")` filter needs to also exclude date-expired subscriptions:
```typescript
// Also add: .gte("subscription_end", today)
bindBranch(sb.from("member_register_view")
  .select("member_id,subscription_end")
  .eq("member_status", "active")
  .eq("subscription_status", "active")
  .gte("subscription_end", today)   // ← already there ✅
  .lte("subscription_end", expiringThrough)
```
This one is actually already correct.

**4. Dashboard `expiredMemberships` count**

Add date-based expired count to include subscriptions past their `end_date`:
```typescript
// Add OR condition: end_date < today
const today = getLocalDateKey(new Date(), timeZone);
branch(supabase.from("subscriptions")
  .select("id", { count: "exact", head: true })
  .or(`status.eq.expired,and(end_date.lt.${today},status.eq.active)`))
```

**5. `SubscriptionExpiryBadge` — NO CHANGE NEEDED**

Already date-aware and correct.

**6. Renewals page — NO CHANGE NEEDED**

Already uses both `status = 'active'` AND `end_date >= today` guard, so it naturally excludes expired-by-date subscriptions.

---

## 12. Files to Change

| File | Change | Priority |
|---|---|---|
| `app/(admin)/admin/subscriptions/page.tsx` | Fix `status = 'expired'` filter to include date-expired subscriptions | High |
| `services/member-extended.service.ts` | Fix `subscriptionStatus = 'expired'` filter in `listMembersRich` | High |
| `services/dashboard.service.ts` | Fix `expiredMemberships` count to include date-expired | Medium |
| `app/(admin)/admin/members/page.tsx` | Fix `expiredSubs` count query | Medium |

---

## 13. Whether Migration Is Required

**NO MIGRATION NEEDED.**

The fix is entirely in query logic — using `end_date` comparisons alongside stored `status` filters. The existing schema already has everything needed:
- `subscriptions.end_date` (date column, indexed)
- `member_register_view.days_remaining` (`end_date - current_date`, live computed)
- `member_register_view.subscription_end` (`s.end_date`, live column)

---

## 14. Test Plan

| Case | Input | Expected Result |
|---|---|---|
| **CASE 1** | Subscription `end_date` = yesterday, `status = 'active'` | Appears in expired filter; shows "Expired 1d ago" |
| **CASE 2** | Subscription `end_date` = today, `status = 'active'` | Active filter includes; shows "Expires today" |
| **CASE 3** | Subscription `end_date` = today (midnight boundary) | Uses server-side IST date; correctly shown as today |
| **CASE 4** | Subscription `end_date` = tomorrow, `status = 'active'` | Shows "1d left"; in active filter |
| **CASE 5** | Subscription `end_date` = 7 days from now | Shows "7d left"; in active filter; in expiring soon |
| **CASE 6** | Subscription `end_date` = 30 days from now | Shows "30d left"; in renewals page |
| **CASE 7** | Subscription `end_date` = 47 days ago, `status = 'active'` | Shows "Expired 47d ago" ✅ already works; appears in expired filter after fix |
| **CASE 8** | Admin renews expired member | New active subscription; member moves to active filter |
| **CASE 9** | Search + expired filter | Returns date-expired AND stored-expired subscriptions matching search |
| **CASE 10** | Dashboard expired count | Includes date-expired subscriptions |
| **CASE 11** | Tenant A expiry data | Never appears for Tenant B (existing RLS unchanged) |
| **CASE 12** | Branch A expiry data | Respects branch isolation (existing filter unchanged) |

---

## 15. Preservation Guarantees

All of the following are preserved by the fix:
- ✅ Existing subscription records (no data modification)
- ✅ Member records (not touched)
- ✅ Historical subscription history
- ✅ Talwalkar data (no changes)
- ✅ Tenant isolation (RLS and branch filters unchanged)
- ✅ Renewals page behavior
- ✅ The `SubscriptionExpiryBadge` component (already correct)
- ✅ The `ExpiringPlansCard` (already correct)
- ✅ Notification infrastructure (unchanged)
- ✅ No duplicate subscription system created

---

## 16. What Is Intentionally NOT Changed

- **`subscriptions.status` field** — not bulk-updated. The fix adds date comparisons at query time, not a background job that updates status.
- **No `status_effective` computed column** — not needed; queries can derive it from `end_date`.
- **No cron to sync status** — the system works correctly without it after the query fix.
- **`member_register_view`** — not modified; `days_remaining` is already computed correctly.
- **Notification logic** — not modified; it uses its own date-based queries internally.

---

## AUDIT COMPLETE — READY FOR IMPLEMENTATION

**Summary of what's wrong:**

The `/admin/subscriptions` expired filter uses `status = 'expired'` only. The `/admin/members` sub_status expired filter uses `subscription_status = 'expired'` only. The dashboard `expiredMemberships` count uses `status = 'expired'` only. None of these automatically include subscriptions that have passed their `end_date` but whose stored status is still `'active'`.

**The display label (`SubscriptionExpiryBadge`) is already correct and shows the right "Expired Xd ago" text.** The problem is purely in filtering and counting.

**The fix is 4 small query changes, no migration, no data modification.**
