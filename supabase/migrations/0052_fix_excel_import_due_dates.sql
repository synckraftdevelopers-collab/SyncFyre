-- 0052_fix_excel_import_due_dates.sql
--
-- Fixes: Outstanding Dues showing many/all receivables with the same due
-- date, and "Pending" staying at 0 even though it shouldn't necessarily be.
--
-- Root cause: the bulk member Excel importer (app/actions/member-excel-import-
-- actions.ts) was still setting invoices.due_date to the linked subscription's
-- end_date (membership expiry) instead of its start_date (the actual payment
-- due date) — the exact same bug that 0048_fix_invoice_due_dates.sql already
-- fixed for two other invoice-creation paths (createMemberAction,
-- generateMemberInvoiceAction) and for sellMembershipPlanToMember. 0048 never
-- touched the importer, so every member brought in through "Import Members"
-- — before OR after 0048 ran — kept getting their invoice's due_date stamped
-- with their membership's end date. Members imported on different real days
-- but sharing a plan/end date therefore collapsed onto one shared "due date"
-- on the Outstanding Dues page. See docs/OUTSTANDING_DUES_REALTIME_AUDIT_V2.md
-- and docs/OUTSTANDING_DUES_DUE_DATE_FIX.md for the full trace.
--
-- The application code for the importer has been fixed in the same change
-- that adds this migration (due_date: candidate.membershipStartDate instead
-- of candidate.membershipEndDate), so this migration only needs to backfill
-- rows already created by the old, buggy code.
--
-- This is the exact same corrective UPDATE as 0048 — intentionally, not a
-- new one — because the bug and the fix are identical in shape, just coming
-- from a fifth invoice-creation path 0048 didn't know about. It is safe to
-- run again: it is idempotent (a row 0048 already corrected no longer has
-- due_date = end_date, so it won't match here) and it only touches rows
-- that are still in the bad state. Updating invoices.due_date re-fires the
-- invoices_sync_receivable trigger from 0047_receivables_auto_create.sql,
-- which automatically carries the correction over to the matching
-- receivables row (and therefore the Outstanding Dues page) without any
-- further steps.
--
-- Scope / safety:
--   * No schema change, no new column, no new table.
--   * No subscription, plan, or member data is touched — only invoices.due_date.
--   * No status is bulk-changed; the invoices_sync_receivable trigger derives
--     the receivable's status the same way it always does.
--   * Rows are matched purely by (due_date = linked subscription's end_date),
--     independent of tenant/branch — exactly as 0048 did — so this applies
--     uniformly and correctly across every tenant/branch without needing to
--     special-case any customer's data.

update public.invoices i
set due_date = s.start_date,
    updated_at = now()
from public.subscriptions s
where i.subscription_id = s.id
  and i.due_date is not null
  and s.start_date is not null
  and s.end_date is not null
  and i.due_date = s.end_date
  and s.start_date <> s.end_date;
