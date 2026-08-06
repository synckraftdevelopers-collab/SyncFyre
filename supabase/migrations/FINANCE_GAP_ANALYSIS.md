# Finance Module — Schema Gap Analysis

**Compared:** Finance & Accounting Spec vs actual database schema  
**Date:** August 2026

---

## Tables already created (migration 0005)

| Spec requirement | Table in DB | Status |
|---|---|---|
| Income Module | `public.income` | ✅ exists |
| Income categories | `public.income_categories` | ✅ exists — seeded with 8 system categories |
| Expense Module | `public.expenses` | ✅ exists — full approval workflow |
| Expense categories | `public.expense_categories` | ✅ exists — seeded with 11 system categories |
| Vendors | `public.vendors` | ✅ exists — GSTIN, PAN, bank details |
| Chart of Accounts | `public.chart_of_accounts` | ✅ exists — hierarchical, system/custom |
| Journal Entries | `public.journal_entries` | ✅ exists — immutability guard trigger |
| Journal Lines | `public.journal_lines` | ✅ exists — double-entry debit/credit |
| General Ledger | `public.ledger` | ✅ exists — running balance per account |
| Cash Book | `public.cash_book` | ✅ exists — auto-balance trigger |
| Bank Accounts | `public.bank_accounts` | ✅ exists — current balance auto-updated |
| Bank Transactions | `public.bank_transactions` | ✅ exists — linked to income/expense/payment |
| GST Module | `public.gst_transactions` | ✅ exists — CGST/SGST/IGST, HSN/SAC |
| Outstanding / Receivables | `public.receivables` | ✅ exists — aging buckets via status field |
| Finance Attachments | `public.fin_attachments` | ✅ exists — PDF/image support |

Tables already in 0001 that the finance module reuses:

| Table | Used for |
|---|---|
| `public.invoices` | Membership invoices with GST, line items |
| `public.payments` | Payment collection — triggers auto-income + cash_book |
| `public.subscriptions` | Membership revenue source |
| `public.members` | Receivables linked to members |
| `public.branches` | Branch-scoped finance records |
| `public.users` | created_by / approved_by / collected_by |

---

## Tables missing — created in migration 0006

| Spec requirement | Table created | Notes |
|---|---|---|
| Collections — Payment Modes | `public.payment_modes` | Configurable per branch; 7 global defaults seeded (Cash, UPI, Card, Net Banking, Wallet, Cheque, Bank Transfer) |
| Finance settings / GST config | `public.finance_settings` | One row per branch; GSTIN, GST rates, fiscal year start month, invoice prefix, cash opening balance, Tally export mapping |
| Cash Management — Daily Closing | `public.cash_closing` | Per branch + shift; opening balance, cash in/out, bank deposit, physical count, computed variance |
| Budget vs Actual (roadmap) | `public.budget` | Monthly targets per income/expense category; enables Budget vs Actual dashboard card |
| Audit Logs (CA requirement) | `public.fin_audit_logs` | Immutable append-only; mutation guard triggers; auto-populated on journal post, expense approval, cash closing |

---

## Spec sections and their DB coverage

| Spec section | DB coverage | Gap |
|---|---|---|
| 1. Finance Dashboard KPIs | Computed from `income`, `expenses`, `payments`, `receivables`, `cash_book` | No gap — query-time aggregation |
| 2. Membership Revenue | `invoices` + `payments` + `subscriptions` | No gap |
| 3. Income Module | `income` + `income_categories` | No gap |
| 4. Expense Module | `expenses` + `expense_categories` + `vendors` + `fin_attachments` | No gap — approval workflow included |
| 5. Collections / Payment Modes | `payments` + `payment_modes` ← new | `payment_modes` added in 0006 |
| 6. Outstanding Management | `receivables` | No gap — status + reminder fields present |
| 7. Cash Management | `cash_book` + `cash_closing` ← new | `cash_closing` added in 0006 |
| 8. Bank Management | `bank_accounts` + `bank_transactions` | No gap |
| 9. Accounting (Double-entry) | `chart_of_accounts` + `journal_entries` + `journal_lines` + `ledger` | No gap |
| 10. GST Module | `gst_transactions` + `finance_settings` ← new | GSTIN config added in 0006 |
| 11. Reports | Views in `0002_report_views.sql`; finance queries via service layer | No new tables needed |
| Finance Settings | `finance_settings` ← new | Added in 0006 |
| Budget vs Actual | `budget` ← new | Added in 0006 |
| Audit Trail | `fin_audit_logs` ← new | Added in 0006 — immutable |

---

## Enums added in 0005 (already exist)

| Enum | Values |
|---|---|
| `fin_entry_type` | debit, credit |
| `fin_txn_status` | draft, pending, posted, voided, reversed |
| `account_type` | asset, liability, equity, income, expense |
| `expense_approval_status` | pending, approved, rejected, cancelled |
| `bank_txn_type` | deposit, withdrawal, transfer, adjustment |

---

## Triggers added across 0005 and 0006

| Trigger | Table | Purpose |
|---|---|---|
| `payments_auto_income` | `payments` | Auto-creates `income` record when payment is completed |
| `payments_sync_receivable` | `payments` | Updates `receivables` balance when payment is received |
| `set_cash_book_balance` | `cash_book` | Auto-calculates running cash balance |
| `set_bank_balance` | `bank_transactions` | Auto-updates `bank_accounts.current_balance` |
| `guard_posted_journal` | `journal_entries` | Prevents editing a posted journal entry |
| `prevent_fin_audit_mutation` | `fin_audit_logs` | Prevents UPDATE/DELETE on audit log (immutable) |
| `audit_journal_post_trigger` | `journal_entries` | Writes audit record when entry is posted |
| `audit_expense_approval_trigger` | `expenses` | Writes audit record on approval/rejection |
| `audit_cash_closing_trigger` | `cash_closing` | Writes audit record on close/reconcile |

---

## How to apply migration 0006

Run in Supabase SQL Editor:

```sql
\i supabase/migrations/0006_finance_missing_tables.sql
```

Or paste the file contents directly into the SQL Editor.

**Prerequisites:** Migrations 0001–0005 must already be applied.
