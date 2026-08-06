-- ================================================================
-- Migration: 0006_finance_missing_tables
-- Purpose  : Add the tables required by the Finance & Accounting
--            spec that were not created in 0005_finance_module:
--
--  1. payment_modes      — configurable payment channels per branch
--  2. finance_settings   — GST number, HSN/SAC defaults, fiscal year
--  3. cash_closing       — daily / shift cash closing records
--  4. budget             — monthly budget targets per category
--  5. fin_audit_logs     — immutable audit trail for finance mutations
--
-- Depends on: 0001 (branches, users, members, payments)
--             0005 (income_categories, expense_categories,
--                   income, expenses, bank_accounts,
--                   fin_txn_status, fin_entry_type)
-- ================================================================

begin;

-- ──────────────────────────────────────────────────────────────
-- 1. payment_modes
--    Configurable list of accepted payment channels per branch.
--    The existing payments.method uses the payment_method enum;
--    this table lets admins control which modes are active and
--    stores additional metadata (UPI IDs, terminal IDs, etc.)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.payment_modes (
  id              uuid primary key default gen_random_uuid(),
  branch_id       uuid references public.branches(id) on delete cascade,
  -- null branch_id = global default visible to all branches
  name            text not null,
  -- matches payment_method enum values where applicable
  code            text not null,
  -- e.g. 'cash', 'upi', 'card', 'net_banking', 'wallet', 'cheque'
  is_active       boolean not null default true,
  display_order   integer not null default 0,
  metadata        jsonb not null default '{}',
  -- e.g. {"upi_id":"gym@upi","terminal_id":"POS-001"}
  created_by      uuid references public.users(id) on delete set null,
  updated_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique nulls not distinct (branch_id, code)
);

comment on table public.payment_modes is
  'Configurable payment channels per branch. Controls which modes appear in collection screens.';

-- ──────────────────────────────────────────────────────────────
-- 2. finance_settings
--    Branch-level accounting configuration:
--    GST registration, HSN/SAC defaults, fiscal year, bank details
--    for invoices, cash opening balance, etc.
-- ──────────────────────────────────────────────────────────────
create table if not exists public.finance_settings (
  id                    uuid primary key default gen_random_uuid(),
  branch_id             uuid not null unique references public.branches(id) on delete cascade,

  -- GST
  gstin                 text,
  gst_registered        boolean not null default false,
  default_cgst_rate     numeric(5,2) not null default 9.00,
  default_sgst_rate     numeric(5,2) not null default 9.00,
  default_igst_rate     numeric(5,2) not null default 0.00,
  default_hsn_sac       text,

  -- Fiscal year
  fiscal_year_start_month integer not null default 4
    check (fiscal_year_start_month between 1 and 12),
  -- 4 = April (Indian FY default)

  -- Invoice / receipt customisation
  invoice_prefix        text not null default 'INV',
  receipt_prefix        text not null default 'RCP',
  invoice_footer_note   text,
  invoice_terms         text,

  -- Cash management
  cash_opening_balance  numeric(15,2) not null default 0,
  -- set once at the start; cash_book tracks running balance

  -- Bank details for invoice printing
  bank_account_id       uuid references public.bank_accounts(id) on delete set null,

  -- Tally / ERP export config (future use)
  tally_company_name    text,
  tally_group_mapping   jsonb not null default '{}',

  created_by            uuid references public.users(id) on delete set null,
  updated_by            uuid references public.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.finance_settings is
  'One row per branch. Stores GST config, fiscal year, invoice customisation, and ERP export settings.';

-- ──────────────────────────────────────────────────────────────
-- 3. cash_closing
--    Records the end-of-day or end-of-shift cash closing.
--    Captures opening balance, cash collected, cash spent,
--    bank deposits made, and the closing (physical) balance.
--    Supports variance detection between system and physical count.
-- ──────────────────────────────────────────────────────────────
create table if not exists public.cash_closing (
  id                    uuid primary key default gen_random_uuid(),
  branch_id             uuid not null references public.branches(id) on delete restrict,

  closing_date          date not null default current_date,
  shift                 text not null default 'day'
    check (shift in ('morning','afternoon','evening','night','day')),

  -- Balances
  opening_balance       numeric(15,2) not null default 0,
  -- = previous closing balance or cash_book opening

  total_cash_in         numeric(15,2) not null default 0,
  -- sum of cash income + cash payments received during shift

  total_cash_out        numeric(15,2) not null default 0,
  -- sum of cash expenses during shift

  bank_deposits         numeric(15,2) not null default 0,
  -- cash deposited to bank during shift

  system_closing_balance numeric(15,2) not null
    generated always as (opening_balance + total_cash_in - total_cash_out - bank_deposits) stored,
  -- computed: what the system expects

  physical_count        numeric(15,2),
  -- actual cash counted at closing

  variance             numeric(15,2)
    generated always as (
      case when physical_count is not null
        then physical_count - (opening_balance + total_cash_in - total_cash_out - bank_deposits)
        else null
      end
    ) stored,
  -- positive = cash excess; negative = cash shortage

  notes                 text,
  status                text not null default 'open'
    check (status in ('open','closed','reconciled','disputed')),

  closed_by             uuid references public.users(id) on delete set null,
  closed_at             timestamptz,
  approved_by           uuid references public.users(id) on delete set null,
  approved_at           timestamptz,

  created_by            uuid references public.users(id) on delete set null,
  updated_by            uuid references public.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (branch_id, closing_date, shift)
);

comment on table public.cash_closing is
  'Daily / shift cash closing. Captures opening balance, collections, expenses, bank deposits, and physical cash count for variance analysis.';

-- ──────────────────────────────────────────────────────────────
-- 4. budget
--    Monthly budget targets per expense/income category.
--    Enables Budget vs Actual reports on the finance dashboard.
-- ──────────────────────────────────────────────────────────────
create table if not exists public.budget (
  id              uuid primary key default gen_random_uuid(),
  branch_id       uuid not null references public.branches(id) on delete cascade,

  budget_year     integer not null check (budget_year between 2020 and 2099),
  budget_month    integer not null check (budget_month between 1 and 12),

  category_type   text not null check (category_type in ('income','expense')),
  -- distinguishes income category vs expense category

  income_category_id  uuid references public.income_categories(id) on delete cascade,
  expense_category_id uuid references public.expense_categories(id) on delete cascade,
  -- exactly one of the two should be non-null depending on category_type

  budgeted_amount numeric(15,2) not null check (budgeted_amount >= 0),

  notes           text,
  created_by      uuid references public.users(id) on delete set null,
  updated_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Prevent duplicate budget entries for same branch / month / category
  unique nulls not distinct (branch_id, budget_year, budget_month, income_category_id),
  unique nulls not distinct (branch_id, budget_year, budget_month, expense_category_id),

  -- Ensure category_type is consistent with which FK is populated
  constraint budget_category_fk_check check (
    (category_type = 'income'  and income_category_id  is not null and expense_category_id is null)
    or
    (category_type = 'expense' and expense_category_id is not null and income_category_id  is null)
  )
);

comment on table public.budget is
  'Monthly budget targets per income/expense category. Used for Budget vs Actual analysis on the finance dashboard.';

-- ──────────────────────────────────────────────────────────────
-- 5. fin_audit_logs
--    Immutable audit trail dedicated to finance mutations.
--    Separate from activity_logs to meet CA / auditor requirements:
--    - records old and new values as JSONB
--    - cannot be updated or deleted (enforced by trigger)
--    - covers income, expenses, journal_entries, payments,
--      cash_closing, bank_transactions, invoices, receivables
-- ──────────────────────────────────────────────────────────────
create table if not exists public.fin_audit_logs (
  id              bigint generated always as identity primary key,
  branch_id       uuid references public.branches(id) on delete set null,
  performed_by    uuid references public.users(id) on delete set null,

  entity_type     text not null,
  -- e.g. 'income','expense','payment','journal_entry','cash_closing',
  --      'bank_transaction','invoice','receivable'

  entity_id       uuid not null,
  action          text not null check (action in (
                    'created','updated','deleted','posted','voided',
                    'approved','rejected','reversed','reconciled',
                    'closed','reopened','exported'
                  )),
  old_values      jsonb,
  -- null on INSERT / created
  new_values      jsonb,
  -- null on DELETE / hard delete (soft deletes still have new_values)
  description     text,
  -- human-readable summary of what changed

  ip_address      inet,
  user_agent      text,

  created_at      timestamptz not null default now()
  -- no updated_at — this table is append-only
);

comment on table public.fin_audit_logs is
  'Immutable, append-only audit trail for all finance mutations. Required for CA review and compliance.';

-- Prevent any UPDATE or DELETE on fin_audit_logs
create or replace function public.prevent_fin_audit_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception
    'fin_audit_logs is immutable. Rows cannot be updated or deleted. (entity_type=%, entity_id=%)',
    old.entity_type, old.entity_id;
end $$;

drop trigger if exists guard_fin_audit_update on public.fin_audit_logs;
create trigger guard_fin_audit_update
before update on public.fin_audit_logs
for each row execute function public.prevent_fin_audit_mutation();

drop trigger if exists guard_fin_audit_delete on public.fin_audit_logs;
create trigger guard_fin_audit_delete
before delete on public.fin_audit_logs
for each row execute function public.prevent_fin_audit_mutation();

-- ──────────────────────────────────────────────────────────────
-- Indexes
-- ──────────────────────────────────────────────────────────────
create index if not exists payment_modes_branch_idx
  on public.payment_modes (branch_id, is_active, display_order);

create index if not exists cash_closing_branch_date_idx
  on public.cash_closing (branch_id, closing_date desc);

create index if not exists cash_closing_status_idx
  on public.cash_closing (branch_id, status);

create index if not exists budget_branch_period_idx
  on public.budget (branch_id, budget_year, budget_month);

create index if not exists budget_income_cat_idx
  on public.budget (income_category_id)
  where income_category_id is not null;

create index if not exists budget_expense_cat_idx
  on public.budget (expense_category_id)
  where expense_category_id is not null;

create index if not exists fin_audit_entity_idx
  on public.fin_audit_logs (entity_type, entity_id);

create index if not exists fin_audit_branch_date_idx
  on public.fin_audit_logs (branch_id, created_at desc);

create index if not exists fin_audit_user_idx
  on public.fin_audit_logs (performed_by, created_at desc);

-- ──────────────────────────────────────────────────────────────
-- updated_at triggers (exclude fin_audit_logs — append-only)
-- ──────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'payment_modes', 'finance_settings', 'cash_closing', 'budget'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────────────────────
alter table public.payment_modes    enable row level security;
alter table public.finance_settings enable row level security;
alter table public.cash_closing     enable row level security;
alter table public.budget           enable row level security;
alter table public.fin_audit_logs   enable row level security;

-- payment_modes: all authenticated staff can read; admin/manager can write
drop policy if exists payment_modes_read on public.payment_modes;
create policy payment_modes_read on public.payment_modes
  for select to authenticated
  using (
    branch_id is null                         -- global modes visible to all
    or public.app_role() = 'admin'
    or branch_id = public.current_branch_id()
  );

drop policy if exists payment_modes_write on public.payment_modes;
create policy payment_modes_write on public.payment_modes
  for all to authenticated
  using  (public.app_role() = 'admin' or (public.is_staff_user() and branch_id = public.current_branch_id()))
  with check (public.app_role() = 'admin' or (public.is_staff_user() and branch_id = public.current_branch_id()));

-- finance_settings: staff read, admin/manager write
drop policy if exists finance_settings_read on public.finance_settings;
create policy finance_settings_read on public.finance_settings
  for select to authenticated
  using (public.app_role() = 'admin' or branch_id = public.current_branch_id());

drop policy if exists finance_settings_write on public.finance_settings;
create policy finance_settings_write on public.finance_settings
  for all to authenticated
  using  (public.app_role() = 'admin' or (public.is_staff_user() and branch_id = public.current_branch_id()))
  with check (public.app_role() = 'admin' or (public.is_staff_user() and branch_id = public.current_branch_id()));

-- cash_closing: staff read; cashier / reception / manager can create/update open records
drop policy if exists cash_closing_read on public.cash_closing;
create policy cash_closing_read on public.cash_closing
  for select to authenticated
  using (public.app_role() = 'admin' or branch_id = public.current_branch_id());

drop policy if exists cash_closing_write on public.cash_closing;
create policy cash_closing_write on public.cash_closing
  for all to authenticated
  using  (public.app_role() = 'admin' or (public.is_staff_user() and branch_id = public.current_branch_id()))
  with check (public.app_role() = 'admin' or (public.is_staff_user() and branch_id = public.current_branch_id()));

-- budget: staff read; admin/manager write
drop policy if exists budget_read on public.budget;
create policy budget_read on public.budget
  for select to authenticated
  using (public.app_role() = 'admin' or branch_id = public.current_branch_id());

drop policy if exists budget_write on public.budget;
create policy budget_write on public.budget
  for all to authenticated
  using  (public.app_role() = 'admin' or (public.is_staff_user() and branch_id = public.current_branch_id()))
  with check (public.app_role() = 'admin' or (public.is_staff_user() and branch_id = public.current_branch_id()));

-- fin_audit_logs: read-only for authenticated staff; no direct writes from client
drop policy if exists fin_audit_logs_read on public.fin_audit_logs;
create policy fin_audit_logs_read on public.fin_audit_logs
  for select to authenticated
  using (public.app_role() = 'admin' or branch_id = public.current_branch_id());

-- No INSERT/UPDATE/DELETE policy for clients — writes go through server-side functions only

-- ──────────────────────────────────────────────────────────────
-- Seed: default payment modes (global — no branch_id)
-- ──────────────────────────────────────────────────────────────
insert into public.payment_modes (name, code, is_active, display_order, metadata)
values
  ('Cash',          'cash',        true, 1, '{}'),
  ('UPI',           'upi',         true, 2, '{}'),
  ('Card',          'card',        true, 3, '{}'),
  ('Net Banking',   'net_banking', true, 4, '{}'),
  ('Wallet',        'wallet',      true, 5, '{}'),
  ('Cheque',        'cheque',      true, 6, '{}'),
  ('Bank Transfer', 'bank_transfer', true, 7, '{}')
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- Helper: log a finance audit event (call from server-side triggers
-- or application code — never from client directly)
-- ──────────────────────────────────────────────────────────────
create or replace function public.log_fin_audit(
  p_branch_id   uuid,
  p_performed_by uuid,
  p_entity_type text,
  p_entity_id   uuid,
  p_action      text,
  p_old_values  jsonb default null,
  p_new_values  jsonb default null,
  p_description text default null
)
returns void language plpgsql security definer set search_path='public' as $$
begin
  insert into public.fin_audit_logs (
    branch_id, performed_by, entity_type, entity_id,
    action, old_values, new_values, description
  )
  values (
    p_branch_id, p_performed_by, p_entity_type, p_entity_id,
    p_action, p_old_values, p_new_values, p_description
  );
end $$;

comment on function public.log_fin_audit is
  'Append an immutable audit record to fin_audit_logs. Call from triggers or server actions — never from client code.';

-- ──────────────────────────────────────────────────────────────
-- Trigger: auto-audit posted journal entries
-- ──────────────────────────────────────────────────────────────
create or replace function public.audit_journal_post()
returns trigger language plpgsql security definer set search_path='public' as $$
begin
  if old.status <> 'posted' and new.status = 'posted' then
    perform public.log_fin_audit(
      new.branch_id,
      new.posted_by,
      'journal_entry',
      new.id,
      'posted',
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status, 'journal_number', new.journal_number),
      'Journal entry posted: ' || new.journal_number
    );
  end if;
  return new;
end $$;

drop trigger if exists audit_journal_post_trigger on public.journal_entries;
create trigger audit_journal_post_trigger
after update of status on public.journal_entries
for each row execute function public.audit_journal_post();

-- ──────────────────────────────────────────────────────────────
-- Trigger: auto-audit expense approval / rejection
-- ──────────────────────────────────────────────────────────────
create or replace function public.audit_expense_approval()
returns trigger language plpgsql security definer set search_path='public' as $$
begin
  if old.approval_status <> new.approval_status then
    perform public.log_fin_audit(
      new.branch_id,
      new.approved_by,
      'expense',
      new.id,
      case new.approval_status
        when 'approved' then 'approved'
        when 'rejected' then 'rejected'
        else 'updated'
      end,
      jsonb_build_object('approval_status', old.approval_status),
      jsonb_build_object(
        'approval_status', new.approval_status,
        'expense_number',  new.expense_number,
        'total_amount',    new.total_amount
      ),
      'Expense ' || new.expense_number || ' ' || new.approval_status
    );
  end if;
  return new;
end $$;

drop trigger if exists audit_expense_approval_trigger on public.expenses;
create trigger audit_expense_approval_trigger
after update of approval_status on public.expenses
for each row execute function public.audit_expense_approval();

-- ──────────────────────────────────────────────────────────────
-- Trigger: auto-audit cash closing
-- ──────────────────────────────────────────────────────────────
create or replace function public.audit_cash_closing()
returns trigger language plpgsql security definer set search_path='public' as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_fin_audit(
      new.branch_id, new.created_by, 'cash_closing', new.id,
      'created', null,
      jsonb_build_object('closing_date', new.closing_date, 'shift', new.shift),
      'Cash closing created for ' || new.closing_date || ' (' || new.shift || ')'
    );
  elsif tg_op = 'UPDATE' and old.status <> new.status then
    perform public.log_fin_audit(
      new.branch_id, new.updated_by, 'cash_closing', new.id,
      case new.status when 'closed' then 'closed' when 'reconciled' then 'reconciled' else 'updated' end,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status, 'physical_count', new.physical_count, 'variance', new.variance),
      'Cash closing status changed to ' || new.status
    );
  end if;
  return new;
end $$;

drop trigger if exists audit_cash_closing_trigger on public.cash_closing;
create trigger audit_cash_closing_trigger
after insert or update of status on public.cash_closing
for each row execute function public.audit_cash_closing();

commit;
