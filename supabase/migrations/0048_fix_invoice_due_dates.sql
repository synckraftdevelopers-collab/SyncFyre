-- 0048_fix_invoice_due_dates.sql
--
-- Fixes: "only this date is visible, not all is showing" on the Outstanding
-- Dues page — every receivable row was showing the same Due Date.
--
-- Root cause: two invoice-creation code paths in
-- app/actions/member-actions.ts (createMemberAction, used by the member
-- registration wizard, and generateMemberInvoiceAction) were setting the
-- invoice's `due_date` (the date payment is owed) to the linked
-- subscription's `end_date` (the date the *membership* expires) instead of
-- a real payment due date. Members who registered on different days but
-- happen to share the same plan duration end up with identical
-- subscription end_dates, so their invoices — and, after 0047, their
-- receivables — all showed that same shared date as "due", making it look
-- like only one day's worth of dues existed. The application code for both
-- paths has been fixed to use the subscription's start_date (i.e. payment
-- due when the membership begins) instead.
--
-- This migration retroactively corrects existing invoices that were
-- created by the old buggy code — identified as: linked to a subscription,
-- and due_date currently equal to that subscription's end_date — resetting
-- due_date back to the subscription's start_date. Updating invoices.due_date
-- re-fires the invoices_sync_receivable trigger added in 0047, which
-- automatically carries the correction over to the matching receivables
-- row (and its aging bucket) without any further steps.

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
