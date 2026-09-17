-- 0047_receivables_auto_create.sql
--
-- Fixes the "Outstanding Dues" page always showing static/stale data.
--
-- Root cause: the `receivables` table (which powers
-- getOutstandingReceivablesSummary / getReceivableAging / listReceivables,
-- i.e. the entire Finance > Outstanding Dues page) was only ever UPDATED
-- by the payments_sync_receivable trigger from 0005_finance_module.sql.
-- No code path — application or database — ever INSERTed a row into
-- `receivables` when an invoice was created. So the update-only trigger
-- had nothing to update, and the Outstanding page could only ever show
-- whatever legacy rows happened to already exist (usually none), never
-- reflecting new invoices or day-to-day activity.
--
-- This migration:
--   1. Adds a unique index on receivables.invoice_id so each invoice maps
--      to exactly one receivable row (the existing update-only trigger
--      already assumed this; this makes it explicit and enables upsert).
--   2. Adds a trigger on `invoices` that creates/updates the matching
--      receivable row whenever an invoice is inserted or its balance-
--      relevant columns change, mirroring the style of the existing
--      sync_receivable_on_payment() trigger.
--   3. Backfills receivable rows for existing invoices that already have
--      an outstanding balance but no matching receivable yet, so
--      historical unpaid invoices show up immediately, not just future
--      ones.

-- 1. One receivable per invoice.
create unique index if not exists receivables_invoice_id_key
  on public.receivables (invoice_id)
  where invoice_id is not null;

-- 2. Keep receivables in sync with invoices.
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
    due_date, status, created_by
  )
  values (
    new.branch_id, new.member_id, new.id, new.subscription_id, new.tenant_id,
    v_type, new.total_amount, new.amount_paid, v_balance,
    new.due_date, v_status, new.created_by
  )
  on conflict (invoice_id) where invoice_id is not null
  do update set
    branch_id       = excluded.branch_id,
    member_id       = excluded.member_id,
    subscription_id = excluded.subscription_id,
    tenant_id       = excluded.tenant_id,
    original_amount = excluded.original_amount,
    paid_amount     = excluded.paid_amount,
    balance_amount  = excluded.balance_amount,
    due_date        = excluded.due_date,
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
after insert or update of total_amount, amount_paid, status, due_date, subscription_id
on public.invoices
for each row execute function public.sync_receivable_from_invoice();

-- 3. Backfill: existing invoices with an outstanding balance that have no
--    matching receivable yet (almost certainly every unpaid invoice
--    created before this migration ran).
insert into public.receivables (
  branch_id, member_id, invoice_id, subscription_id, tenant_id,
  receivable_type, original_amount, paid_amount, balance_amount,
  due_date, status, created_by, created_at, updated_at
)
select
  i.branch_id, i.member_id, i.id, i.subscription_id, i.tenant_id,
  case when i.subscription_id is not null then 'membership' else 'other' end,
  i.total_amount, i.amount_paid, greatest(i.total_amount - i.amount_paid, 0),
  i.due_date,
  case
    when i.amount_paid > 0 then 'partial'
    when i.due_date is not null and i.due_date < current_date then 'overdue'
    else 'pending'
  end,
  i.created_by, i.created_at, now()
from public.invoices i
where i.status <> 'void'
  and (i.total_amount - i.amount_paid) > 0
  and not exists (
    select 1 from public.receivables r where r.invoice_id = i.id
  );
