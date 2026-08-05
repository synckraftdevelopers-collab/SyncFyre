-- ================================================================
-- Migration: 0005_finance_module
-- Purpose  : Finance & Accounting Module
--            Reuses: branches, users, members, membership_plans,
--                    subscriptions, payments, invoices
--            Creates: income_categories, expense_categories,
--                     vendors, income, expenses, chart_of_accounts,
--                     journal_entries, ledger, cash_book,
--                     bank_accounts, bank_transactions,
--                     gst_transactions, receivables, fin_attachments
-- ================================================================
begin;

-- ──────────────────────────────────────────────────────────────
-- Custom types
-- ──────────────────────────────────────────────────────────────
do $$ begin
  create type public.fin_entry_type as enum ('debit','credit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.fin_txn_status as enum ('draft','pending','posted','voided','reversed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_type as enum (
    'asset','liability','equity','income','expense'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.expense_approval_status as enum (
    'pending','approved','rejected','cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bank_txn_type as enum (
    'deposit','withdrawal','transfer','adjustment'
  );
exception when duplicate_object then null; end $$;

-- ──────────────────────────────────────────────────────────────
-- income_categories
-- ──────────────────────────────────────────────────────────────
create table if not exists public.income_categories (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid references public.branches(id) on delete cascade,
  name        text not null,
  code        text,
  description text,
  is_system   boolean not null default false,
  status      public.record_status not null default 'active',
  created_by  uuid references public.users(id) on delete set null,
  updated_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique nulls not distinct (branch_id, name)
);

-- ──────────────────────────────────────────────────────────────
-- expense_categories
-- ──────────────────────────────────────────────────────────────
create table if not exists public.expense_categories (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid references public.branches(id) on delete cascade,
  name        text not null,
  code        text,
  description text,
  is_system   boolean not null default false,
  status      public.record_status not null default 'active',
  created_by  uuid references public.users(id) on delete set null,
  updated_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique nulls not distinct (branch_id, name)
);

-- ──────────────────────────────────────────────────────────────
-- vendors
-- ──────────────────────────────────────────────────────────────
create table if not exists public.vendors (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references public.branches(id) on delete restrict,
  name        text not null,
  contact_name text,
  phone       text,
  email       citext,
  address     text,
  gstin       text,
  pan         text,
  bank_name   text,
  bank_account_no text,
  bank_ifsc   text,
  status      public.record_status not null default 'active',
  created_by  uuid references public.users(id) on delete set null,
  updated_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- chart_of_accounts
-- ──────────────────────────────────────────────────────────────
create table if not exists public.chart_of_accounts (
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid references public.branches(id) on delete cascade,
  parent_id     uuid references public.chart_of_accounts(id) on delete set null,
  account_code  text not null,
  account_name  text not null,
  account_type  public.account_type not null,
  is_system     boolean not null default false,
  is_leaf       boolean not null default true,
  opening_balance numeric(15,2) not null default 0,
  description   text,
  status        public.record_status not null default 'active',
  created_by    uuid references public.users(id) on delete set null,
  updated_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique nulls not distinct (branch_id, account_code)
);

-- ──────────────────────────────────────────────────────────────
-- income  (non-membership / manual income entries)
-- ──────────────────────────────────────────────────────────────
create sequence if not exists public.income_number_seq start 1;
create table if not exists public.income (
  id               uuid primary key default gen_random_uuid(),
  income_number    text not null unique default ('INC-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.income_number_seq')::text,5,'0')),
  branch_id        uuid not null references public.branches(id) on delete restrict,
  category_id      uuid references public.income_categories(id) on delete set null,
  payment_id       uuid references public.payments(id) on delete set null,
  invoice_id       uuid references public.invoices(id) on delete set null,
  member_id        uuid references public.members(id) on delete set null,
  amount           numeric(12,2) not null check (amount > 0),
  gst_amount       numeric(12,2) not null default 0 check (gst_amount >= 0),
  total_amount     numeric(12,2) not null check (total_amount > 0),
  payment_method   public.payment_method not null default 'cash',
  transaction_ref  text,
  income_date      date not null default current_date,
  description      text,
  notes            text,
  status           public.fin_txn_status not null default 'posted',
  is_membership_income boolean not null default false,
  hsn_sac          text,
  created_by       uuid references public.users(id) on delete set null,
  updated_by       uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- expenses
-- ──────────────────────────────────────────────────────────────
create sequence if not exists public.expense_number_seq start 1;
create table if not exists public.expenses (
  id                  uuid primary key default gen_random_uuid(),
  expense_number      text not null unique default ('EXP-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.expense_number_seq')::text,5,'0')),
  branch_id           uuid not null references public.branches(id) on delete restrict,
  category_id         uuid references public.expense_categories(id) on delete set null,
  vendor_id           uuid references public.vendors(id) on delete set null,
  amount              numeric(12,2) not null check (amount > 0),
  gst_amount          numeric(12,2) not null default 0 check (gst_amount >= 0),
  total_amount        numeric(12,2) not null check (total_amount > 0),
  payment_method      public.payment_method not null default 'cash',
  bill_number         text,
  expense_date        date not null default current_date,
  description         text not null,
  notes               text,
  approval_status     public.expense_approval_status not null default 'pending',
  approved_by         uuid references public.users(id) on delete set null,
  approved_at         timestamptz,
  rejection_reason    text,
  is_recurring        boolean not null default false,
  recurring_interval  text check (recurring_interval in ('daily','weekly','monthly','quarterly','yearly')),
  next_due_date       date,
  status              public.fin_txn_status not null default 'draft',
  hsn_sac             text,
  created_by          uuid references public.users(id) on delete set null,
  updated_by          uuid references public.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- bank_accounts
-- ──────────────────────────────────────────────────────────────
create table if not exists public.bank_accounts (
  id               uuid primary key default gen_random_uuid(),
  branch_id        uuid not null references public.branches(id) on delete restrict,
  account_name     text not null,
  bank_name        text not null,
  account_number   text not null,
  ifsc_code        text,
  account_type     text not null default 'current' check (account_type in ('savings','current','overdraft','cash')),
  opening_balance  numeric(15,2) not null default 0,
  current_balance  numeric(15,2) not null default 0,
  is_default       boolean not null default false,
  status           public.record_status not null default 'active',
  created_by       uuid references public.users(id) on delete set null,
  updated_by       uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- bank_transactions
-- ──────────────────────────────────────────────────────────────
create table if not exists public.bank_transactions (
  id               uuid primary key default gen_random_uuid(),
  branch_id        uuid not null references public.branches(id) on delete restrict,
  bank_account_id  uuid not null references public.bank_accounts(id) on delete restrict,
  txn_type         public.bank_txn_type not null,
  amount           numeric(12,2) not null check (amount > 0),
  balance_after    numeric(15,2) not null,
  reference_no     text,
  txn_date         date not null default current_date,
  description      text not null,
  linked_expense_id uuid references public.expenses(id) on delete set null,
  linked_income_id  uuid references public.income(id) on delete set null,
  linked_payment_id uuid references public.payments(id) on delete set null,
  is_reconciled    boolean not null default false,
  reconciled_at    timestamptz,
  reconciled_by    uuid references public.users(id) on delete set null,
  status           public.fin_txn_status not null default 'posted',
  created_by       uuid references public.users(id) on delete set null,
  updated_by       uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- cash_book
-- ──────────────────────────────────────────────────────────────
create table if not exists public.cash_book (
  id               uuid primary key default gen_random_uuid(),
  branch_id        uuid not null references public.branches(id) on delete restrict,
  entry_date       date not null default current_date,
  entry_type       public.fin_entry_type not null,
  amount           numeric(12,2) not null check (amount > 0),
  balance_after    numeric(15,2) not null,
  description      text not null,
  linked_expense_id uuid references public.expenses(id) on delete set null,
  linked_income_id  uuid references public.income(id) on delete set null,
  linked_payment_id uuid references public.payments(id) on delete set null,
  status           public.fin_txn_status not null default 'posted',
  created_by       uuid references public.users(id) on delete set null,
  updated_by       uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- journal_entries
-- ──────────────────────────────────────────────────────────────
create sequence if not exists public.journal_number_seq start 1;
create table if not exists public.journal_entries (
  id               uuid primary key default gen_random_uuid(),
  journal_number   text not null unique default ('JV-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.journal_number_seq')::text,5,'0')),
  branch_id        uuid not null references public.branches(id) on delete restrict,
  entry_date       date not null default current_date,
  narration        text not null,
  reference_type   text check (reference_type in ('payment','income','expense','contra','receipt_voucher','payment_voucher','credit_note','debit_note','opening','adjustment','reversal')),
  reference_id     uuid,
  is_reversal      boolean not null default false,
  reversed_entry_id uuid references public.journal_entries(id) on delete set null,
  status           public.fin_txn_status not null default 'draft',
  total_debit      numeric(15,2) not null default 0 check (total_debit >= 0),
  total_credit     numeric(15,2) not null default 0 check (total_credit >= 0),
  created_by       uuid references public.users(id) on delete set null,
  updated_by       uuid references public.users(id) on delete set null,
  posted_by        uuid references public.users(id) on delete set null,
  posted_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- journal_lines  (double-entry: debit + credit lines per entry)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.journal_lines (
  id               uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id       uuid not null references public.chart_of_accounts(id) on delete restrict,
  entry_type       public.fin_entry_type not null,
  amount           numeric(15,2) not null check (amount > 0),
  narration        text,
  created_at       timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- ledger  (running account balance per COA account)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.ledger (
  id               uuid primary key default gen_random_uuid(),
  branch_id        uuid not null references public.branches(id) on delete restrict,
  account_id       uuid not null references public.chart_of_accounts(id) on delete restrict,
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  journal_line_id  uuid references public.journal_lines(id) on delete set null,
  entry_date       date not null,
  entry_type       public.fin_entry_type not null,
  amount           numeric(15,2) not null check (amount > 0),
  balance          numeric(15,2) not null,
  narration        text,
  created_at       timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- gst_transactions
-- ──────────────────────────────────────────────────────────────
create table if not exists public.gst_transactions (
  id               uuid primary key default gen_random_uuid(),
  branch_id        uuid not null references public.branches(id) on delete restrict,
  txn_type         text not null check (txn_type in ('sales','purchase')),
  reference_type   text not null check (reference_type in ('income','expense','payment')),
  reference_id     uuid not null,
  invoice_number   text,
  party_name       text,
  party_gstin      text,
  taxable_amount   numeric(12,2) not null check (taxable_amount >= 0),
  cgst_rate        numeric(5,2) not null default 9,
  sgst_rate        numeric(5,2) not null default 9,
  igst_rate        numeric(5,2) not null default 0,
  cgst_amount      numeric(12,2) not null default 0 check (cgst_amount >= 0),
  sgst_amount      numeric(12,2) not null default 0 check (sgst_amount >= 0),
  igst_amount      numeric(12,2) not null default 0 check (igst_amount >= 0),
  total_tax        numeric(12,2) not null default 0 check (total_tax >= 0),
  hsn_sac          text,
  txn_date         date not null default current_date,
  status           public.fin_txn_status not null default 'posted',
  created_by       uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- receivables  (outstanding dues tracker — supplements invoices)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.receivables (
  id               uuid primary key default gen_random_uuid(),
  branch_id        uuid not null references public.branches(id) on delete restrict,
  member_id        uuid references public.members(id) on delete set null,
  invoice_id       uuid references public.invoices(id) on delete set null,
  subscription_id  uuid references public.subscriptions(id) on delete set null,
  receivable_type  text not null default 'membership' check (receivable_type in ('membership','pt','merchandise','other')),
  original_amount  numeric(12,2) not null check (original_amount > 0),
  paid_amount      numeric(12,2) not null default 0 check (paid_amount >= 0),
  balance_amount   numeric(12,2) not null check (balance_amount >= 0),
  due_date         date,
  status           text not null default 'pending' check (status in ('pending','partial','paid','overdue','written_off')),
  reminder_count   integer not null default 0,
  last_reminder_at timestamptz,
  notes            text,
  created_by       uuid references public.users(id) on delete set null,
  updated_by       uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- fin_attachments  (file attachments for expenses, income, etc.)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.fin_attachments (
  id               uuid primary key default gen_random_uuid(),
  branch_id        uuid not null references public.branches(id) on delete restrict,
  entity_type      text not null check (entity_type in ('expense','income','journal_entry','bank_transaction')),
  entity_id        uuid not null,
  file_name        text not null,
  file_url         text not null,
  file_size        integer,
  mime_type        text,
  uploaded_by      uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- Indexes
-- ──────────────────────────────────────────────────────────────
create index if not exists income_branch_date_idx       on public.income       (branch_id, income_date desc);
create index if not exists income_category_idx          on public.income       (category_id);
create index if not exists income_member_idx            on public.income       (member_id);
create index if not exists income_payment_idx           on public.income       (payment_id);
create index if not exists expenses_branch_date_idx     on public.expenses     (branch_id, expense_date desc);
create index if not exists expenses_category_idx        on public.expenses     (category_id);
create index if not exists expenses_approval_idx        on public.expenses     (branch_id, approval_status);
create index if not exists expenses_vendor_idx          on public.expenses     (vendor_id);
create index if not exists cash_book_branch_date_idx    on public.cash_book    (branch_id, entry_date desc);
create index if not exists bank_txn_account_date_idx    on public.bank_transactions (bank_account_id, txn_date desc);
create index if not exists bank_txn_branch_date_idx     on public.bank_transactions (branch_id, txn_date desc);
create index if not exists journal_branch_date_idx      on public.journal_entries (branch_id, entry_date desc);
create index if not exists journal_status_idx           on public.journal_entries (branch_id, status);
create index if not exists journal_lines_entry_idx      on public.journal_lines  (journal_entry_id);
create index if not exists journal_lines_account_idx    on public.journal_lines  (account_id);
create index if not exists ledger_account_date_idx      on public.ledger          (account_id, entry_date desc);
create index if not exists ledger_branch_date_idx       on public.ledger          (branch_id, entry_date desc);
create index if not exists gst_branch_date_idx          on public.gst_transactions (branch_id, txn_date desc);
create index if not exists gst_txn_type_idx             on public.gst_transactions (branch_id, txn_type, txn_date desc);
create index if not exists receivables_branch_status_idx on public.receivables  (branch_id, status);
create index if not exists receivables_member_idx       on public.receivables   (member_id);
create index if not exists receivables_due_date_idx     on public.receivables   (branch_id, due_date) where status in ('pending','partial','overdue');
create index if not exists fin_attachments_entity_idx   on public.fin_attachments (entity_type, entity_id);
create index if not exists coa_branch_type_idx          on public.chart_of_accounts (branch_id, account_type);
create index if not exists bank_accounts_branch_idx     on public.bank_accounts  (branch_id, status);

-- ──────────────────────────────────────────────────────────────
-- updated_at triggers
-- ──────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'income_categories','expense_categories','vendors',
    'chart_of_accounts','income','expenses','bank_accounts',
    'bank_transactions','cash_book','journal_entries',
    'gst_transactions','receivables'
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
-- RLS Enable
-- ──────────────────────────────────────────────────────────────
alter table public.income_categories    enable row level security;
alter table public.expense_categories   enable row level security;
alter table public.vendors              enable row level security;
alter table public.chart_of_accounts    enable row level security;
alter table public.income               enable row level security;
alter table public.expenses             enable row level security;
alter table public.bank_accounts        enable row level security;
alter table public.bank_transactions    enable row level security;
alter table public.cash_book            enable row level security;
alter table public.journal_entries      enable row level security;
alter table public.journal_lines        enable row level security;
alter table public.ledger               enable row level security;
alter table public.gst_transactions     enable row level security;
alter table public.receivables          enable row level security;
alter table public.fin_attachments      enable row level security;

-- ──────────────────────────────────────────────────────────────
-- RLS Policies: read — admin sees all, staff sees their branch
-- ──────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'income_categories','expense_categories','vendors',
    'chart_of_accounts','income','expenses','bank_accounts',
    'bank_transactions','cash_book','journal_entries',
    'gst_transactions','receivables','fin_attachments'
  ] loop
    execute format(
      'drop policy if exists %I_staff_read on public.%I;
       create policy %I_staff_read on public.%I
       for select to authenticated
       using (public.app_role() = ''admin'' or branch_id = public.current_branch_id())',
      t, t, t, t
    );
    execute format(
      'drop policy if exists %I_mgmt_write on public.%I;
       create policy %I_mgmt_write on public.%I
       for all to authenticated
       using  (public.app_role() = ''admin'' or (public.is_staff_user() and branch_id = public.current_branch_id()))
       with check (public.app_role() = ''admin'' or (public.is_staff_user() and branch_id = public.current_branch_id()))',
      t, t, t, t
    );
  end loop;
end $$;

-- journal_lines use parent journal_entry branch scoping
drop policy if exists journal_lines_staff_read on public.journal_lines;
create policy journal_lines_staff_read on public.journal_lines
for select to authenticated
using (
  journal_entry_id in (
    select id from public.journal_entries
    where public.app_role() = 'admin' or branch_id = public.current_branch_id()
  )
);

drop policy if exists journal_lines_mgmt_write on public.journal_lines;
create policy journal_lines_mgmt_write on public.journal_lines
for all to authenticated
using (
  journal_entry_id in (
    select id from public.journal_entries
    where public.app_role() = 'admin' or (public.is_staff_user() and branch_id = public.current_branch_id())
  )
)
with check (
  journal_entry_id in (
    select id from public.journal_entries
    where public.app_role() = 'admin' or (public.is_staff_user() and branch_id = public.current_branch_id())
  )
);

-- ledger inherits branch scoping
drop policy if exists ledger_staff_read on public.ledger;
create policy ledger_staff_read on public.ledger
for select to authenticated
using (public.app_role() = 'admin' or branch_id = public.current_branch_id());

drop policy if exists ledger_system_write on public.ledger;
create policy ledger_system_write on public.ledger
for all to authenticated
using  (public.app_role() = 'admin' or (public.is_staff_user() and branch_id = public.current_branch_id()))
with check (public.app_role() = 'admin' or (public.is_staff_user() and branch_id = public.current_branch_id()));

-- ──────────────────────────────────────────────────────────────
-- System seed data: income categories
-- ──────────────────────────────────────────────────────────────
insert into public.income_categories (name, code, description, is_system, status)
values
  ('Membership Fee',     'MEM',   'Monthly / annual membership subscription fees', true,  'active'),
  ('Personal Training',  'PT',    'Personal trainer session fees',                 true,  'active'),
  ('Joining Fee',        'JF',    'One-time registration / joining fees',          true,  'active'),
  ('Supplements',        'SUPP',  'Protein, vitamins and other supplements',       true,  'active'),
  ('Merchandise',        'MERCH', 'Gym branded products and merchandise',          true,  'active'),
  ('Locker Rent',        'LOCK',  'Monthly locker rental charges',                 true,  'active'),
  ('Diet Consultation',  'DIET',  'Diet and nutrition consultation fees',          true,  'active'),
  ('Other Income',       'OTH',   'Any other income not classified above',         true,  'active')
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- System seed data: expense categories
-- ──────────────────────────────────────────────────────────────
insert into public.expense_categories (name, code, description, is_system, status)
values
  ('Rent',                'RENT',  'Premises rent / lease payments',                true, 'active'),
  ('Salaries',            'SAL',   'Staff and trainer salary disbursements',         true, 'active'),
  ('Electricity',         'ELEC',  'Electricity and power bills',                   true, 'active'),
  ('Water',               'WATER', 'Water supply bills',                            true, 'active'),
  ('Internet',            'NET',   'Broadband and internet expenses',               true, 'active'),
  ('Equipment Maintenance','EQMT', 'Gym equipment maintenance and repairs',         true, 'active'),
  ('Repairs',             'REP',   'General building and infrastructure repairs',   true, 'active'),
  ('Marketing',           'MKT',   'Advertising, promotions and digital marketing', true, 'active'),
  ('Housekeeping',        'HK',    'Cleaning supplies and housekeeping services',   true, 'active'),
  ('Office Supplies',     'OFC',   'Stationery and office consumables',             true, 'active'),
  ('Miscellaneous',       'MISC',  'Expenses not classified in other categories',   true, 'active')
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- Immutability guard: posted journal entries cannot be edited
-- ──────────────────────────────────────────────────────────────
create or replace function public.prevent_posted_journal_edit()
returns trigger language plpgsql set search_path='' as $$
begin
  if old.status = 'posted' and new.status = 'posted' then
    raise exception 'Posted journal entries are immutable. Create a reversal entry instead.';
  end if;
  return new;
end $$;

drop trigger if exists guard_posted_journal on public.journal_entries;
create trigger guard_posted_journal
before update on public.journal_entries
for each row execute function public.prevent_posted_journal_edit();

-- ──────────────────────────────────────────────────────────────
-- Auto-update cash_book balance trigger
-- ──────────────────────────────────────────────────────────────
create or replace function public.calc_cash_book_balance()
returns trigger language plpgsql set search_path='public' as $$
declare v_last_balance numeric(15,2);
begin
  select coalesce(max(balance_after), 0)
  into   v_last_balance
  from   public.cash_book
  where  branch_id = new.branch_id
    and  id <> new.id;

  new.balance_after := case
    when new.entry_type = 'credit' then v_last_balance + new.amount
    else                                v_last_balance - new.amount
  end;
  return new;
end $$;

drop trigger if exists set_cash_book_balance on public.cash_book;
create trigger set_cash_book_balance
before insert on public.cash_book
for each row execute function public.calc_cash_book_balance();

-- ──────────────────────────────────────────────────────────────
-- Auto-update bank balance trigger
-- ──────────────────────────────────────────────────────────────
create or replace function public.calc_bank_balance()
returns trigger language plpgsql set search_path='public' as $$
declare v_last_balance numeric(15,2);
begin
  select coalesce(current_balance, opening_balance)
  into   v_last_balance
  from   public.bank_accounts
  where  id = new.bank_account_id;

  new.balance_after := case
    when new.txn_type in ('deposit') then v_last_balance + new.amount
    else                                  v_last_balance - new.amount
  end;

  update public.bank_accounts
  set current_balance = new.balance_after,
      updated_at      = now()
  where id = new.bank_account_id;

  return new;
end $$;

drop trigger if exists set_bank_balance on public.bank_transactions;
create trigger set_bank_balance
before insert on public.bank_transactions
for each row execute function public.calc_bank_balance();

-- ──────────────────────────────────────────────────────────────
-- Auto-post income from completed payments (integration hook)
-- ──────────────────────────────────────────────────────────────
create or replace function public.auto_income_from_payment()
returns trigger language plpgsql security definer set search_path='public' as $$
declare
  v_cat_id uuid;
begin
  -- Only fire on newly completed payments
  if (tg_op = 'UPDATE' and old.status <> 'completed' and new.status = 'completed')
     or (tg_op = 'INSERT' and new.status = 'completed') then

    select id into v_cat_id
    from public.income_categories
    where code = 'MEM' and (branch_id = new.branch_id or branch_id is null)
    limit 1;

    insert into public.income (
      branch_id, category_id, payment_id, invoice_id, member_id,
      amount, gst_amount, total_amount, payment_method,
      transaction_ref, income_date, description,
      status, is_membership_income, created_by
    )
    values (
      new.branch_id,
      v_cat_id,
      new.id,
      new.invoice_id,
      new.member_id,
      new.amount - new.refund_amount,
      0,
      new.amount - new.refund_amount,
      new.method,
      new.transaction_reference,
      coalesce((new.paid_at at time zone 'Asia/Kolkata')::date, current_date),
      'Auto-imported from payment ' || new.id::text,
      'posted',
      true,
      new.collected_by
    )
    on conflict do nothing;

    -- Also write to cash_book if cash payment
    if new.method = 'cash' then
      insert into public.cash_book (
        branch_id, entry_date, entry_type, amount, balance_after,
        description, linked_payment_id, status, created_by
      )
      values (
        new.branch_id,
        coalesce((new.paid_at at time zone 'Asia/Kolkata')::date, current_date),
        'credit',
        new.amount - new.refund_amount,
        0, -- trigger recalculates
        'Cash received from member payment',
        new.id,
        'posted',
        new.collected_by
      );
    end if;

  end if;
  return new;
end $$;

drop trigger if exists payments_auto_income on public.payments;
create trigger payments_auto_income
after insert or update of status on public.payments
for each row execute function public.auto_income_from_payment();

-- ──────────────────────────────────────────────────────────────
-- Auto-update receivable when payment is received
-- ──────────────────────────────────────────────────────────────
create or replace function public.sync_receivable_on_payment()
returns trigger language plpgsql security definer set search_path='public' as $$
begin
  if new.status = 'completed' and new.invoice_id is not null then
    update public.receivables
    set paid_amount = paid_amount + (new.amount - new.refund_amount),
        balance_amount = greatest(original_amount - (paid_amount + (new.amount - new.refund_amount)), 0),
        status = case
          when original_amount - (paid_amount + (new.amount - new.refund_amount)) <= 0 then 'paid'
          else 'partial'
        end,
        updated_at = now()
    where invoice_id = new.invoice_id
      and status in ('pending','partial','overdue');
  end if;
  return new;
end $$;

drop trigger if exists payments_sync_receivable on public.payments;
create trigger payments_sync_receivable
after insert or update of status on public.payments
for each row execute function public.sync_receivable_on_payment();

-- ──────────────────────────────────────────────────────────────
-- Storage bucket for finance attachments
-- ──────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'finance-attachments',
  'finance-attachments',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

drop policy if exists finance_attachments_read on storage.objects;
create policy finance_attachments_read on storage.objects
for select to authenticated
using (bucket_id = 'finance-attachments' and public.is_staff_user());

drop policy if exists finance_attachments_write on storage.objects;
create policy finance_attachments_write on storage.objects
for insert to authenticated
with check (bucket_id = 'finance-attachments' and public.is_staff_user());

commit;
