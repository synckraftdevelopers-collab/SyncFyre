# Outstanding Dues — Real-Time / Dynamic Implementation

_2026-09-18. Query/service/UI implementation only — no migration, no destructive SQL, no historical payment data touched. See "Data safety" at the bottom for the explicit confirmation._

## 1. The ask

Finance → Outstanding Dues (`/admin/finance/outstanding`) must always reflect the **current** database state on every load/refresh: overdue/pending counts and amounts, the receivables table, and each row's balance and status — computed dynamically, never hardcoded, never trusted from a stale snapshot.

## 2. Root cause

The page was **not** static — `supabase/migrations/0047_receivables_auto_create.sql` (applied earlier this session) already wired the `receivables` table up to real invoice/payment activity. The bug was narrower and easy to miss: **the stored `receivables.status` column is a write-time snapshot, never revisited by the passage of time.**

Two triggers write it:

- `sync_receivable_from_invoice()` (`0047_receivables_auto_create.sql`) — fires on invoice insert/update, sets `status` to `'partial'` / `'overdue'` / `'pending'` based on `due_date < current_date` **at that moment**.
- `sync_receivable_on_payment()` (`0005_finance_module.sql`) — fires on payment completion, sets `status` to `'paid'` / `'partial'`, again **at that moment**. It never considers the due date, and it never re-fires just because a day has passed.

So a receivable correctly created as `pending` (due date still in the future) stays `pending` forever unless another invoice or payment event happens to touch that same row — even after its due date has been in the past for days or weeks. This is exactly the "Overdue: 0" symptom in section 16 of the request: the KPI trusted the stored `status` column instead of comparing `due_date` to today.

`balance_amount`, by contrast, was already trustworthy — both triggers recompute it as `original_amount - paid_amount` on every invoice/payment event, so it always reflects the real amount owed. No migration and no data backfill were needed; this was purely a matter of the read path no longer trusting a column that can't be trusted.

## 3. Existing source of truth (reused, not duplicated)

```
Outstanding Dues UI  (app/(admin)/admin/finance/outstanding/page.tsx)
  → services/finance.service.ts
      getOutstandingReceivablesSummary()
      listReceivables()
      getReceivableAging()
  → Supabase `receivables` table (RLS via SSR client — tenant/branch isolation
    enforced automatically, unchanged)
      kept in sync with:
        invoices.total_amount / invoices.amount_paid / invoices.due_date
          via sync_receivable_from_invoice() trigger (0047)
        payments.amount / payments.refund_amount / payments.status
          via sync_receivable_on_payment() trigger (0005)
```

No new table, no duplicate payment logic, no second entitlement/status evaluator was introduced. The same `receivables` table that already powers the Finance dashboard tile (`services/dashboard.service.ts`) and the Member 360 profile's Outstanding panel (`components/members/member-360.tsx`) is used unchanged — both of those already sum `balance_amount` directly and were never affected by the stale-status bug (they don't classify overdue vs. pending), so they needed no changes.

## 4. The fix: a single canonical, date-aware status function

New shared helper, `computeReceivableDisplayStatus()` in `lib/finance/payment-balance.ts` (the file that already held the project's other canonical money-status helper, `calculatePaymentBalance`):

```ts
export type ReceivableDisplayStatus = "overdue" | "pending" | "paid" | "written_off";

export function computeReceivableDisplayStatus(
  balanceAmount: number,
  dueDate: string | null,
  storedStatus: string,
  todayDateKey: string
): ReceivableDisplayStatus {
  if (storedStatus === "written_off") return "written_off"; // manual, never re-derived
  if (roundMoney(balanceAmount) <= 0) return "paid";
  if (dueDate && dueDate < todayDateKey) return "overdue";
  return "pending";
}
```

This is the **only** place that decides "is this actually overdue right now." It is called fresh on every request, from live `balance_amount` / `due_date` values, never from the stored `status` column — except for `written_off`, which is a real, deliberate, manually-set terminal state (not a time-based snapshot) and is intentionally never re-derived, matching the existing trigger behavior that already protects it ("never resurrect a receivable someone has explicitly written off").

### Balance

`balance_amount = original_amount - paid_amount`, computed and stored by the existing DB triggers on every invoice/payment write (not touched by this task). The service layer trusts this value directly — it does not re-derive it from raw payment history, which would mean re-implementing payment logic that already exists and is exercised elsewhere in the app (avoids the N+1 / duplicate-logic risk called out in the request).

### Overdue logic

`balance_amount > 0 AND due_date < today` → `overdue`. Evaluated fresh on every call to `getOutstandingReceivablesSummary()` / `listReceivables()` / `getReceivableAging()` — not filtered by the stored `status` column at all (except to exclude `written_off`, which is trustworthy).

### Pending logic

`balance_amount > 0 AND (due_date IS NULL OR due_date >= today)` → `pending`.

### KPI calculation

`services/finance.service.ts#getOutstandingReceivablesSummary()`:

1. Query `receivables` where `balance_amount > 0 AND status <> 'written_off'` (both facts are trustworthy at the DB level).
2. For each row, compute `display_status` via `computeReceivableDisplayStatus()`.
3. Accumulate:
   - `overdueCount` / `overdueAmount` — rows where `display_status === 'overdue'`.
   - `pendingCount` / `pendingAmount` — rows where `display_status === 'pending'`.
   - `totalOutstanding` — sum of `balance_amount` over both groups (`= overdueAmount + pendingAmount` by construction, never computed independently, per the request).

A row whose `display_status` resolves to `paid` (balance drifted to zero) or `written_off` is excluded from every KPI and from the table — it can never contribute a stale nonzero count.

### Receivables table

`services/finance.service.ts#listReceivables()` fetches the branch's open receivables (still RLS-scoped, still filterable by member/type), attaches `display_status` to every row the same way, and — for the default "all" view — keeps only rows whose `display_status` is `overdue` or `pending` (i.e., real Outstanding Dues). A `status` filter of `overdue` / `pending` / `paid` / `written_off` now filters on the **computed** status, so if the page ever grows filter tabs (per the request's "if filters already exist, make them dynamic" — none exist on this page today, so none were added), they will automatically use the same canonical logic with no new filtering code. Pagination is applied after the computed-status filter, since the stored `status` column can't be trusted to select the right rows at the DB layer.

The `Receivables` table on the page now renders `row.display_status` (Overdue / Pending / Paid / Written off) instead of the raw stored `row.status`, so what a staff member sees for a `partial`-stored row with a past due date is **Overdue**, and for a `partial`-stored row with a future due date is **Pending** — exactly the two test cases the request calls out as the correctness bar.

### Aging buckets

`getReceivableAging()` had the same "trust the stored status" issue (it filtered `status in ('pending','partial','overdue')`) and is fixed the same way: `balance_amount > 0 AND status <> 'written_off'`, independent of the stale status column. The day-bucket math itself (`0-30`/`31-60`/`61-90`/`90+`) was already date-driven and needed no change.

## 5. Date/time strategy

`getLocalDateKey(new Date(), "Asia/Kolkata")` (from the existing `lib/time.ts`, already used by `services/dashboard.service.ts` and `lib/member-expiry.ts`) is the "today" used for every comparison in this file — never the browser's local date, and computed fresh on every function call (no caching across requests). `"Asia/Kolkata"` is the project's existing hardcoded timezone convention (same string already used in `dashboard.service.ts` and 3–4 other places per the team's own prior biometric-pipeline audit); this task did not introduce a new convention or add a `branches.timezone`/`tenants.timezone` column, since that's flagged as a separate, larger follow-up in that existing audit and was out of scope here (no migration, minimal surface area).

## 6. Payment update behavior — verified

Because `balance_amount` is recomputed by the existing triggers on every payment, and `display_status` is recomputed from `balance_amount` + `due_date` on every page load, the full chain requires no new code:

```
payment recorded → payments_sync_receivable trigger (0005) updates
receivables.paid_amount / balance_amount → next Outstanding Dues page load
calls listReceivables()/getOutstandingReceivablesSummary() → fresh
computeReceivableDisplayStatus() → UI reflects the new balance and status
immediately, with no cache and no cron.
```

Confirmed with the `payment update walks a receivable from overdue through partial payments to paid` unit test (₹16,000 original → ₹6,000 due, overdue → +₹2,000 → ₹4,000 due, still overdue → +₹4,000 → ₹0 due, `paid`, drops out of Outstanding).

## 7. Real-time behavior — how "real-time" is achieved without websockets

- `services/finance.service.ts` uses `lib/supabase/server.ts#createClient()`, which calls `cookies()` from `next/headers` — this already opts the route into dynamic (uncached, per-request) Next.js rendering, the same convention every other page in this app relies on. No `export const dynamic` directive, no `revalidate` window, and no client-side cache was added or needed.
- Every KPI, table row and aging bucket is queried straight from `receivables` on each request — no denormalized/duplicated summary table was introduced.
- Status is derived at read time, so a `pending → overdue` transition happens automatically on the next page load once `due_date < today`, with no cron job, no scheduled task, and no manual data edit — exactly what the request's date-boundary example describes.
- A fully-paid receivable (`balance_amount` reaches 0) stops matching `balance_amount > 0` on the very next query and disappears from Outstanding Dues without any extra cleanup step.

No WebSocket/Realtime subscription was added — the existing architecture doesn't use one for this module, and a per-request dynamic query already satisfies every "real-time" requirement in the spec.

## 8. Tenant + branch isolation — preserved

No RLS policy, no auth check, and no branch-scoping logic was touched. `getOutstandingReceivablesSummary`/`listReceivables`/`getReceivableAging` still take the same optional `branchId` and still run through the SSR Supabase client, so tenant isolation continues to come from existing RLS policies on `receivables` (unchanged) exactly as it did before this task, and per-branch scoping continues to come from the same `.eq("branch_id", branchId)` pattern already in place. The Outstanding Dues page's own admin/branch-scoping call (`getCurrentProfile()` → `profile.branch_id`) is untouched.

## 9. Performance

No N+1 queries were introduced. `listReceivables()` and `getOutstandingReceivablesSummary()` each remain a single query against `receivables` (no per-row invoice/payment lookups) — the status computation is a pure, in-memory pass over the already-fetched rows, not an additional database round trip per row.

## 10. Files changed

| File | Change |
|---|---|
| `lib/finance/payment-balance.ts` | Added `ReceivableDisplayStatus` type and `computeReceivableDisplayStatus()` — the single canonical, date-aware status function. |
| `services/finance.service.ts` | `getOutstandingReceivablesSummary()`, `listReceivables()`, `getReceivableAging()` rewritten to stop trusting the stored `status` column for pending/overdue classification; `display_status` added to `listReceivables()`'s row type; canonical `"Asia/Kolkata"` "today" helper added. |
| `app/(admin)/admin/finance/outstanding/page.tsx` | Table renders `row.display_status` instead of the raw stored `row.status`; `STATUS_STYLES` updated to the 4 real display statuses; page size raised (30 → 500) with a "showing X of Y" note if ever truncated; comment documents why the page is already real-time. |
| `tests/payment-balance.test.mts` | Added unit tests for `computeReceivableDisplayStatus()` covering the request's test cases A–E plus written-off, no-due-date, due-today, and the exact "stale pending snapshot" regression this task fixes. |
| `docs/OUTSTANDING_DUES_REALTIME_IMPLEMENTATION.md` | This document. |

No migration file was added or modified. No table, trigger, or RLS policy was created, dropped, or altered. `supabase/migrations/0047_receivables_auto_create.sql` and `0005_finance_module.sql` are read-only references in this task, not edited.

## 11. Tests

`tests/payment-balance.test.mts`, run via the project's existing `npm test` (`node --experimental-strip-types --test tests/*.test.mts`):

| Case | Input | Expected | Result |
|---|---|---|---|
| A | Original 10,000 / Paid 5,000 / Balance 5,000 / due tomorrow | Pending | ✅ |
| B | Same, due yesterday, stored status still `partial` | Overdue | ✅ |
| C | Original 10,000 / Paid 0 / Balance 10,000 / due yesterday | Overdue | ✅ |
| D | Fully paid, any due date/stored status | Paid (excluded from Outstanding) | ✅ |
| E | Stored `overdue` snapshot, balance now 0 | Paid — balance is authoritative, not the stale status | ✅ |
| — | Stored `pending` with due_date in the past and **no new write event** | Overdue (the exact bug being fixed) | ✅ |
| — | Due date == today | Pending (not yet overdue) | ✅ |
| — | No due date | Pending, never overdue | ✅ |
| — | Stored `written_off`, balance > 0, due date in the past | written_off (manual state, never re-derived) | ✅ |
| — | Payment walk: 16,000 → 6,000 → 4,000 → 0 due, due date in the past throughout | overdue → overdue → paid | ✅ |

All 15 tests in the file (5 pre-existing `calculatePaymentBalance` tests + 10 new `computeReceivableDisplayStatus` tests) pass:

```
$ node --experimental-strip-types --test tests/payment-balance.test.mts
# tests 15
# pass 15
# fail 0
```

## 12. Verification performed this session

- **Unit tests**: `tests/payment-balance.test.mts` — 15/15 pass (above).
- **TypeScript**: scoped `tsc --noEmit --strict` against every changed file and its full import closure (`lib/finance/payment-balance.ts`, `services/finance.service.ts`, `app/(admin)/admin/finance/outstanding/page.tsx`, using the project's real `tsconfig.json` compiler options and real `@supabase/ssr`, `@supabase/supabase-js`, `next`, `react` type packages) — **0 errors**.
- **Lint**: scoped `eslint` run against the same three files using the project's own `eslint.config.mjs` (`next/core-web-vitals`) — **0 errors, 0 warnings**.
- **Production build**: not run. This session has no shell access on the machine hosting the repository, so verification ran in an isolated environment against a minimal, hand-picked subset of the real dependency tree (sufficient for a full, strict typecheck + lint of every changed file, but not a full `next build`, which needs the entire app tree and its full native-binary dependency set). **Please run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` locally** to confirm against the full project — the scoped checks above give high confidence but are not a substitute for the real build.
- **Live data validation (section 16 of the request)**: this session has no database credentials/access, so the "Pending: 32 / ₹1,94,700, Overdue: 0 / ₹0" figures could not be re-queried directly. The root-cause analysis above explains precisely why they were wrong (stale write-time status snapshot), and the fix is structural — any receivable whose `due_date` has already passed will show as Overdue on the very next page load, regardless of what its stored `status` says. **Please reload `/admin/finance/outstanding` after deploying this change and confirm the Overdue tile is no longer stuck at 0** if any receivable has a past due date (the request notes `due_date = 2026-09-06` rows should now count, since today is 2026-09-18).

## 13. Data safety — confirmed

- **No migration** was created or modified.
- **No destructive SQL** was written or run.
- **No `DELETE`** of any kind.
- **No bulk status update** — `receivables.status` in the database is untouched by this task; only how the app *reads* it changed.
- **No historical payment record was rewritten.**
- **No payment amount was changed.**
- **No due date was changed.**
- **No existing member data was changed.**
- **No Talwalkar data was touched.**
- **No Demo Gym data was touched.**
- **No plan/entitlement data was touched.**
- Tenant and branch RLS/authorization were not modified — this was strictly a query/service/UI change.
