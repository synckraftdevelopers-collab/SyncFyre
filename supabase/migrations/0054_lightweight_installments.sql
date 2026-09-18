-- 0054_lightweight_installments.sql
--
-- Feature: Advanced Membership Operations — "installments/partial-payment
-- continuation" (part of the Growth-tier CRM/Advanced Membership feature
-- set).
--
-- Product decision (confirmed with the user): the lightweight version.
-- An invoice can be flagged as an installment plan with a single
-- next-due-date and whatever balance remains — there is no separate
-- installment-schedule table, no fixed number of installments, and no
-- per-installment amount. Membership stays active regardless (subscription
-- lifecycle already doesn't depend on invoice payment status), and the
-- point of this feature is purely to stop a partially-paid invoice from
-- being flagged as fully "overdue" the moment its original due date
-- passes, as long as staff have set a later next-due-date for the
-- remaining balance and that date hasn't itself passed yet.
--
-- What already existed before this migration:
--   - A member/plan sale can already take a partial payment
--     (sellMembershipPlanToMember's paymentAmount can be less than the
--     invoice total) — invoices.amount_paid < invoices.total_amount is a
--     normal, already-supported state.
--   - receivables auto-syncs from invoices (0047) and Outstanding Dues
--     (services/finance.service.ts, app/(admin)/admin/finance/outstanding)
--     already shows every invoice with a balance, computing a fresh
--     "overdue"/"pending" display_status from due_date vs today
--     (lib/finance/payment-balance.ts#computeReceivableDisplayStatus).
--   - There was, however, no way for staff to collect a later, additional
--     payment against an already-created invoice, and no way to say "this
--     one's balance is expected later, not overdue right now." Both gaps
--     are what this migration (plus the accompanying app-code change)
--     closes.
--
-- What this migration does:
--   1. Adds is_installment / next_installment_due_date to `invoices`.
--   2. Mirrors both columns onto `receivables` (same pattern as every
--      other invoice-derived receivable field) so the Outstanding Dues
--      read path never has to join back to invoices.
--   3. Extends sync_receivable_from_invoice() (0047) to copy the two new
--      columns across, and extends the trigger's watched-column list so
--      that marking an invoice as an installment plan (without any
--      payment change) still re-syncs its receivable row immediately.
--
-- Deliberately NOT done here — consistent with "lightweight":
--   - No schedule table, no per-installment amounts, no automatic
--     reminder cadence tied to the installment date (the existing
--     due-date-based reminder system is untouched).
--   - No DB constraint tying next_installment_due_date to is_installment;
--     the app is the single writer of both (see the accompanying
--     services/finance.service.ts change) and always sets/clears them
--     together, so a DB-level constraint would only add risk without
--     adding real safety.
--   - computeReceivableDisplayStatus() itself is a pure TypeScript
--     function (lib/finance/payment-balance.ts) with no DB equivalent —
--     this migration only adds the columns it needs; the display-status
--     logic change ships as an app-code change alongside this migration.

alter table public.invoices
  add column if not exists is_installment boolean not null default false,
  add column if not exists next_installment_due_date date;

alter table public.receivables
  add column if not exists is_installment boolean not null default false,
  add column if not exists next_installment_due_date date;

create or replace function public.sync_receivable_from_invoice()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_balance numeric(12,2);
  v_status  text;
  v_type    text;
begin
  -- Voided invoices carry no outstanding balance; drop any open
  -- receivable that was created for them.
  if new.status = 'void' then
    delete from public.receivables
    where invoice_id = new.id
      and status in ('pending', 'partial', 'overdue');
    return new;
  end if;

  v_balance := greatest(new.total_amount - new.amount_paid, 0);

  -- Fully paid at creation (or a zero-value invoice) — nothing owed.
  -- Clean up a stale open receivable if one exists.
  if v_balance <= 0 then
    delete from public.receivables
    where invoice_id = new.id
      and status in ('pending', 'partial', 'overdue');
    return new;
  end if;

  v_status := case
    when new.amount_paid > 0 then 'partial'
    when new.due_date is not null and new.due_date < current_date then 'overdue'
    else 'pending'
  end;

  v_type := case when new.subscription_id is not null then 'membership' else 'other' end;

  insert into public.receivables (
    branch_id, member_id, invoice_id, subscription_id, tenant_id,
    receivable_type, original_amount, paid_amount, balance_amount,
    due_date, status, is_installment, next_installment_due_date, created_by
  )
  values (
    new.branch_id, new.member_id, new.id, new.subscription_id, new.tenant_id,
    v_type, new.total_amount, new.amount_paid, v_balance,
    new.due_date, v_status, new.is_installment, new.next_installment_due_date, new.created_by
  )
  on conflict (invoice_id) where invoice_id is not null
  do update set
    branch_id                 = excluded.branch_id,
    member_id                 = excluded.member_id,
    subscription_id           = excluded.subscription_id,
    tenant_id                 = excluded.tenant_id,
    original_amount           = excluded.original_amount,
    paid_amount                = excluded.paid_amount,
    balance_amount             = excluded.balance_amount,
    due_date                   = excluded.due_date,
    is_installment              = excluded.is_installment,
    next_installment_due_date   = excluded.next_installment_due_date,
    -- Never resurrect a receivable someone has explicitly written off.
    status          = case
                         when public.receivables.status = 'written_off' then public.receivables.status
                         else excluded.status
                       end,
    updated_at      = now();

  return new;
end;
$$;

drop trigger if exists invoices_sync_receivable on public.invoices;
create trigger invoices_sync_receivable
after insert or update of total_amount, amount_paid, status, due_date, subscription_id, is_installment, next_installment_due_date
on public.invoices
for each row execute function public.sync_receivable_from_invoice();

comment on column public.invoices.is_installment is
  'Lightweight installment flag: when true, next_installment_due_date (not due_date) is the date the remaining balance is next expected. Set/cleared together by the app (services/finance.service.ts); no DB constraint enforces the pairing.';
comment on column public.invoices.next_installment_due_date is
  'Next expected payment date for an installment invoice''s remaining balance. Only meaningful when is_installment is true. See lib/finance/payment-balance.ts#computeReceivableDisplayStatus for how this overrides due_date in the Outstanding Dues overdue/pending computation.';
