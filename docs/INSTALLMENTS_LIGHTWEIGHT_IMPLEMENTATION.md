# Lightweight Installments / Partial-Payment Continuation

**Feature area:** Advanced Membership Operations (Growth+ plan tier)
**Status:** Implemented, scoped-typechecked, unit-tested. Migration validated against a real Postgres instance. Not yet applied to the live database.

## Why

The user's report was that "CRM & Sales" and "Advanced Membership Operations" — including *installments/partial-payment continuation* — don't show up for tenants on the Growth plan. Investigation (see `PLAN_TIER_SIDEBAR_LOCK_FIX.md` for the related sidebar bug, fixed earlier in this pass) found that for installments specifically there was nothing to gate in the first place: **the capability didn't exist anywhere in the codebase.** A partial payment could already be taken at the time a plan is sold (`sellMembershipPlanToMember`), but:

- There was no way to later collect a second, later payment against an invoice that already exists — once an invoice had `amount_paid < total_amount`, staff had no UI or action to add to it.
- Outstanding Dues always flagged such an invoice as "overdue" the instant its original `due_date` passed, even if the plan all along was that the remaining balance would come in later.

## Scope decision

Per the user's explicit choice ("Lightweight — Recommended"): mark an invoice as an installment plan with a **single next-due-date** and whatever balance remains. No separate schedule table, no fixed installment count, no per-installment amount breakdown. Membership/subscription lifecycle is untouched — it never depended on invoice payment status.

## What changed

### Database (`supabase/migrations/0054_lightweight_installments.sql`)

- `invoices` gains `is_installment boolean not null default false` and `next_installment_due_date date`.
- `receivables` gains the same two columns, mirrored from `invoices`.
- `sync_receivable_from_invoice()` (from migration `0047`) now copies both columns across on every insert/update, and the `invoices_sync_receivable` trigger now also fires on updates to `is_installment` / `next_installment_due_date` alone (so marking a plan without touching money still re-syncs immediately).
- No new constraint ties the two columns together — the app is the sole writer and always sets/clears them as a pair.

Validated locally against a real Postgres 16 instance with a schema mirroring `tenants`/`invoices`/`receivables`: insert → mark installment → full payment walks through exactly as designed, and the receivable row is correctly deleted once the balance reaches zero (existing `0047` behavior, unaffected).

### `lib/finance/payment-balance.ts`

`computeReceivableDisplayStatus()` takes a new, optional 5th argument: `{ isInstallment, nextInstallmentDueDate }`. When set, `next_installment_due_date` — not the invoice's original `due_date` — determines overdue vs. pending. This is the whole point of the feature: a partially-paid invoice whose original due date has passed reads as "pending, next due `<date>`" instead of "overdue", right up until that next date itself passes, at which point it correctly flips back to overdue. Fully backward compatible — every existing caller that omits the new argument behaves exactly as before (confirmed by the full existing test suite still passing, plus new tests covering the installment cases specifically — 21 tests total, `tests/payment-balance.test.mts`).

### `services/finance.service.ts`

- `listReceivables`, `getOutstandingReceivablesSummary`, and `getReceivableAging` all now read `is_installment`/`next_installment_due_date` and feed them into the effective-due-date calculation (the aging bucket table ages from the *next installment date* for an installment row, not the stale original due date — same rule, applied consistently).
- Two new functions:
  - **`setInvoiceInstallmentPlan(invoiceId, branchId?, nextInstallmentDueDate)`** — marks or clears the plan. No money moves. Throws if the invoice has no remaining balance.
  - **`recordReceivablePayment(...)`** — the missing capability: inserts a `payments` row and updates `invoices.amount_paid`/`status` for an invoice that already exists. The DB trigger then re-syncs `receivables` automatically. A payment that fully clears the balance always clears the installment flag, regardless of what the caller passed.

### `app/actions/installment-actions.ts` (new)

Two server actions, gated the same way as every other financial write in this app:

- Role-gated to `admin` / `manager` (any branch in the tenant) or `reception` (their own branch only) — mirrors `subscription-actions.ts` and the existing RLS policies from `0040_member_financial_write_rls.sql`.
- Feature-gated behind **`advanced_membership`** — this is the SaaS feature key that was already defined in `lib/entitlements/registry.ts` (phase_2 / Growth+) but had no consumer anywhere in the app until now. Essential-tier tenants get a clear "not included in the current plan" error if they somehow reach the action directly; the UI hides the controls from them entirely (see below).

### `components/finance/receivable-row-actions.tsx` (new) + `app/(admin)/admin/finance/outstanding/page.tsx`

The Outstanding Dues page — already the single place that lists every invoice with a balance — gained:

- A "Due Date" column that shows an **Installment** badge with "Next due `<date>`" instead of the raw due date, when a plan is set.
- A per-row "Manage" action (client component, same interaction pattern as the CRM lead-assignment UI built earlier this session) with two small forms: record a payment (amount, method, optional reference, optional next-installment date), and mark/update/clear the installment plan.
- The whole "Actions" column — and therefore the ability to use either form — only renders when the current tenant has the `advanced_membership` feature (Growth+). Essential-tier tenants see the same table they always have, unchanged.

## What was NOT changed

- No changes to `sellMembershipPlanToMember` or any of the 4-5 sale-entry surfaces (registration wizard, admin sale wizard, reception form, Add Plan panel). Marking an invoice as an installment is a deliberate follow-up action from Outstanding Dues, not something bundled into the sale flow — this kept the change to one surface instead of five.
- No changes to subscription/membership lifecycle — it was never coupled to invoice payment status and still isn't.
- No changes to the notification/reminder system (`generate_membership_reminders`, etc.) — installment due dates do not currently trigger their own reminders.
- No new RLS policies — the existing `invoices`/`payments` write policies from `0040_member_financial_write_rls.sql` already cover admin/manager/reception exactly as needed.

## Verification

- New migration applied cleanly against a real local Postgres 16 instance with a schema mirroring the real `tenants`/`invoices`/`receivables` tables; exercised the full lifecycle (insert with partial payment → mark installment → full payment → receivable row correctly removed).
- `lib/finance/payment-balance.ts` unit tests: 21/21 passing (`node --experimental-strip-types --test tests/payment-balance.test.mts`), including all 15 pre-existing cases (unaffected) and 6 new installment-specific cases.
- Scoped TypeScript check (0 errors) across every changed/new file and its real dependencies: `lib/finance/payment-balance.ts`, `services/finance.service.ts`, `types/index.ts`, `app/actions/installment-actions.ts`, `components/finance/receivable-row-actions.tsx`, `app/(admin)/admin/finance/outstanding/page.tsx`, plus `lib/auth.ts`, `lib/entitlements/{server,registry,evaluate}.ts`, `lib/supabase/{server,schema}.ts`, `lib/time.ts`, `lib/utils.ts`, `components/ui/card.tsx`.
- `npm run build` / `npm run lint` / a running Supabase instance were not available in this environment — not run.

## What you need to do

1. Apply migration `0054_lightweight_installments.sql` to the live database (after `0053`, the grace-period migration).
2. Confirm at least one Growth or Scale tenant to spot-check: open Outstanding Dues, find (or create, via a partial-payment sale) an invoice with a balance, use "Manage" → mark it as an installment with a future date, confirm it now reads "pending — next due `<date>`" instead of "overdue" if its original due date has already passed. Record a payment against it and confirm the balance, receivable row, and status all update correctly, and that a payment which fully clears the balance also clears the installment badge.
3. Confirm an Essential-tier tenant does **not** see the "Manage" column on the same page.
