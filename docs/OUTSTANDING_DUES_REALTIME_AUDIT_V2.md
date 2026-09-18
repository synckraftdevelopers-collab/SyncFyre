# Outstanding Dues / Receivables — Root-Cause Audit V2

**Status of this document: READ-ONLY AUDIT. No code, schema, data, or migration was changed while producing this report.**

Date: 2026-09-18
Scope: `Finance → Outstanding Dues` (`/admin/finance/outstanding`) and everything that feeds it.

---

## 0. Summary (read this first)

The Outstanding Dues **page and service code are already correctly dynamic** — this was verified and implemented in a prior pass (see `docs/OUTSTANDING_DUES_REALTIME_IMPLEMENTATION.md`). Every KPI and table row is computed fresh, on every request, from `balance_amount` and `due_date` read straight from the `receivables` table, using `computeReceivableDisplayStatus()`. There is no caching, no hardcoded status, and no stale snapshot in that code path.

**The symptom you're seeing (one shared due date, Pending = 0) is real, but it is not a bug in the Outstanding Dues page itself.** It is a data-correctness bug one layer upstream, in how `due_date` gets **written** onto invoices at creation time. One specific invoice-creation code path — the **Excel bulk member importer** (`app/actions/member-excel-import-actions.ts`) — still sets `due_date` to the **subscription's end date** instead of a real payment-due date. This is the exact bug class that migration `0048_fix_invoice_due_dates.sql` already fixed for two *other* invoice-creation paths, but that migration never touched the importer. Every member brought in through "Import Members" therefore gets an invoice (and, via the `0047` trigger, a receivable) whose `due_date` is whatever their **membership end date** was in the imported spreadsheet — and when many imported members share the same plan/end date, they collapse onto one shared "due date" on the Outstanding Dues page, exactly as you're seeing.

A second, independent finding surfaced while checking tenant/branch isolation (section 10): the **read** RLS policy on `receivables` (and 8 sibling finance tables) was never updated for tenant scoping the way `members`/`invoices`/`payments` writes were in migration `0040`. Any user with role `admin` — in *any* tenant — can currently `SELECT` **every tenant's** receivables/income/expenses/payments-adjacent rows. This is unrelated to the due-date symptom but is a real cross-tenant leak and is reported here per your instruction to verify isolation.

**Final status for the reported symptom: READY FOR SURGICAL FIX** (see §12). The RLS finding is a separate, pre-existing issue — flagged in §10/§13, not scored into this verdict, and not touched by this audit.

---

## 1. Current data flow (traced end-to-end)

```
app/(admin)/admin/finance/outstanding/page.tsx   (Server Component, no client state)
   │
   ├─ getCurrentProfile()                         lib/auth.ts
   │
   ├─ listReceivables({ branchId, page: 1, pageSize: 500 })      ─┐
   └─ getOutstandingReceivablesSummary(branchId)                  │  services/finance.service.ts
                                                                   │
                                          both call createClient() from lib/supabase/server.ts
                                          (reads cookies() → Next.js opts the route into
                                           dynamic/uncached rendering automatically)
                                                                   │
                                          both SELECT directly from the `receivables` table
                                          (Postgres table, RLS-protected, branch_id-filtered
                                           in the query, tenant_id enforced — see §10)
                                                                   │
   `receivables` rows are kept in sync by two DB triggers (never by application code updates):
       • sync_receivable_from_invoice()   — supabase/migrations/0047_receivables_auto_create.sql
         fires on INSERT/UPDATE of public.invoices
       • sync_receivable_on_payment()     — supabase/migrations/0005_finance_module.sql
         fires on INSERT/UPDATE of public.payments (status → 'completed')
                                                                   │
   Both `display_status` (per row) and every KPI are computed fresh in application code by:
       computeReceivableDisplayStatus(balance, due_date, stored_status, todayKey)
       lib/finance/payment-balance.ts
                                                                   │
   `invoices.due_date` itself is set once, at invoice-creation time, by whichever of these
   four code paths created the invoice:
       • app/actions/member-actions.ts            → createMemberAction, generateMemberInvoiceAction
       • app/actions/reception-membership-actions.ts
       • services/membership-plan.service.ts       → sellMembershipPlanToMember
       • app/actions/member-excel-import-actions.ts → bulk Excel import        ← THE BUG
```

---

## 2–5. Where each field comes from

| Field | Source | File / function |
|---|---|---|
| **Member / Member ID** | `receivables.member_id`, joined to `members.full_name` / `member_code` | `services/finance.service.ts#listReceivables` (`.select("*, members(full_name,member_code,phone)")`) |
| **Receivable Type** | `receivables.receivable_type` (`'membership'` / `'pt'` / `'merchandise'` / `'other'`), set at insert time by the trigger from whether the invoice has a `subscription_id` | `sync_receivable_from_invoice()`, `0047_receivables_auto_create.sql` |
| **Original Amount** | `receivables.original_amount`, mirrored 1:1 from `invoices.total_amount` on every invoice insert/update | same trigger |
| **Actual Paid Amount** | `receivables.paid_amount`. Two independent write paths keep it current: (a) mirrored from `invoices.amount_paid` whenever the invoice row changes, and (b) incremented directly, `paid_amount = paid_amount + (payment.amount - refund_amount)`, every time a `payments` row transitions to `status = 'completed'` | `sync_receivable_from_invoice()` (0047) **and** `sync_receivable_on_payment()` (0005, lines 693–714) |
| **Actual Balance** | `receivables.balance_amount = GREATEST(original_amount − paid_amount, 0)`, recomputed by both triggers above on every write — never computed in the UI, never stale relative to `paid_amount` | same two triggers |
| **Actual Due Date** | `receivables.due_date`, mirrored 1:1 from `invoices.due_date` at insert time. `invoices.due_date` is set **once**, by application code, at the moment the invoice is created — **this is the field with the bug** (§6) | `sync_receivable_from_invoice()` (mirror) + the 4 invoice-creation call sites (root cause) |
| **Dynamic Status** | Computed fresh on every read from `(balance_amount, due_date, stored status)` — never trusted from the stored `receivables.status` column except the literal `written_off` value, which is a deliberate manual action, not a date-derived state | `computeReceivableDisplayStatus()`, `lib/finance/payment-balance.ts` |
| **Pending KPI** | `SUM`/`COUNT` over rows where `computeReceivableDisplayStatus(...) === "pending"`, computed in JS after fetching `status, balance_amount, due_date` for every open (`balance_amount > 0 AND status <> 'written_off'`) row | `getOutstandingReceivablesSummary()`, `services/finance.service.ts:67-125` |
| **Overdue KPI** | Same reduce, `=== "overdue"` branch | same function |
| **Total Outstanding** | `summary.totalOutstanding += balance` for **every** open row regardless of pending/overdue — so by construction `Total Outstanding = Overdue Amount + Pending Amount` always holds; it is never computed independently | same function, line 106 |

None of this is hardcoded. Every value above is read from the live table on every request. This part of the system already matches everything requested in your "CORE REQUIREMENT" section.

---

## 6. CRITICAL — why every visible row shows the same due date (2026-09-06)

This is the actual bug. Root cause, in order of discovery:

**a) The concept "invoice due date" already exists and is already correctly per-record** — it is not one global date, not a fallback, not a stale view field, and not an incorrect join. `invoices.due_date` and `receivables.due_date` are ordinary per-row `date` columns (`supabase/migrations/0005_finance_module.sql:350`). Nothing in the query layer collapses distinct dates into one; `listReceivables`/`getOutstandingReceivablesSummary` `SELECT` the column as-is, per row.

**b) The data model's intended definition of "due date" is: the date the member's membership/payment obligation begins** — i.e. `invoice.due_date = subscription.start_date`. This was a deliberate decision, made and documented in `supabase/migrations/0048_fix_invoice_due_dates.sql`, after an *earlier* version of this exact bug was found: invoices were originally being stamped with `due_date = subscription.end_date` (the date the *membership expires*, not when payment is owed). Members on the same plan naturally share the same `end_date` relative to their own start, so that bug made unrelated members' invoices cluster onto one date. `0048` fixed it in application code for two call sites and retroactively backfilled existing bad rows.

**c) That fix was incomplete.** Grepping every place `due_date` is written when an invoice is created:

| Invoice-creation path | `due_date` set to | Fixed by 0048? |
|---|---|---|
| `app/actions/member-actions.ts` → `createMemberAction` (member registration wizard) | `startDate` (line 452) | ✅ yes |
| `app/actions/member-actions.ts` → `generateMemberInvoiceAction` | `subscription.start_date` (line 606, 627) | ✅ yes |
| `app/actions/reception-membership-actions.ts` (reception-side plan sale) | `startDate` (line 165) | ✅ yes |
| `services/membership-plan.service.ts` → `sellMembershipPlanToMember` (used by `Add Plan` on a member's profile) | `input.startDate` (line 226) | ✅ yes |
| **`app/actions/member-excel-import-actions.ts` (bulk Excel member import)** | **`candidate.membershipEndDate`** (line 268) | **❌ no — still the pre-0048 pattern** |

`0048`'s own commit comment says explicitly it touched "two invoice-creation code paths in `app/actions/member-actions.ts`." The Excel importer is a fifth, separate code path and was never edited — its file's last-modified timestamp on disk predates `0048` entirely, confirming it wasn't part of that fix.

**d) Why this produces one shared date today:** every member you listed (zaid khan, koyana, dr vinay, vidya lahe, ali, …) was, in all likelihood, brought into the system via the Excel/bulk importer rather than the individual "Add Member" flow. Anyone imported that way gets `invoices.due_date = <their row's membershipEndDate from the spreadsheet>`. If a batch of imported members share the same plan and were recorded with the same (or a defaulted/filled-down) end date in the source spreadsheet, their invoices — and therefore their receivables — all inherit that one date. `0048`'s one-time SQL backfill only corrected rows that existed *at the moment it ran*; it does not, and cannot, prevent the still-buggy importer from producing the same problem for every import run after that migration, which is consistent with this being visible right now.

**e) It is not a join or aggregation bug**, and it is not the `member_register_view`/subscription `end_date` being misread by the finance code — `finance.service.ts` never reads subscription dates at all for this page. The bad value is baked into `invoices.due_date` (and mirrored into `receivables.due_date`) at write time, by one specific action file.

---

## 7. CRITICAL — why Pending currently shows 0

Given the due-date semantics above (`due_date = subscription/membership start date` for 4 of 5 paths, `= end date` for the buggy 5th path), an invoice's `due_date` at creation time is essentially always **today or earlier** — nothing in the current codebase ever creates an invoice with a genuinely future `due_date`, whether the bug is present or not:

- The 4 correct paths set `due_date = start_date`, and a new sale's start date is realistically today or in the past (a backdated sale) — never future.
- The 1 buggy path sets `due_date = membership end date`, which for anyone whose membership has already lapsed (like the 32 examples) is, by definition, in the past.

So `pending` (`balance > 0 AND due_date >= today`) being `0` is very plausibly **not a bug in the classification logic** — it may be an accurate reflection that **no currently-open receivable in the database happens to have a `due_date` on or after today**, because nothing in the app currently produces a forward-dated due date. This needs to be confirmed against live data (§8) rather than assumed, per your instructions.

One nuance worth flagging on its own: because `due_date = start_date` for the correct paths, "pending" in this data model effectively means *"sold today or very recently, not yet paid in full, hasn't crossed its own start date into being late yet."* Since `due_date < today` uses a strict `<`, a receivable whose start date is literally today shows as `pending`, not `overdue`, until tomorrow. That is consistent with the computeReceivableDisplayStatus spec you gave in §7 of your instructions.

---

## 8. Whether pending records actually exist — **could not be verified against live data from this environment**

I attempted to run the read-only diagnostic query set below directly against the project's Supabase instance (using the anon/service keys already present in the repo's own `.env.local`, the same credentials the app itself uses) to give you real counts instead of inference. The cloud sandbox this session runs in refused the connection at the network layer:

```
ERROR: Host not in allowlist: siycjpmsujcxkvdsfcvq.supabase.co.
Add this host to your network egress settings to allow access.
```

There is also no shell access on your linked device from this session (only file read/write), so I could not run it there either. **I have not fabricated numbers to fill this gap.** Instead, here is the exact script — please run it yourself with `node scripts/dues-audit.mjs` (or paste it into a scratch file and run with `node`) from a machine that already has network access to Supabase (i.e. your own dev machine, where `npm run dev` already works):

```js
// dues-audit.mjs — READ-ONLY. Performs SELECT queries only. No writes.
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // read-only usage for this diagnostic only
);
const TODAY = new Date().toISOString().slice(0, 10); // use your Asia/Kolkata date

function roundMoney(v) { return Math.round((Math.max(0, v) + Number.EPSILON) * 100) / 100; }
function computeStatus(balance, dueDate, status, today) {
  if (status === 'written_off') return 'written_off';
  if (roundMoney(balance) <= 0) return 'paid';
  if (dueDate && dueDate < today) return 'overdue';
  return 'pending';
}

const { data: rows } = await supabase
  .from('receivables')
  .select('id, member_id, branch_id, tenant_id, invoice_id, subscription_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status');

const open = rows.filter(r => Number(r.balance_amount) > 0 && r.status !== 'written_off');
console.log('Total receivables:', rows.length);
console.log('Open (outstanding) receivables:', open.length);
console.log('Distinct due_date values (open only):', [...new Set(open.map(r => r.due_date))].sort());

let overdueCount = 0, overdueAmt = 0, pendingCount = 0, pendingAmt = 0;
for (const r of open) {
  const s = computeStatus(Number(r.balance_amount), r.due_date, r.status, TODAY);
  if (s === 'overdue') { overdueCount++; overdueAmt += Number(r.balance_amount); }
  if (s === 'pending')  { pendingCount++;  pendingAmt  += Number(r.balance_amount); }
}
console.log({ overdueCount, overdueAmt, pendingCount, pendingAmt, totalOutstanding: overdueAmt + pendingAmt });

// Any receivable anywhere (even non-open) with a future/today due_date at all?
console.log('Rows with due_date >= today, any status:',
  rows.filter(r => r.due_date && r.due_date >= TODAY).length);
```

What to look at in the output:
- If `Distinct due_date values (open only)` is a single value, that confirms §6's explanation is the full story.
- If `Rows with due_date >= today` is `0` across the *whole* table (not just open rows), that confirms §7 — there genuinely are no forward-dated receivables yet, and Pending = 0 is a correct reflection of current data, not a bug. If it's non-zero, there's a second, separate bug filtering them out, and I'd need to see that output to trace it further.

I'm flagging this gap explicitly rather than guessing, per your instruction not to invent data.

---

## 9. Real payment data / partial-payment aggregation

Traced `sync_receivable_on_payment()` (`supabase/migrations/0005_finance_module.sql:693-714`):

```sql
update public.receivables
set paid_amount = paid_amount + (new.amount - new.refund_amount),
    balance_amount = greatest(original_amount - (paid_amount + (new.amount - new.refund_amount)), 0),
    ...
where invoice_id = new.invoice_id
  and status in ('pending','partial','overdue');
```

This fires `after insert or update of status on public.payments`, and only applies its effect when `new.status = 'completed'`. For your example (₹16,000 original, three payments of ₹5,000 / ₹3,000 / ₹2,000 as separate rows each inserted with `status = 'completed'`), this correctly accumulates: `0 → 5,000 → 8,000 → 10,000`, giving `paid_amount = 10,000`, `balance_amount = 6,000` — matching your expected result exactly, because each payment is a distinct row and the trigger adds rather than overwrites.

**One related, secondary risk worth flagging (not the reported bug, but relevant to "check whether partial payments are correctly aggregated"):** the trigger fires on `UPDATE OF status` and only checks `new.status = 'completed'` — it does **not** check `old.status <> 'completed'` the way the sibling `auto_income_from_payment()` trigger does (0005, line 629: `old.status <> 'completed' and new.status = 'completed'`). If any application code ever re-saves an already-`completed` payment row in a way that re-includes `status` in the `UPDATE SET` list (even setting it to the same value — e.g. a future "edit payment" feature), this trigger would fire again and **double-count** that payment into `paid_amount`. I did not find any current code path that does this (no payment-edit action exists yet in the files reviewed), so this is not presently causing a bug — it's a latent gap worth a defensive fix (`and old.status is distinct from 'completed'`) whenever a payment-edit feature is built, not something to act on now.

---

## 10. Tenant + branch isolation

**Query-level scoping (application code):** correct. `listReceivables` and `getOutstandingReceivablesSummary` both apply `.eq("branch_id", branchId)` when the signed-in user has a `branch_id` (`services/finance.service.ts:87, 933`), and `branchId` comes from `getCurrentProfile()`, i.e. the authenticated user's own profile — never user input.

**RLS — CRITICAL FINDING, unrelated to the due-date bug but directly relevant to your isolation check:**

`receivables` (created in `0005_finance_module.sql`) has its `SELECT` policy defined by a loop over 12 finance tables (`0005_finance_module.sql:449-474`):

```sql
create policy %I_staff_read on public.%I
for select to authenticated
using (public.app_role() = 'admin' or branch_id = public.current_branch_id())
```

`app_role()` (`0009_multi_tenancy.sql:193-205`) returns the **current user's own role slug** — it is *not* a SaaS-super-admin check (that's the separate `is_super_admin()` function, gated on role slug `'super_admin'`). Every tenant's own gym-admin has role slug `'admin'`. Because the policy is `admin OR branch_id = ...`, **any tenant's `admin` user satisfies the policy unconditionally, with no `tenant_id` check at all** — meaning an admin at one gym can currently read every other tenant's `receivables`, `income`, `expenses`, `bank_accounts`, `bank_transactions`, `cash_book`, `journal_entries`, `gst_transactions`, and `fin_attachments` rows (the full table list that loop covers).

I confirmed this wasn't fixed later: `0009_multi_tenancy.sql` (the migration that introduced `tenant_id` and `current_tenant_id()`) explicitly only updated RLS **on `members`** (§7 of that file) to add tenant scoping — it left the finance-table loop from `0005` untouched. `0040_member_financial_write_rls.sql` later added proper `tenant_id = current_tenant_id()` scoping, but only for `members`/`invoices`/`payments` **write** policies (insert/update/delete) — it does not touch `receivables` at all, and doesn't touch any `SELECT` policy. `0042`, `0044` (despite its name, "machine_rls_tenant_scope," it's about biometric machines, not finance) and every other later migration I found also don't touch it.

**This means the specific symptom you're seeing (one shared date across many members) could theoretically also be partly a cross-tenant display issue** if this account's `admin` session is somehow pulling in rows from more than one tenant — worth checking in the live diagnostic output (`tenant_id` distinct-value column) I couldn't run from here. Given the branch-scoped `.eq("branch_id", branchId)` filter in the query itself, this is unlikely to be the primary explanation (branch scoping is applied in-code regardless of what RLS additionally allows), but it should be ruled out with real data, and it is a real gap independent of that.

I have **not** written or proposed a fix for this RLS gap here — flagging it only, per "read-only" and per your explicit ask to verify isolation and report leakage.

---

## 11. Exact files/functions responsible (consolidated)

| Responsibility | File | Symbol |
|---|---|---|
| Outstanding Dues page (UI) | `app/(admin)/admin/finance/outstanding/page.tsx` | `OutstandingPage` |
| List + paginate receivables, compute display_status per row | `services/finance.service.ts` | `listReceivables` (~line 923) |
| Compute all 3 KPI cards | `services/finance.service.ts` | `getOutstandingReceivablesSummary` (~line 67) |
| Canonical date-aware status function | `lib/finance/payment-balance.ts` | `computeReceivableDisplayStatus` |
| Mirror invoice → receivable (original/paid/balance/due_date/type) | `supabase/migrations/0047_receivables_auto_create.sql` | `sync_receivable_from_invoice()` trigger on `invoices` |
| Accumulate payments → receivable.paid_amount/balance | `supabase/migrations/0005_finance_module.sql` (lines 693-714) | `sync_receivable_on_payment()` trigger on `payments` |
| **Root cause — wrong due_date at source** | `app/actions/member-excel-import-actions.ts` | line 268, `due_date: candidate.membershipEndDate` inside the bulk-import invoice payload |
| Prior (already-fixed) instances of the same bug class | `app/actions/member-actions.ts`, `app/actions/reception-membership-actions.ts`, `services/membership-plan.service.ts` | fixed by `0048_fix_invoice_due_dates.sql` |
| RLS read-policy gap (secondary finding) | `supabase/migrations/0005_finance_module.sql` (lines 449-474) | `%_staff_read` policy loop, never updated for `tenant_id` |

---

## 12. Recommended minimal implementation (for your approval — nothing implemented yet)

Purely surgical, mirrors exactly what `0048` already did for the other two paths:

1. **Application code (1 line):** in `app/actions/member-excel-import-actions.ts`, change
   `due_date: candidate.membershipEndDate` → `due_date: candidate.membershipStartDate`
   (falling back to today if absent, matching the pattern already used in `member-actions.ts`/`membership-plan.service.ts`), so every *future* import stops producing this bug.

2. **One-time backfill migration** (new file, e.g. `0052_fix_excel_import_due_dates.sql`), same shape as `0048`: `UPDATE invoices SET due_date = subscription.start_date WHERE due_date = subscription.end_date AND start_date <> end_date`, scoped only to invoices created by this path if distinguishable, or safely re-running `0048`'s exact same condition (idempotent — it only touches rows still in the bad state; rows `0048` already fixed won't match again). This corrects the 32 (and any other) already-imported members' due dates without touching subscription status, plan, or any other field.

3. Nothing in `finance.service.ts`, `payment-balance.ts`, the `receivables` schema, or the KPI logic needs to change — that layer is already correct and dynamic.

4. **Not included in this fix, tracked separately per your "do not implement yet" instruction:** the RLS read-policy gap in §10. Recommend a follow-up migration adding `tenant_id = current_tenant_id()` to the `admin` branch of the finance-table read policies, matching the pattern `0040` already established for writes.

No migration is required to change the *meaning* of `due_date` — the data model already has a clear, working definition (`= subscription/payment start date`) that 4 of 5 code paths already honor correctly.

## 13. Is a schema change required?

**No.** `receivables.due_date` and `invoices.due_date` already exist, are already per-row, and the intended semantics are already established and working in 4 of 5 code paths. This is an application-code bug in one file plus a small, targeted data backfill — not a data model gap and not an architectural problem.

---

## FINAL STATUS: READY FOR SURGICAL FIX

(Secondary, independent finding — RLS tenant-isolation gap on `receivables` and 8 sibling finance tables' read policies — is real and reported in §10, but is architecturally separate from the due-date symptom you reported and is not scored into this verdict. Recommend tracking it as its own follow-up.)

---

## Safety confirmation

This audit was strictly read-only:
- No database write, update, insert, or delete was executed.
- No schema or migration was created or applied.
- No subscription, member, payment, or invoice record was modified.
- No Talwalkar, Demo Gym, or any other tenant's data was changed.
- No plan or entitlement logic was changed.
- The only network call attempted against the live database was a `SELECT`, which the sandbox's network policy blocked before it could execute (§8) — no query reached the database from this session.
- This document (`docs/OUTSTANDING_DUES_REALTIME_AUDIT_V2.md`) is the only file created.
