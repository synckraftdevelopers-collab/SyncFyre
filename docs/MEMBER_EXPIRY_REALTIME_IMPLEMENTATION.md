# Member Expiry — Real-Time / Date-Aware Implementation

_2026-09-18. Query/service-level implementation only — no migration, no destructive SQL, no historical subscription/member data touched, no bulk status update. See "Data safety" at the bottom for the explicit confirmation._

## 0. A note on the referenced audit

This task's instructions say to implement "strictly" based on a completed `MEMBER_EXPIRY_REALTIME_AUDIT.md`. That file does not exist anywhere in this repository's `docs/` folder (or anywhere else in the project) as of this session — it was checked for and not found. The task's own instructions, however, already contain the audit's finding, root cause, exact required behavior per area, and the full test matrix, so this implementation proceeds directly from that inlined specification. If a separate audit document exists elsewhere and should be reconciled with this write-up, please point it out.

## 1. Root cause (as given, confirmed against the real code)

`subscriptions.status` is a **write-time snapshot** — it is set once, when a subscription is created, renewed, paused, or cancelled, and nothing ever revisits it purely because `end_date` has since passed. Two consequences, both confirmed by reading the actual queries:

- A subscription can be `status = 'active'` with `end_date` weeks in the past, and every filter that does `eq(status, 'expired')` will miss it.
- `member_register_view.subscription_status` is sourced from the same `subscriptions.status` column, so the same gap exists everywhere that view is filtered by status.

This is the same class of bug already fixed for Outstanding Dues in this project (`docs/OUTSTANDING_DUES_REALTIME_IMPLEMENTATION.md`) — a stored status column that is only updated on write, read as if it were always current.

## 2. The fix — one canonical, date-aware check, three call sites updated

New, dependency-free module `lib/subscription-expiry.ts` (deliberately has zero imports — see §6 on why):

```ts
export function isExpiredByDate(
  status: string | null | undefined,
  endDate: string | null | undefined,
  todayDateKey: string
): boolean {
  if (status === "expired") return true;
  if (status === "active" && !!endDate && endDate < todayDateKey) return true;
  return false;
}

export function buildExpiredOrFilter(
  statusColumn: string,
  endDateColumn: string,
  todayDateKey: string
): string {
  return `${statusColumn}.eq.expired,and(${statusColumn}.eq.active,${endDateColumn}.lt.${todayDateKey})`;
}
```

`isExpiredByDate()` is the plain-language logic (used directly in the test suite). `buildExpiredOrFilter()` turns it into the exact PostgREST `.or()` expression the Supabase query builder needs, parameterized by column name so the same logic works against both `subscriptions` (`status`/`end_date`) and `member_register_view` (`subscription_status`/`subscription_end`).

Both are re-exported from the existing `lib/member-expiry.ts` (the project's established home for member-expiry helpers, already used by `EXPIRY_QUICK_FILTERS`/`getExpiryDateRange`/`getExpiringWithinDays`), so every consuming file imports from the same place as before.

**Deliberately narrow**: only a stored status of `expired`, or `active` with a past end date, counts as expired. `paused`/`pending`/`cancelled` are left exactly as they already behave — this does not redefine "expired" for every status, only closes the specific active-but-date-expired gap.

### Area 1 — `/admin/subscriptions` expired filter

`app/(admin)/admin/subscriptions/page.tsx` built its own inline query (it does not go through `services/subscription.service.ts#listSubscriptions`, which exists but is not called by this page — confirmed by search). Before:

```ts
if (params.status && params.status !== "all") query = query.eq("status", params.status);
```

After — every other status value (`active`/`paused`/`pending`/`cancelled`) is untouched; only `expired` is date-aware:

```ts
if (params.status && params.status !== "all") {
  if (params.status === "expired") {
    const todayKey = getLocalDateKey(new Date(), "Asia/Kolkata");
    query = query.or(buildExpiredOrFilter("status", "end_date", todayKey));
  } else {
    query = query.eq("status", params.status);
  }
}
```

`SubscriptionExpiryBadge` (`components/modules/subscription-status-badge.tsx`) was not touched — it already computes "Expired Xd ago" independently from `end_date`, so a row that now correctly appears under the Expired filter already renders its true expiry state via that badge.

### Area 2 — `/admin/members` `sub_status` filter

The consuming query, not the view, was fixed, per the instruction to prefer that. `services/member-extended.service.ts#listMembersRich()` — the shared function behind both `/admin/members` and `/reception/members` (both pass `subscriptionStatus: sp.sub_status` into it) — filtered with:

```ts
if (subscriptionStatus && subscriptionStatus !== "all")
  query = query.eq("subscription_status", subscriptionStatus);
```

Now:

```ts
if (subscriptionStatus && subscriptionStatus !== "all") {
  if (subscriptionStatus === "expired") {
    const todayKey = getLocalDateKey(new Date(), "Asia/Kolkata");
    query = query.or(buildExpiredOrFilter("subscription_status", "subscription_end", todayKey));
  } else {
    query = query.eq("subscription_status", subscriptionStatus);
  }
}
```

`member_register_view` itself was **not modified**. Active / Expiring Soon / All filters, search, pagination, branch scoping (`.eq("branch_id", branchId)`, applied earlier in the same function and untouched) and tenant isolation (enforced by RLS on the SSR client, untouched) are all unaffected — this only changes what `subscriptionStatus === "expired"` matches.

The `/admin/members` page's own **Expired filter badge count** (a separate inline query, not going through `listMembersRich`) had the identical bug and was fixed the same way:

```ts
// before
bindFinancialYear(bindBranch(sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "expired")))
// after
bindFinancialYear(bindBranch(sb.from("subscriptions").select("id", { count: "exact", head: true }).or(buildExpiredOrFilter("status", "end_date", today))))
```

`today` here is the same `getExpiryDateRange(0, timeZone).from` value the page already computed and used for its other queries — no new date computation was introduced.

### Area 3 — Dashboard `expiredMemberships` KPI

`services/dashboard.service.ts#getDashboardData()`:

```ts
// before
branch(supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "expired"))
// after
branch(supabase.from("subscriptions").select("id", { count: "exact", head: true }).or(buildExpiredOrFilter("status", "end_date", today)))
```

`today` is the function's existing `getLocalDateKey(new Date(), timeZone)` value (already computed at the top of the function and used by the `expiring` query one line above) — reused as-is. No other dashboard KPI (`expiringMemberships`, `activeMembers`, `revenue`, `pendingPayments`, `outstandingPayments`, etc.) was touched.

## 3. Why `end_date` (not stored status) drives live expiry

Because `end_date` is the one fact about a subscription that is never stale — it is set once at sale/renewal time and does not need any write event to stay meaningful as "today" moves forward. `status`, by contrast, requires an explicit write to change, and nothing in this codebase performs that write on a schedule (the one place that does — `expire_overdue_subscriptions()`, wired into the nightly Vercel Cron per `supabase/migrations/0050_expire_overdue_subscriptions.sql` — only runs once a day, so between runs, or if a cron run is ever missed, `status` can lag `end_date` by up to 24+ hours). Comparing `end_date` directly against today's date at query time removes that dependency entirely: a subscription is correctly classified as expired the instant its end date passes, on every page load, with no cron involved.

## 4. Date/time strategy

Every "today" used by this fix comes from the project's existing canonical helper, `getLocalDateKey(new Date(), timeZone)` (`lib/time.ts`), computed fresh on every request — never a browser-local date, never hardcoded, never cached across requests:

- `services/dashboard.service.ts` and `app/(admin)/admin/members/page.tsx` reuse a `today` value each file already computed for its other queries.
- `app/(admin)/admin/subscriptions/page.tsx` and `services/member-extended.service.ts` compute `getLocalDateKey(new Date(), "Asia/Kolkata")` locally, matching the same hardcoded-timezone convention already used throughout this codebase (`dashboard.service.ts`'s default `timeZone = "Asia/Kolkata"` parameter, `lib/member-expiry.ts`'s existing helpers). No new timezone convention was introduced.

## 5. Real-time behavior

Every one of these four queries runs through `lib/supabase/server.ts#createClient()`, which calls `cookies()` from `next/headers` — this already opts every page here into dynamic, per-request rendering (the same convention the rest of the app relies on; confirmed, no `export const dynamic` or `revalidate` window exists or was needed). Combined with computing `today` fresh on every call and comparing it directly against `end_date` in the query, a subscription flips from "not shown under Expired" to "shown under Expired" automatically on the next page load once its end date passes — no cron job, no manual status edit, no cache invalidation.

## 6. Why `lib/subscription-expiry.ts` is a separate, dependency-free file

`lib/member-expiry.ts` imports `getLocalDateKey` from `@/lib/time` (a path alias). That's fine for the real app (Next.js/webpack resolve `@/` via `tsconfig.json`'s `paths`), but this project's unit tests run via plain `node --experimental-strip-types --test`, which has no path-alias resolution at all — confirmed by checking the existing test suite: every file it already tests (`lib/membership-dates.ts`, `lib/finance/gst.ts`, `lib/finance/payment-balance.ts`) has zero `@/` imports, for exactly this reason. `isExpiredByDate`/`buildExpiredOrFilter` don't need `getLocalDateKey` themselves (they take `todayDateKey` as a plain string parameter), so they were placed in their own import-free module and re-exported from `lib/member-expiry.ts` for callers — testable directly, zero behavior change for any existing caller of `lib/member-expiry.ts`.

## 7. Files changed

| File | Change |
|---|---|
| `lib/subscription-expiry.ts` | **New.** `isExpiredByDate()` and `buildExpiredOrFilter()` — the single canonical, date-aware expiry check and its PostgREST filter builder. Zero imports (unit-testable with the project's plain `node --test` runner). |
| `lib/member-expiry.ts` | Re-exports the two functions above from `lib/subscription-expiry.ts`. No other change — `EXPIRY_QUICK_FILTERS`, `getExpiryDateRange`, `getExpiringWithinDays` untouched. |
| `app/(admin)/admin/subscriptions/page.tsx` | Expired status filter is now date-aware (Area 1). `SubscriptionExpiryBadge`/`SubscriptionStatusBadge` untouched. |
| `services/member-extended.service.ts` | `listMembersRich()`'s `subscriptionStatus === "expired"` filter is now date-aware (Area 2). All other filters, search, pagination untouched. |
| `app/(admin)/admin/members/page.tsx` | The Expired filter badge count query is now date-aware (Area 2, the KPI feeding `MemberFilters`'s counts). Active/Expiring Soon/All/search/pagination/branch scoping untouched; `ExpiringPlansCard` untouched. |
| `services/dashboard.service.ts` | `expiredMemberships` KPI query is now date-aware (Area 3). No other KPI changed. |
| `tests/member-expiry.test.mts` | **New.** Unit tests for `isExpiredByDate()`/`buildExpiredOrFilter()` — request's test cases 1–7 plus dashboard/member-filter scenarios. |
| `docs/MEMBER_EXPIRY_REALTIME_IMPLEMENTATION.md` | This document. |

No migration file was created or modified. No table, trigger, view, or RLS policy was created, dropped, or altered. `member_register_view` (defined across `0002_report_views.sql` and `0049_fix_member_register_view_payment_columns.sql`) was read for its column names only, never written to.

## 8. Tests

`tests/member-expiry.test.mts`, run via the project's existing `npm test` (`node --experimental-strip-types --test tests/*.test.mts`). "Today" is fixed at `2026-09-18` throughout so the tests never go stale.

| Case | Input | Expected | Result |
|---|---|---|---|
| 1 | `end_date` = yesterday, `status` = active | Expired filter includes it | ✅ |
| 2 | `end_date` = yesterday, `status` = expired | Expired filter includes it | ✅ |
| 3 | `end_date` = today, `status` = active | NOT expired | ✅ |
| 4 | `end_date` = tomorrow, `status` = active | NOT expired | ✅ |
| 5 | `end_date` = 30 days ago, `status` = active | Expired | ✅ |
| 6 | Multiple tenants | Tenant isolation preserved (no cross-tenant leakage) | ✅ |
| 7 | Multiple branches | Branch isolation preserved (no cross-branch leakage) | ✅ |
| — | Dashboard: active-but-past-`end_date` | Counted as expired | ✅ |
| — | Dashboard: future subscription | Not counted | ✅ |
| — | Member filter: active-but-past-`end_date` | Appears under Expired | ✅ |
| — | Member filter: active future subscription | Does not appear | ✅ |
| — | `status = expired` with a future `end_date` (e.g. a manual correction) | Still counted (stored `expired` is always trusted) | ✅ |
| — | `paused`/`pending`/`cancelled` with a past `end_date` | NOT reclassified as expired (existing functionality preserved) | ✅ |
| — | `buildExpiredOrFilter()` output | Exact PostgREST OR-group syntax used by every call site | ✅ |

Cases 6 and 7 (tenant/branch isolation) are verified two ways: (a) by construction — the fix only changes the status/end_date filter dimension; the existing `.eq("branch_id", ...)` calls in every call site, and RLS-enforced tenant isolation, are untouched and still AND together with the new `.or(...)` clause exactly as they did with the old `.eq("status", ...)` clause; (b) by a unit test that simulates the same combination (`row.branch_id === target && isExpiredByDate(...)`) over a small multi-tenant, multi-branch in-memory dataset and confirms no cross-tenant/branch row is ever selected.

All 41 tests across the full available local suite pass (10 pre-existing across `tests/gst.test.mts`, `tests/membership-dates.test.mts`; 15 pre-existing in `tests/payment-balance.test.mts` from the earlier Outstanding Dues task; 16 new in `tests/member-expiry.test.mts`):

```
$ node --experimental-strip-types --test tests/*.test.mts
# tests 41
# pass 41
# fail 0
```

## 9. Verification performed this session

- **Unit tests**: 41/41 pass (above).
- **TypeScript**: scoped `tsc --noEmit --strict` against every changed/new file (`lib/subscription-expiry.ts`, `lib/member-expiry.ts`, `app/(admin)/admin/subscriptions/page.tsx`, `app/(admin)/admin/members/page.tsx`, `services/dashboard.service.ts`, `services/member-extended.service.ts`, `tests/member-expiry.test.mts`) using the project's real `tsconfig.json` compiler options and real `next`/`react`/`@supabase/ssr`/`@supabase/supabase-js` type packages — **0 errors on every line this task touched**. The two admin pages transitively import a much larger, untouched component tree (Excel import dialog, member view toggle, member filters, etc.); those files pull in a handful of packages this scoped environment doesn't have installed (`xlsx`, plus several sibling `@/components/members/*` files) and one pre-existing, unrelated type-looseness warning in `services/member-extended.service.ts`'s `getPlanOptions()` (line 641, nowhere near this task's `listMembersRich()` change, and present before this task started) — none of that is part of this diff.
- **Lint**: `eslint` against the same 6 changed files using the project's own `eslint.config.mjs` (`next/core-web-vitals`) — **0 errors, 0 warnings**.
- **Production build**: not run — this session has no shell access on the machine hosting the repository, only file read/write access, so a full `next build` (which needs the complete app tree and its full dependency set) isn't possible from here. **Please run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` locally** to confirm against the full project.
- **Manual page inspection**: not possible from this session (no way to run the dev server against live data from here). Please open `/admin/subscriptions` (Expired filter), `/admin/members` (Expired filter / badge count), and the dashboard after deploying, and confirm a subscription that is still `status = 'active'` with a past `end_date` now shows up in all three places.

## 10. Data safety — confirmed

- **No migration** was created or modified.
- **No database schema change.**
- **No destructive SQL.**
- **No data update of any kind** — `subscriptions.status` and `member_register_view` rows are untouched by this task; only how the app *queries* them changed.
- **No bulk status update or backfill.**
- **No historical subscription/renewal/payment record was rewritten.**
- **No existing member data was changed.**
- **No Talwalkar data was touched.**
- **No Demo Gym data, classification, or plan was touched.**
- **No commercial plan/entitlement logic was touched.**
- Not changed, as instructed: `SubscriptionExpiryBadge`, `ExpiringPlansCard`, `/admin/renewals` logic, `member_register_view`'s `days_remaining` calculation, tenant/branch relationships, RLS policies, schema, migrations.
