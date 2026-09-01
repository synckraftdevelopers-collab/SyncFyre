begin;

alter table public.finance_settings
  add column if not exists legal_business_name text,
  add column if not exists business_address text,
  add column if not exists business_city text,
  add column if not exists business_state text,
  add column if not exists business_state_code text,
  add column if not exists business_pincode text,
  add column if not exists pan text,
  add column if not exists default_gst_rate numeric(5,2) not null default 18.00,
  add column if not exists gst_pricing_mode text not null default 'exclusive'
    check (gst_pricing_mode in ('exclusive','inclusive'));

alter table public.invoices
  add column if not exists taxable_amount numeric(12,2) not null default 0,
  add column if not exists gst_rate numeric(5,2) not null default 0,
  add column if not exists cgst_amount numeric(12,2) not null default 0,
  add column if not exists sgst_amount numeric(12,2) not null default 0,
  add column if not exists igst_amount numeric(12,2) not null default 0,
  add column if not exists gst_type text not null default 'none'
    check (gst_type in ('none','intra','inter'));

alter table public.payments
  add column if not exists taxable_amount numeric(12,2) not null default 0,
  add column if not exists gst_rate numeric(5,2) not null default 0,
  add column if not exists gst_amount numeric(12,2) not null default 0,
  add column if not exists cgst_amount numeric(12,2) not null default 0,
  add column if not exists sgst_amount numeric(12,2) not null default 0,
  add column if not exists igst_amount numeric(12,2) not null default 0,
  add column if not exists gst_type text not null default 'none'
    check (gst_type in ('none','intra','inter'));

alter table public.income
  add column if not exists taxable_amount numeric(12,2) not null default 0,
  add column if not exists gst_rate numeric(5,2) not null default 0,
  add column if not exists cgst_amount numeric(12,2) not null default 0,
  add column if not exists sgst_amount numeric(12,2) not null default 0,
  add column if not exists igst_amount numeric(12,2) not null default 0,
  add column if not exists gst_type text not null default 'none'
    check (gst_type in ('none','intra','inter'));

alter table public.expenses
  add column if not exists taxable_amount numeric(12,2) not null default 0,
  add column if not exists gst_rate numeric(5,2) not null default 0,
  add column if not exists cgst_amount numeric(12,2) not null default 0,
  add column if not exists sgst_amount numeric(12,2) not null default 0,
  add column if not exists igst_amount numeric(12,2) not null default 0,
  add column if not exists gst_type text not null default 'none'
    check (gst_type in ('none','intra','inter'));

alter table public.gst_transactions
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists payment_id uuid references public.payments(id) on delete set null,
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null,
  add column if not exists member_id uuid references public.members(id) on delete set null,
  add column if not exists gst_rate numeric(5,2) not null default 0,
  add column if not exists gst_type text not null default 'none'
    check (gst_type in ('none','intra','inter'));

create index if not exists invoices_branch_created_idx on public.invoices (branch_id, created_at desc);
create index if not exists payments_invoice_idx on public.payments (invoice_id);
create index if not exists payments_branch_paid_idx on public.payments (branch_id, paid_at desc);
create index if not exists gst_reference_idx on public.gst_transactions (reference_type, reference_id);
create index if not exists gst_invoice_idx on public.gst_transactions (invoice_id);
create index if not exists gst_payment_idx on public.gst_transactions (payment_id);
create index if not exists gst_tenant_idx on public.gst_transactions (tenant_id);

create or replace function public.auto_income_from_payment()
returns trigger
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_cat_id uuid;
  v_invoice public.invoices%rowtype;
  v_member record;
  v_branch record;
  v_finance record;
  v_payment_total numeric(12,2);
  v_invoice_total numeric(12,2);
  v_ratio numeric(18,10);
  v_taxable numeric(12,2);
  v_gst numeric(12,2);
  v_cgst numeric(12,2);
  v_sgst numeric(12,2);
  v_igst numeric(12,2);
  v_gst_rate numeric(5,2);
  v_gst_type text;
  v_payment_date date;
  v_existing_income_id uuid;
  v_existing_gst_id uuid;
begin
  if not ((tg_op = 'UPDATE' and old.status <> 'completed' and new.status = 'completed')
     or (tg_op = 'INSERT' and new.status = 'completed')) then
    return new;
  end if;

  v_payment_total := greatest(new.amount - new.refund_amount, 0);
  v_payment_date := coalesce((new.paid_at at time zone 'Asia/Kolkata')::date, current_date);

  select * into v_invoice
  from public.invoices
  where id = new.invoice_id;

  if v_invoice.id is null then
    return new;
  end if;

  if v_payment_total <= 0 then
    return new;
  end if;

  select id into v_cat_id
  from public.income_categories
  where code = 'MEM' and (branch_id = new.branch_id or branch_id is null)
  order by branch_id nulls last
  limit 1;

  v_invoice_total := greatest(v_invoice.total_amount, 0);
  v_ratio := case when v_invoice_total > 0 then least(1, v_payment_total / v_invoice_total) else 1 end;
  v_taxable := round(coalesce(v_invoice.taxable_amount, v_invoice.subtotal, v_payment_total) * v_ratio, 2);
  v_gst := round(coalesce(v_invoice.gst_amount, 0) * v_ratio, 2);
  v_cgst := round(coalesce(v_invoice.cgst_amount, 0) * v_ratio, 2);
  v_sgst := round(coalesce(v_invoice.sgst_amount, 0) * v_ratio, 2);
  v_igst := round(coalesce(v_invoice.igst_amount, 0) * v_ratio, 2);
  v_gst_rate := coalesce(v_invoice.gst_rate, 0);
  v_gst_type := coalesce(v_invoice.gst_type, 'none');

  if v_taxable = 0 and v_gst = 0 then
    v_taxable := v_payment_total;
  end if;

  select id into v_existing_income_id from public.income where payment_id = new.id limit 1;
  if v_existing_income_id is null then
    insert into public.income (
      branch_id, tenant_id, category_id, payment_id, invoice_id, member_id,
      amount, taxable_amount, gst_rate, gst_type, cgst_amount, sgst_amount, igst_amount,
      gst_amount, total_amount, payment_method, transaction_ref, income_date, description,
      status, is_membership_income, hsn_sac, created_by
    )
    values (
      new.branch_id,
      new.tenant_id,
      v_cat_id,
      new.id,
      new.invoice_id,
      new.member_id,
      v_taxable,
      v_taxable,
      v_gst_rate,
      v_gst_type,
      v_cgst,
      v_sgst,
      v_igst,
      v_gst,
      v_payment_total,
      new.method,
      new.transaction_reference,
      v_payment_date,
      'Auto-imported from payment ' || new.id::text,
      'posted',
      true,
      null,
      new.collected_by
    );
  end if;

  if new.method = 'cash' and not exists (
    select 1 from public.cash_book where linked_payment_id = new.id and status = 'posted'
  ) then
    insert into public.cash_book (
      branch_id, tenant_id, entry_date, entry_type, amount, balance_after,
      description, linked_payment_id, status, created_by
    )
    values (
      new.branch_id,
      new.tenant_id,
      v_payment_date,
      'credit',
      v_payment_total,
      0,
      'Cash received from member payment',
      new.id,
      'posted',
      new.collected_by
    );
  end if;

  if v_gst > 0 then
    select full_name, state, tenant_id into v_member
    from public.members
    where id = new.member_id;

    select b.name, b.tenant_id, t.name as tenant_name, t.gst_number, fs.gstin, fs.default_hsn_sac
    into v_branch
    from public.branches b
    left join public.tenants t on t.id = b.tenant_id
    left join public.finance_settings fs on fs.branch_id = b.id
    where b.id = new.branch_id;

    select id into v_existing_gst_id
    from public.gst_transactions
    where reference_type = 'payment' and reference_id = new.id
    limit 1;

    if v_existing_gst_id is null then
      insert into public.gst_transactions (
        branch_id, tenant_id, payment_id, invoice_id, member_id,
        txn_type, reference_type, reference_id, invoice_number, party_name, party_gstin,
        taxable_amount, gst_rate, gst_type, cgst_rate, sgst_rate, igst_rate,
        cgst_amount, sgst_amount, igst_amount, total_tax, hsn_sac, txn_date, status, created_by
      ) values (
        new.branch_id,
        coalesce(new.tenant_id, v_branch.tenant_id),
        new.id,
        new.invoice_id,
        new.member_id,
        'sales',
        'payment',
        new.id,
        v_invoice.invoice_number,
        coalesce(v_member.full_name, v_branch.tenant_name, v_branch.name),
        null,
        v_taxable,
        v_gst_rate,
        v_gst_type,
        case when v_gst_type = 'intra' then round(v_gst_rate / 2, 2) else 0 end,
        case when v_gst_type = 'intra' then round(v_gst_rate / 2, 2) else 0 end,
        case when v_gst_type = 'inter' then v_gst_rate else 0 end,
        v_cgst,
        v_sgst,
        v_igst,
        v_gst,
        v_branch.default_hsn_sac,
        v_payment_date,
        'posted',
        new.collected_by
      );
    end if;
  end if;

  return new;
end $$;

commit;
