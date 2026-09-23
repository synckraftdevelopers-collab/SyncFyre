-- ================================================================
-- demo-data-seed.sql  v2
-- Safe Demo Test Data for demo@syncfyre.com ONLY
--
-- WHAT THIS DOES:
--   1. Creates the demo branch + tenant if they don't exist.
--   2. Creates 28 demo members with DEMO-xxxx member codes,
--      covering every state needed for app testing.
--   3. Creates subscriptions, invoices, payments, receivables,
--      attendance, notifications, and CRM leads.
--
-- SAFETY:
--   - All IDs use unique prefixes (f0f0f0f0-*, a1b2c3d4-* etc.)
--     that cannot conflict with demo-seed.sql (dddddddd-*, eeeeeeee-*).
--   - Hard safety check aborts if demo tenant = Talwalkar tenant.
--   - Captures Talwalkar counts before and verifies them after.
--   - ON CONFLICT DO NOTHING throughout — idempotent to re-run.
--
-- HOW TO RUN:
--   https://supabase.com/dashboard/project/siycjpmsujcxkvdsfcvq/sql/new
--   Paste and click Run.
-- ================================================================

begin;

-- ──────────────────────────────────────────────────────────────
-- TRIGGER FIX: auto_income_from_payment() references members.state
-- which does not exist on the members table. The column is only
-- used to determine inter/intra GST type, but that value is already
-- available from the invoice (gst_type). Patch the trigger to
-- select only the columns that actually exist.
-- ──────────────────────────────────────────────────────────────
create or replace function public.auto_income_from_payment()
returns trigger
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_cat_id             uuid;
  v_invoice            public.invoices%rowtype;
  v_member             record;
  v_branch             record;
  v_payment_total      numeric(12,2);
  v_invoice_total      numeric(12,2);
  v_ratio              numeric(18,10);
  v_taxable            numeric(12,2);
  v_gst                numeric(12,2);
  v_cgst               numeric(12,2);
  v_sgst               numeric(12,2);
  v_igst               numeric(12,2);
  v_gst_rate           numeric(5,2);
  v_gst_type           text;
  v_payment_date       date;
  v_existing_income_id uuid;
  v_existing_gst_id    uuid;
begin
  if not ((tg_op = 'UPDATE' and old.status <> 'completed' and new.status = 'completed')
     or   (tg_op = 'INSERT' and new.status = 'completed')) then
    return new;
  end if;

  v_payment_total := greatest(new.amount - new.refund_amount, 0);
  v_payment_date  := coalesce((new.paid_at at time zone 'Asia/Kolkata')::date, current_date);

  select * into v_invoice from public.invoices where id = new.invoice_id;
  if v_invoice.id is null then return new; end if;
  if v_payment_total <= 0   then return new; end if;

  select id into v_cat_id
  from public.income_categories
  where code = 'MEM' and (branch_id = new.branch_id or branch_id is null)
  order by branch_id nulls last
  limit 1;

  v_invoice_total := greatest(v_invoice.total_amount, 0);
  v_ratio    := case when v_invoice_total > 0 then least(1, v_payment_total / v_invoice_total) else 1 end;
  v_taxable  := round(coalesce(v_invoice.taxable_amount, v_invoice.subtotal, v_payment_total) * v_ratio, 2);
  v_gst      := round(coalesce(v_invoice.gst_amount,  0) * v_ratio, 2);
  v_cgst     := round(coalesce(v_invoice.cgst_amount, 0) * v_ratio, 2);
  v_sgst     := round(coalesce(v_invoice.sgst_amount, 0) * v_ratio, 2);
  v_igst     := round(coalesce(v_invoice.igst_amount, 0) * v_ratio, 2);
  v_gst_rate := coalesce(v_invoice.gst_rate, 0);
  v_gst_type := coalesce(v_invoice.gst_type, 'none');

  if v_taxable = 0 and v_gst = 0 then
    v_taxable := v_payment_total;
  end if;

  -- Income row
  select id into v_existing_income_id from public.income where payment_id = new.id limit 1;
  if v_existing_income_id is null then
    insert into public.income (
      branch_id, tenant_id, category_id, payment_id, invoice_id, member_id,
      amount, taxable_amount, gst_rate, gst_type,
      cgst_amount, sgst_amount, igst_amount, gst_amount, total_amount,
      payment_method, transaction_ref, income_date, description,
      status, is_membership_income, hsn_sac, created_by
    ) values (
      new.branch_id, new.tenant_id, v_cat_id, new.id, new.invoice_id, new.member_id,
      v_taxable, v_taxable, v_gst_rate, v_gst_type,
      v_cgst, v_sgst, v_igst, v_gst, v_payment_total,
      new.method, new.transaction_reference, v_payment_date,
      'Auto-imported from payment ' || new.id::text,
      'posted', true, null, new.collected_by
    );
  end if;

  -- Cash book entry
  if new.method = 'cash' and not exists (
    select 1 from public.cash_book where linked_payment_id = new.id and status = 'posted'
  ) then
    insert into public.cash_book (
      branch_id, tenant_id, entry_date, entry_type, amount, balance_after,
      description, linked_payment_id, status, created_by
    ) values (
      new.branch_id, new.tenant_id, v_payment_date, 'credit',
      v_payment_total, 0, 'Cash received from member payment',
      new.id, 'posted', new.collected_by
    );
  end if;

  -- GST transaction (only when GST applies)
  if v_gst > 0 then
    -- FIX: members table has no "state" column; select only columns that exist.
    -- The member state is not needed here — gst_type is already determined from
    -- the invoice. We only need full_name for the party_name field.
    select full_name, tenant_id into v_member
    from public.members
    where id = new.member_id;

    select b.name, b.tenant_id, t.name as tenant_name, t.gst_number,
           fs.gstin, fs.default_hsn_sac
    into v_branch
    from public.branches b
    left join public.tenants       t  on t.id  = b.tenant_id
    left join public.finance_settings fs on fs.branch_id = b.id
    where b.id = new.branch_id;

    select id into v_existing_gst_id
    from public.gst_transactions
    where reference_type = 'payment' and reference_id = new.id
    limit 1;

    if v_existing_gst_id is null then
      insert into public.gst_transactions (
        branch_id, tenant_id, payment_id, invoice_id, member_id,
        txn_type, reference_type, reference_id, invoice_number,
        party_name, party_gstin,
        taxable_amount, gst_rate, gst_type,
        cgst_rate, sgst_rate, igst_rate,
        cgst_amount, sgst_amount, igst_amount, total_tax,
        hsn_sac, txn_date, status, created_by
      ) values (
        new.branch_id,
        coalesce(new.tenant_id, v_branch.tenant_id),
        new.id, new.invoice_id, new.member_id,
        'sales', 'payment', new.id,
        v_invoice.invoice_number,
        coalesce(v_member.full_name, v_branch.tenant_name, v_branch.name),
        null,
        v_taxable, v_gst_rate, v_gst_type,
        case when v_gst_type = 'intra' then round(v_gst_rate / 2, 2) else 0 end,
        case when v_gst_type = 'intra' then round(v_gst_rate / 2, 2) else 0 end,
        case when v_gst_type = 'inter' then v_gst_rate               else 0 end,
        v_cgst, v_sgst, v_igst, v_gst,
        v_branch.default_hsn_sac,
        v_payment_date, 'posted', new.collected_by
      );
    end if;
  end if;

  return new;
end $$;

-- ──────────────────────────────────────────────────────────────
-- STEP 0: CREATE DEMO BRANCH (if not already there)
-- ──────────────────────────────────────────────────────────────
insert into public.branches (id, name, code, address, city, state, country, phone, status)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'SyncFyre Demo Gym',
  'DEMO',
  '12 MG Road, Nagpur',
  'Nagpur', 'Maharashtra', 'India',
  '9800000000',
  'active'
) on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- STEP 1: CREATE DEMO TENANT (if not already there) and link branch
-- ──────────────────────────────────────────────────────────────
insert into public.tenants (id, name, slug, owner_email, status, plan)
values (
  '22222222-0002-0000-0000-000000000002',
  'SyncFyre Demo Gym',
  'demo-gym',
  'demo@syncfyre.com',
  'active',
  'professional'
) on conflict do nothing;

-- Link the demo branch to the demo tenant (idempotent)
update public.branches
set tenant_id = '22222222-0002-0000-0000-000000000002'
where id = 'aaaaaaaa-0000-0000-0000-000000000001'
  and (tenant_id is null or tenant_id = '22222222-0002-0000-0000-000000000002');

-- ──────────────────────────────────────────────────────────────
-- STEP 2: SAFETY CHECK — demo tenant must NOT be Talwalkar
-- ──────────────────────────────────────────────────────────────
do $$
declare
  v_demo_tenant      uuid := '22222222-0002-0000-0000-000000000002';
  v_talwalkar_tenant uuid := '11111111-0001-0000-0000-000000000001';
  v_demo_branch      uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_talwalkar_branch uuid := '6a2a77a6-5f5b-4816-bfe2-590d61437af8';
  v_actual_tenant    uuid;
begin
  -- Confirm IDs are distinct
  if v_demo_tenant = v_talwalkar_tenant then
    raise exception 'STOP: Demo tenant ID equals Talwalkar tenant ID. Aborting.';
  end if;
  if v_demo_branch = v_talwalkar_branch then
    raise exception 'STOP: Demo branch ID equals Talwalkar branch ID. Aborting.';
  end if;

  -- Confirm the branch is now linked to the demo tenant (not Talwalkar)
  select tenant_id into v_actual_tenant from public.branches where id = v_demo_branch;
  if v_actual_tenant = v_talwalkar_tenant then
    raise exception
      'STOP: Demo branch is linked to Talwalkar tenant (%). Aborting to protect production data.',
      v_talwalkar_tenant;
  end if;

  raise notice 'Safety check PASSED. Demo tenant=%, branch tenant=%', v_demo_tenant, v_actual_tenant;
end $$;

-- ──────────────────────────────────────────────────────────────
-- STEP 3: CAPTURE TALWALKAR BEFORE-COUNTS
-- ──────────────────────────────────────────────────────────────
create temp table if not exists _tw_before (entity text primary key, cnt bigint);

insert into _tw_before (entity, cnt)
select 'members',       count(*) from public.members       where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
union all
select 'subscriptions', count(*) from public.subscriptions where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
union all
select 'payments',      count(*) from public.payments      where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
union all
select 'invoices',      count(*) from public.invoices      where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
union all
select 'attendance',    count(*) from public.attendance    where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
union all
select 'notifications', count(*) from public.notifications where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
on conflict (entity) do update set cnt = excluded.cnt;

-- ──────────────────────────────────────────────────────────────
-- STEP 4: BACKFILL tenant_id on existing demo data
-- (demo-seed.sql was written before multi-tenancy migration)
-- ──────────────────────────────────────────────────────────────
update public.members          set tenant_id = '22222222-0002-0000-0000-000000000002' where branch_id = 'aaaaaaaa-0000-0000-0000-000000000001' and tenant_id is null;
update public.membership_plans set tenant_id = '22222222-0002-0000-0000-000000000002' where branch_id = 'aaaaaaaa-0000-0000-0000-000000000001' and tenant_id is null;
update public.subscriptions    set tenant_id = '22222222-0002-0000-0000-000000000002' where branch_id = 'aaaaaaaa-0000-0000-0000-000000000001' and tenant_id is null;
update public.invoices         set tenant_id = '22222222-0002-0000-0000-000000000002' where branch_id = 'aaaaaaaa-0000-0000-0000-000000000001' and tenant_id is null;
update public.payments         set tenant_id = '22222222-0002-0000-0000-000000000002' where branch_id = 'aaaaaaaa-0000-0000-0000-000000000001' and tenant_id is null;
update public.attendance       set tenant_id = '22222222-0002-0000-0000-000000000002' where branch_id = 'aaaaaaaa-0000-0000-0000-000000000001' and tenant_id is null;
update public.notifications    set tenant_id = '22222222-0002-0000-0000-000000000002' where branch_id = 'aaaaaaaa-0000-0000-0000-000000000001' and tenant_id is null;
update public.receivables      set tenant_id = '22222222-0002-0000-0000-000000000002' where branch_id = 'aaaaaaaa-0000-0000-0000-000000000001' and tenant_id is null;

-- ──────────────────────────────────────────────────────────────
-- STEP 5: MEMBERSHIP PLANS
-- Uses fixed bbbbbbbb-* IDs matching demo-seed.sql. Idempotent.
-- ──────────────────────────────────────────────────────────────
insert into public.membership_plans
  (id, branch_id, tenant_id, name, price, gst_percent, discount_percent, duration_months, features, status)
values
  ('bbbbbbbb-0001-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','Day Pass',300,18,0,1,'["Single day access"]','active'),
  ('bbbbbbbb-0002-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','Weekly',1000,18,0,1,'["7 days access"]','active'),
  ('bbbbbbbb-0003-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','1 Month',3000,18,0,1,'["Gym access","Locker"]','active'),
  ('bbbbbbbb-0004-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','3 Months',7500,18,0,3,'["Gym access","Locker","Assessment"]','active'),
  ('bbbbbbbb-0005-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','6 Months',11000,18,0,6,'["Gym access","Locker","Assessment","Diet consult"]','active'),
  ('bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','12 Months',15000,18,0,12,'["Gym access","Locker","Assessment","Diet consult","InBody scan"]','active'),
  ('bbbbbbbb-0007-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','Personal Training – 1 Month',7000,18,0,1,'["PT sessions","Custom workout plan"]','active'),
  ('bbbbbbbb-0008-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','Personal Training – 3 Months',18000,18,0,3,'["PT sessions","Custom workout plan","Progress tracking"]','active'),
  ('bbbbbbbb-0009-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','Couple Package – 12 Months',25000,18,0,12,'["2 members","Gym access","Locker"]','active'),
  ('bbbbbbbb-0010-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','10 Month',12000,18,0,10,'["Gym access","Locker","Assessment"]','inactive')
on conflict (id) do update
  set tenant_id = excluded.tenant_id
  where public.membership_plans.tenant_id is null;

-- ──────────────────────────────────────────────────────────────
-- STEP 6: DEMO MEMBERS  (28 members, all DEMO-xxxx codes)
-- IDs use f0f0f0f0-00xx prefix — no conflict with demo-seed.sql.
-- ──────────────────────────────────────────────────────────────
insert into public.members
  (id, branch_id, tenant_id, member_code, full_name, gender, phone, date_of_birth, status, created_at)
values
  -- Active, healthy
  ('f0f0f0f0-0001-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0001','Aakash Mehta',     'male',  '9800000001','1992-03-15','active','2026-03-01'),
  ('f0f0f0f0-0002-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0002','Priya Sharma',     'female','9800000002','1995-07-22','active','2026-02-15'),
  ('f0f0f0f0-0003-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0003','Rahul Desai',      'male',  '9800000003','1988-11-30','active','2026-01-10'),
  ('f0f0f0f0-0004-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0004','Sneha Kulkarni',   'female','9800000004','1998-04-05','active','2026-04-01'),
  ('f0f0f0f0-0005-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0005','Vikram Singh',     'male',  '9800000005','1985-09-18','active','2025-09-22'),
  -- Expiring TODAY (subscription end_date = current_date)
  ('f0f0f0f0-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0006','Neha Joshi',       'female','9800000006','1993-12-01','active','2026-08-22'),
  ('f0f0f0f0-0007-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0007','Karan Malhotra',   'male',  '9800000007','1991-06-14','active','2026-08-22'),
  -- Expiring in 7 days
  ('f0f0f0f0-0008-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0008','Anita Verma',      'female','9800000008','1996-02-28','active','2026-08-25'),
  ('f0f0f0f0-0009-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0009','Suresh Patil',     'male',  '9800000009','1987-08-10','active','2026-06-28'),
  -- Expiring in 30 days
  ('f0f0f0f0-0010-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0010','Pooja Nair',       'female','9800000010','1994-05-16','active','2026-07-22'),
  ('f0f0f0f0-0011-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0011','Amit Gupta',       'male',  '9800000011','1990-01-25','active','2026-09-01'),
  -- Already expired (subscription end_date in the past)
  ('f0f0f0f0-0012-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0012','Deepika Reddy',    'female','9800000012','1997-09-03','active','2026-08-01'),
  ('f0f0f0f0-0013-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0013','Rajesh Kumar',     'male',  '9800000013','1983-03-20','active','2026-07-15'),
  -- Pending balance
  ('f0f0f0f0-0014-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0014','Anjali Bhatt',     'female','9800000014','1999-11-11','active','2026-07-01'),
  ('f0f0f0f0-0015-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0015','Mohit Jain',       'male',  '9800000015','1989-04-07','active','2026-07-05'),
  -- Recently renewed
  ('f0f0f0f0-0016-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0016','Sunita Yadav',     'female','9800000016','1992-07-30','active','2025-09-01'),
  ('f0f0f0f0-0017-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0017','Gaurav Tiwari',    'male',  '9800000017','1986-10-12','active','2025-09-15'),
  -- Newly registered (this month)
  ('f0f0f0f0-0018-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0018','Riya Kapoor',      'female','9800000018','2001-03-08','active','2026-09-01'),
  ('f0f0f0f0-0019-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0019','Arjun Pandey',     'male',  '9800000019','2000-12-25','active','2026-09-10'),
  -- Inactive / deactivated
  ('f0f0f0f0-0020-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0020','Kavya Menon',      'female','9800000020','1994-08-19','inactive','2026-01-20'),
  ('f0f0f0f0-0021-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0021','Nitin Sharma',     'male',  '9800000021','1988-05-02','inactive','2026-02-28'),
  -- No subscription yet (just registered)
  ('f0f0f0f0-0022-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0022','Meera Iyer',       'female','9800000022','1995-11-17','active','2026-09-18'),
  -- Paused/frozen
  ('f0f0f0f0-0023-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0023','Siddharth Shah',   'male',  '9800000023','1991-02-14','active','2026-03-15'),
  -- Long-standing (joined 2024)
  ('f0f0f0f0-0024-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0024','Lakshmi Pillai',   'female','9800000024','1982-06-28','active','2024-12-01'),
  -- Students
  ('f0f0f0f0-0025-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0025','Dev Chopra',       'male',  '9800000025','2003-01-15','active','2026-09-01'),
  ('f0f0f0f0-0026-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0026','Shreya Agarwal',   'female','9800000026','2002-07-04','active','2026-09-05'),
  -- Senior
  ('f0f0f0f0-0027-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0027','Ramesh Bhatia',    'male',  '9800000027','1958-04-22','active','2026-05-10'),
  -- Couple partner
  ('f0f0f0f0-0028-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','DEMO-0028','Kavita Bhatia',    'female','9800000028','1963-09-14','active','2026-05-10')
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- STEP 7: SUBSCRIPTIONS
-- IDs use a1a1a1a1-00xx prefix. end_date uses current_date arithmetic
-- so expiry states remain correct whenever the script is run.
-- ──────────────────────────────────────────────────────────────
insert into public.subscriptions
  (id, member_id, branch_id, tenant_id, plan_id,
   start_date, end_date, status,
   price, discount_amount, gst_amount, total_amount, auto_renew)
values
  -- Active healthy (ends ~3 months from now)
  ('a1a1a1a1-0001-0000-0000-000000000001','f0f0f0f0-0001-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0004-0000-0000-000000000001',
   current_date - 30, current_date + 60, 'active', 7500,0,1350,8850,true),
  ('a1a1a1a1-0002-0000-0000-000000000001','f0f0f0f0-0002-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0006-0000-0000-000000000001',
   current_date - 60, current_date + 305, 'active', 15000,0,2700,17700,true),
  ('a1a1a1a1-0003-0000-0000-000000000001','f0f0f0f0-0003-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0005-0000-0000-000000000001',
   current_date - 45, current_date + 135, 'active', 11000,0,1980,12980,false),
  ('a1a1a1a1-0004-0000-0000-000000000001','f0f0f0f0-0004-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0004-0000-0000-000000000001',
   current_date - 15, current_date + 75, 'active', 7500,0,1350,8850,true),
  ('a1a1a1a1-0005-0000-0000-000000000001','f0f0f0f0-0005-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0006-0000-0000-000000000001',
   current_date - 365, current_date, 'active', 15000,0,2700,17700,true),
  -- Expiring TODAY (end_date = current_date)
  ('a1a1a1a1-0006-0000-0000-000000000001','f0f0f0f0-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0003-0000-0000-000000000001',
   current_date - 31, current_date, 'active', 3000,0,540,3540,false),
  ('a1a1a1a1-0007-0000-0000-000000000001','f0f0f0f0-0007-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0003-0000-0000-000000000001',
   current_date - 31, current_date, 'active', 3000,0,540,3540,false),
  -- Expiring in 7 days
  ('a1a1a1a1-0008-0000-0000-000000000001','f0f0f0f0-0008-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0003-0000-0000-000000000001',
   current_date - 24, current_date + 7, 'active', 3000,0,540,3540,false),
  ('a1a1a1a1-0009-0000-0000-000000000001','f0f0f0f0-0009-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0004-0000-0000-000000000001',
   current_date - 83, current_date + 7, 'active', 7500,0,1350,8850,false),
  -- Expiring in 30 days
  ('a1a1a1a1-0010-0000-0000-000000000001','f0f0f0f0-0010-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0004-0000-0000-000000000001',
   current_date - 60, current_date + 30, 'active', 7500,0,1350,8850,true),
  ('a1a1a1a1-0011-0000-0000-000000000001','f0f0f0f0-0011-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0003-0000-0000-000000000001',
   current_date - 1,  current_date + 30, 'active', 3000,0,540,3540,false),
  -- Expired (end_date in the past, status kept 'active' — mirrors real app behavior)
  ('a1a1a1a1-0012-0000-0000-000000000001','f0f0f0f0-0012-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0003-0000-0000-000000000001',
   current_date - 52, current_date - 21, 'active', 3000,0,540,3540,false),
  ('a1a1a1a1-0013-0000-0000-000000000001','f0f0f0f0-0013-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0004-0000-0000-000000000001',
   current_date - 98, current_date - 7,  'active', 7500,0,1350,8850,false),
  -- Pending balance (active, not fully paid)
  ('a1a1a1a1-0014-0000-0000-000000000001','f0f0f0f0-0014-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0005-0000-0000-000000000001',
   current_date - 83, current_date + 97, 'active', 11000,0,1980,12980,false),
  ('a1a1a1a1-0015-0000-0000-000000000001','f0f0f0f0-0015-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0004-0000-0000-000000000001',
   current_date - 78, current_date + 12, 'active', 7500,0,1350,8850,false),
  -- Recently renewed (new sub)
  ('a1a1a1a1-0016-0000-0000-000000000001','f0f0f0f0-0016-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0006-0000-0000-000000000001',
   current_date - 21, current_date + 344, 'active', 15000,0,2700,17700,true),
  ('a1a1a1a1-0017-0000-0000-000000000001','f0f0f0f0-0017-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0005-0000-0000-000000000001',
   current_date - 7,  current_date + 173, 'active', 11000,0,1980,12980,true),
  -- Newly registered
  ('a1a1a1a1-0018-0000-0000-000000000001','f0f0f0f0-0018-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0003-0000-0000-000000000001',
   current_date, current_date + 31, 'active', 3000,0,540,3540,false),
  ('a1a1a1a1-0019-0000-0000-000000000001','f0f0f0f0-0019-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0003-0000-0000-000000000001',
   current_date, current_date + 31, 'active', 3000,0,540,3540,false),
  -- Inactive members' last subscriptions (expired)
  ('a1a1a1a1-0020-0000-0000-000000000001','f0f0f0f0-0020-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0004-0000-0000-000000000001',
   current_date - 245, current_date - 154, 'active', 7500,0,1350,8850,false),
  ('a1a1a1a1-0021-0000-0000-000000000001','f0f0f0f0-0021-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0003-0000-0000-000000000001',
   current_date - 207, current_date - 176, 'active', 3000,0,540,3540,false),
  -- Paused
  ('a1a1a1a1-0023-0000-0000-000000000001','f0f0f0f0-0023-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0005-0000-0000-000000000001',
   current_date - 190, current_date + 5, 'paused', 11000,0,1980,12980,false),
  -- Long-standing
  ('a1a1a1a1-0024-0000-0000-000000000001','f0f0f0f0-0024-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0006-0000-0000-000000000001',
   current_date - 295, current_date + 70, 'active', 15000,0,2700,17700,true),
  -- Students
  ('a1a1a1a1-0025-0000-0000-000000000001','f0f0f0f0-0025-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0003-0000-0000-000000000001',
   current_date, current_date + 31, 'active', 3000,0,540,3540,false),
  ('a1a1a1a1-0026-0000-0000-000000000001','f0f0f0f0-0026-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0003-0000-0000-000000000001',
   current_date, current_date + 31, 'active', 3000,0,540,3540,false),
  -- Senior
  ('a1a1a1a1-0027-0000-0000-000000000001','f0f0f0f0-0027-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0005-0000-0000-000000000001',
   current_date - 135, current_date + 45, 'active', 11000,0,1980,12980,true),
  -- Couple
  ('a1a1a1a1-0028-0000-0000-000000000001','f0f0f0f0-0028-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002','bbbbbbbb-0009-0000-0000-000000000001',
   current_date - 135, current_date + 230, 'active', 25000,0,4500,29500,true)
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- STEP 8: INVOICES  (IDs use b2b2b2b2-00xx prefix)
-- taxable_amount = subtotal (pre-GST base) is required because
-- the auto_income_from_payment() trigger reads taxable_amount to
-- compute the income row amount — if it's 0 (the column default)
-- the trigger inserts amount=0 which violates income_amount_check.
-- ──────────────────────────────────────────────────────────────
insert into public.invoices
  (id, member_id, subscription_id, branch_id, tenant_id,
   subtotal, taxable_amount, gst_rate, gst_type,
   discount_amount, gst_amount, total_amount,
   amount_paid, balance_amount, status, payment_status, due_date, line_items)
values
  ('b2b2b2b2-0001-0000-0000-000000000001','f0f0f0f0-0001-0000-0000-000000000001','a1a1a1a1-0001-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 7500, 7500,18,'intra',0,1350, 8850, 8850,0,   'paid',   'completed',current_date-30,'[{"description":"3 Months Gym","amount":8850}]'),
  ('b2b2b2b2-0002-0000-0000-000000000001','f0f0f0f0-0002-0000-0000-000000000001','a1a1a1a1-0002-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002',15000,15000,18,'intra',0,2700,17700,17700,0,   'paid',   'completed',current_date-60,'[{"description":"12 Months Gym","amount":17700}]'),
  ('b2b2b2b2-0003-0000-0000-000000000001','f0f0f0f0-0003-0000-0000-000000000001','a1a1a1a1-0003-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002',11000,11000,18,'intra',0,1980,12980,12980,0,   'paid',   'completed',current_date-45,'[{"description":"6 Months Gym","amount":12980}]'),
  ('b2b2b2b2-0004-0000-0000-000000000001','f0f0f0f0-0004-0000-0000-000000000001','a1a1a1a1-0004-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 7500, 7500,18,'intra',0,1350, 8850, 8850,0,   'paid',   'completed',current_date-15,'[{"description":"3 Months Gym","amount":8850}]'),
  ('b2b2b2b2-0005-0000-0000-000000000001','f0f0f0f0-0005-0000-0000-000000000001','a1a1a1a1-0005-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002',15000,15000,18,'intra',0,2700,17700,17700,0,   'paid',   'completed',current_date-365,'[{"description":"12 Months Gym","amount":17700}]'),
  ('b2b2b2b2-0006-0000-0000-000000000001','f0f0f0f0-0006-0000-0000-000000000001','a1a1a1a1-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3000, 3000,18,'intra',0, 540, 3540, 3540,0,   'paid',   'completed',current_date-31,'[{"description":"1 Month Gym","amount":3540}]'),
  ('b2b2b2b2-0007-0000-0000-000000000001','f0f0f0f0-0007-0000-0000-000000000001','a1a1a1a1-0007-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3000, 3000,18,'intra',0, 540, 3540, 3540,0,   'paid',   'completed',current_date-31,'[{"description":"1 Month Gym","amount":3540}]'),
  ('b2b2b2b2-0008-0000-0000-000000000001','f0f0f0f0-0008-0000-0000-000000000001','a1a1a1a1-0008-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3000, 3000,18,'intra',0, 540, 3540, 3540,0,   'paid',   'completed',current_date-24,'[{"description":"1 Month Gym","amount":3540}]'),
  ('b2b2b2b2-0009-0000-0000-000000000001','f0f0f0f0-0009-0000-0000-000000000001','a1a1a1a1-0009-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 7500, 7500,18,'intra',0,1350, 8850, 8850,0,   'paid',   'completed',current_date-83,'[{"description":"3 Months Gym","amount":8850}]'),
  ('b2b2b2b2-0010-0000-0000-000000000001','f0f0f0f0-0010-0000-0000-000000000001','a1a1a1a1-0010-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 7500, 7500,18,'intra',0,1350, 8850, 8850,0,   'paid',   'completed',current_date-60,'[{"description":"3 Months Gym","amount":8850}]'),
  ('b2b2b2b2-0011-0000-0000-000000000001','f0f0f0f0-0011-0000-0000-000000000001','a1a1a1a1-0011-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3000, 3000,18,'intra',0, 540, 3540, 3540,0,   'paid',   'completed',current_date-1, '[{"description":"1 Month Gym","amount":3540}]'),
  ('b2b2b2b2-0012-0000-0000-000000000001','f0f0f0f0-0012-0000-0000-000000000001','a1a1a1a1-0012-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3000, 3000,18,'intra',0, 540, 3540, 3540,0,   'paid',   'completed',current_date-52,'[{"description":"1 Month Gym","amount":3540}]'),
  ('b2b2b2b2-0013-0000-0000-000000000001','f0f0f0f0-0013-0000-0000-000000000001','a1a1a1a1-0013-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 7500, 7500,18,'intra',0,1350, 8850, 8850,0,   'paid',   'completed',current_date-98,'[{"description":"3 Months Gym","amount":8850}]'),
  -- Partial payments (pending balance)
  ('b2b2b2b2-0014-0000-0000-000000000001','f0f0f0f0-0014-0000-0000-000000000001','a1a1a1a1-0014-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002',11000,11000,18,'intra',0,1980,12980, 5000,7980,'partial','partial',  current_date-83,'[{"description":"6 Months Gym","amount":12980}]'),
  ('b2b2b2b2-0015-0000-0000-000000000001','f0f0f0f0-0015-0000-0000-000000000001','a1a1a1a1-0015-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 7500, 7500,18,'intra',0,1350, 8850, 4000,4850,'partial','partial',  current_date-78,'[{"description":"3 Months Gym","amount":8850}]'),
  -- Recently renewed
  ('b2b2b2b2-0016-0000-0000-000000000001','f0f0f0f0-0016-0000-0000-000000000001','a1a1a1a1-0016-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002',15000,15000,18,'intra',0,2700,17700,17700,0,   'paid',   'completed',current_date-21,'[{"description":"12 Months Gym","amount":17700}]'),
  ('b2b2b2b2-0017-0000-0000-000000000001','f0f0f0f0-0017-0000-0000-000000000001','a1a1a1a1-0017-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002',11000,11000,18,'intra',0,1980,12980,12980,0,   'paid',   'completed',current_date-7, '[{"description":"6 Months Gym","amount":12980}]'),
  -- New members today
  ('b2b2b2b2-0018-0000-0000-000000000001','f0f0f0f0-0018-0000-0000-000000000001','a1a1a1a1-0018-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3000, 3000,18,'intra',0, 540, 3540, 3540,0,   'paid',   'completed',current_date,  '[{"description":"1 Month Gym","amount":3540}]'),
  ('b2b2b2b2-0019-0000-0000-000000000001','f0f0f0f0-0019-0000-0000-000000000001','a1a1a1a1-0019-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3000, 3000,18,'intra',0, 540, 3540, 3540,0,   'paid',   'completed',current_date,  '[{"description":"1 Month Gym","amount":3540}]'),
  ('b2b2b2b2-0025-0000-0000-000000000001','f0f0f0f0-0025-0000-0000-000000000001','a1a1a1a1-0025-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3000, 3000,18,'intra',0, 540, 3540, 3540,0,   'paid',   'completed',current_date,  '[{"description":"1 Month Gym","amount":3540}]'),
  ('b2b2b2b2-0026-0000-0000-000000000001','f0f0f0f0-0026-0000-0000-000000000001','a1a1a1a1-0026-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3000, 3000,18,'intra',0, 540, 3540, 3540,0,   'paid',   'completed',current_date,  '[{"description":"1 Month Gym","amount":3540}]'),
  ('b2b2b2b2-0027-0000-0000-000000000001','f0f0f0f0-0027-0000-0000-000000000001','a1a1a1a1-0027-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002',11000,11000,18,'intra',0,1980,12980,12980,0,   'paid',   'completed',current_date-135,'[{"description":"6 Months Gym","amount":12980}]'),
  ('b2b2b2b2-0028-0000-0000-000000000001','f0f0f0f0-0028-0000-0000-000000000001','a1a1a1a1-0028-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002',25000,25000,18,'intra',0,4500,29500,29500,0,   'paid',   'completed',current_date-135,'[{"description":"Couple 12 Months","amount":29500}]')
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- STEP 9: PAYMENTS  (IDs use c3c3c3c3-00xx prefix)
-- ──────────────────────────────────────────────────────────────
insert into public.payments
  (id, invoice_id, member_id, branch_id, tenant_id,
   amount, method, status, paid_at, refund_amount)
values
  ('c3c3c3c3-0001-0000-0000-000000000001','b2b2b2b2-0001-0000-0000-000000000001','f0f0f0f0-0001-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 8850,'cash',  'completed',now()-interval '30 days',0),
  ('c3c3c3c3-0002-0000-0000-000000000001','b2b2b2b2-0002-0000-0000-000000000001','f0f0f0f0-0002-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002',17700,'upi',   'completed',now()-interval '60 days',0),
  ('c3c3c3c3-0003-0000-0000-000000000001','b2b2b2b2-0003-0000-0000-000000000001','f0f0f0f0-0003-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002',12980,'card', 'completed',now()-interval '45 days',0),
  ('c3c3c3c3-0004-0000-0000-000000000001','b2b2b2b2-0004-0000-0000-000000000001','f0f0f0f0-0004-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 8850,'cash', 'completed',now()-interval '15 days',0),
  ('c3c3c3c3-0005-0000-0000-000000000001','b2b2b2b2-0005-0000-0000-000000000001','f0f0f0f0-0005-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002',17700,'upi',  'completed',now()-interval '365 days',0),
  ('c3c3c3c3-0006-0000-0000-000000000001','b2b2b2b2-0006-0000-0000-000000000001','f0f0f0f0-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3540,'cash', 'completed',now()-interval '31 days',0),
  ('c3c3c3c3-0007-0000-0000-000000000001','b2b2b2b2-0007-0000-0000-000000000001','f0f0f0f0-0007-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3540,'upi',  'completed',now()-interval '31 days',0),
  ('c3c3c3c3-0008-0000-0000-000000000001','b2b2b2b2-0008-0000-0000-000000000001','f0f0f0f0-0008-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3540,'cash', 'completed',now()-interval '24 days',0),
  ('c3c3c3c3-0009-0000-0000-000000000001','b2b2b2b2-0009-0000-0000-000000000001','f0f0f0f0-0009-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 8850,'card', 'completed',now()-interval '83 days',0),
  ('c3c3c3c3-0010-0000-0000-000000000001','b2b2b2b2-0010-0000-0000-000000000001','f0f0f0f0-0010-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 8850,'upi',  'completed',now()-interval '60 days',0),
  ('c3c3c3c3-0011-0000-0000-000000000001','b2b2b2b2-0011-0000-0000-000000000001','f0f0f0f0-0011-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3540,'cash', 'completed',now()-interval '1 day',0),
  ('c3c3c3c3-0012-0000-0000-000000000001','b2b2b2b2-0012-0000-0000-000000000001','f0f0f0f0-0012-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3540,'cash', 'completed',now()-interval '52 days',0),
  ('c3c3c3c3-0013-0000-0000-000000000001','b2b2b2b2-0013-0000-0000-000000000001','f0f0f0f0-0013-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 8850,'upi',  'completed',now()-interval '98 days',0),
  -- Partial payments for pending-balance members
  ('c3c3c3c3-0014-0000-0000-000000000001','b2b2b2b2-0014-0000-0000-000000000001','f0f0f0f0-0014-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 5000,'cash', 'completed',now()-interval '83 days',0),
  ('c3c3c3c3-0015-0000-0000-000000000001','b2b2b2b2-0015-0000-0000-000000000001','f0f0f0f0-0015-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 4000,'upi',  'completed',now()-interval '78 days',0),
  -- Recently renewed
  ('c3c3c3c3-0016-0000-0000-000000000001','b2b2b2b2-0016-0000-0000-000000000001','f0f0f0f0-0016-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002',17700,'card', 'completed',now()-interval '21 days',0),
  ('c3c3c3c3-0017-0000-0000-000000000001','b2b2b2b2-0017-0000-0000-000000000001','f0f0f0f0-0017-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002',12980,'upi',  'completed',now()-interval '7 days',0),
  -- New today
  ('c3c3c3c3-0018-0000-0000-000000000001','b2b2b2b2-0018-0000-0000-000000000001','f0f0f0f0-0018-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3540,'cash', 'completed',now(),0),
  ('c3c3c3c3-0019-0000-0000-000000000001','b2b2b2b2-0019-0000-0000-000000000001','f0f0f0f0-0019-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3540,'online','completed',now(),0),
  ('c3c3c3c3-0025-0000-0000-000000000001','b2b2b2b2-0025-0000-0000-000000000001','f0f0f0f0-0025-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3540,'upi',  'completed',now(),0),
  ('c3c3c3c3-0026-0000-0000-000000000001','b2b2b2b2-0026-0000-0000-000000000001','f0f0f0f0-0026-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002', 3540,'cash', 'completed',now(),0),
  ('c3c3c3c3-0027-0000-0000-000000000001','b2b2b2b2-0027-0000-0000-000000000001','f0f0f0f0-0027-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002',12980,'cash', 'completed',now()-interval '135 days',0),
  ('c3c3c3c3-0028-0000-0000-000000000001','b2b2b2b2-0028-0000-0000-000000000001','f0f0f0f0-0028-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002',29500,'upi',  'completed',now()-interval '135 days',0)
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- STEP 10: RECEIVABLES  (IDs use d4d4d4d4-00xx prefix)
-- The receivables table has a unique constraint on invoice_id
-- (one receivable per invoice). Use ON CONFLICT on invoice_id
-- so re-runs are idempotent even if the id row already exists.
-- ──────────────────────────────────────────────────────────────
insert into public.receivables
  (id, branch_id, tenant_id, member_id, invoice_id,
   receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
values
  ('d4d4d4d4-0014-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002',
   'f0f0f0f0-0014-0000-0000-000000000001','b2b2b2b2-0014-0000-0000-000000000001',
   'membership',12980,5000,7980,current_date+97,'partial'),
  ('d4d4d4d4-0015-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','22222222-0002-0000-0000-000000000002',
   'f0f0f0f0-0015-0000-0000-000000000001','b2b2b2b2-0015-0000-0000-000000000001',
   'membership',8850,4000,4850,current_date+12,'partial')
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- STEP 11: ATTENDANCE
-- ──────────────────────────────────────────────────────────────

-- Today
insert into public.attendance (member_id, branch_id, tenant_id, attendance_date, entry_time, source, device_id)
select
  m.id,
  'aaaaaaaa-0000-0000-0000-000000000001',
  '22222222-0002-0000-0000-000000000002',
  current_date,
  now() - (random() * interval '3 hours'),
  'manual_dashboard', 'manual-dashboard'
from public.members m
where m.branch_id = 'aaaaaaaa-0000-0000-0000-000000000001'
  and m.id in (
    'f0f0f0f0-0001-0000-0000-000000000001',
    'f0f0f0f0-0002-0000-0000-000000000001',
    'f0f0f0f0-0003-0000-0000-000000000001',
    'f0f0f0f0-0004-0000-0000-000000000001',
    'f0f0f0f0-0006-0000-0000-000000000001',
    'f0f0f0f0-0008-0000-0000-000000000001',
    'f0f0f0f0-0010-0000-0000-000000000001',
    'f0f0f0f0-0018-0000-0000-000000000001',
    'f0f0f0f0-0019-0000-0000-000000000001',
    'f0f0f0f0-0024-0000-0000-000000000001',
    'f0f0f0f0-0025-0000-0000-000000000001',
    'f0f0f0f0-0027-0000-0000-000000000001'
  )
on conflict do nothing;

-- Past 28 days for core active members (Mon–Sat, ~80% attendance)
insert into public.attendance (member_id, branch_id, tenant_id, attendance_date, entry_time, source, device_id)
select
  m.id,
  'aaaaaaaa-0000-0000-0000-000000000001',
  '22222222-0002-0000-0000-000000000002',
  d.day_date,
  (d.day_date + interval '7 hours' + (random() * interval '2 hours'))::timestamptz,
  'manual_dashboard', 'manual-dashboard'
from generate_series(current_date - 28, current_date - 1, '1 day'::interval) as d(day_date)
cross join (
  select id from public.members
  where branch_id = 'aaaaaaaa-0000-0000-0000-000000000001'
    and id in (
      'f0f0f0f0-0001-0000-0000-000000000001',
      'f0f0f0f0-0002-0000-0000-000000000001',
      'f0f0f0f0-0003-0000-0000-000000000001',
      'f0f0f0f0-0004-0000-0000-000000000001',
      'f0f0f0f0-0005-0000-0000-000000000001',
      'f0f0f0f0-0024-0000-0000-000000000001',
      'f0f0f0f0-0027-0000-0000-000000000001'
    )
) as m
where extract(dow from d.day_date) between 1 and 6
  and (hashtext(m.id::text || d.day_date::text) % 5) != 0
on conflict do nothing;

-- Sporadic attendance last 14 days for other active members
insert into public.attendance (member_id, branch_id, tenant_id, attendance_date, entry_time, source, device_id)
select
  m.id,
  'aaaaaaaa-0000-0000-0000-000000000001',
  '22222222-0002-0000-0000-000000000002',
  d.day_date,
  (d.day_date + interval '8 hours' + (random() * interval '1 hour'))::timestamptz,
  'manual_dashboard', 'manual-dashboard'
from generate_series(current_date - 14, current_date - 1, '1 day'::interval) as d(day_date)
cross join (
  select id from public.members
  where branch_id = 'aaaaaaaa-0000-0000-0000-000000000001'
    and id in (
      'f0f0f0f0-0008-0000-0000-000000000001',
      'f0f0f0f0-0010-0000-0000-000000000001',
      'f0f0f0f0-0011-0000-0000-000000000001',
      'f0f0f0f0-0016-0000-0000-000000000001',
      'f0f0f0f0-0017-0000-0000-000000000001'
    )
) as m
where extract(dow from d.day_date) between 1 and 6
  and (hashtext(m.id::text || d.day_date::text) % 3) = 0
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- STEP 12: NOTIFICATIONS (direct insert, deduplication-safe)
-- ──────────────────────────────────────────────────────────────
do $$
declare
  v_demo_branch uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_demo_tenant uuid := '22222222-0002-0000-0000-000000000002';
  v_has_fn      boolean;
begin
  select exists(
    select 1 from pg_proc
    where proname = 'queue_business_notification'
      and pronamespace = 'public'::regnamespace
  ) into v_has_fn;

  if v_has_fn then
    perform public.queue_business_notification(v_demo_branch,v_demo_tenant,null,
      'f0f0f0f0-0006-0000-0000-000000000001'::uuid,'membership_expiry_reminder',
      'Membership expires today',
      'Dear Neha Joshi, your 1 Month membership expires today. Renew now.',
      'subscription','a1a1a1a1-0006-0000-0000-000000000001'::uuid,
      array['admin','manager','reception'],
      'demo:expiry:f0f0f0f0-0006:today','{"remaining_days":0}'::jsonb);
    perform public.queue_business_notification(v_demo_branch,v_demo_tenant,null,
      'f0f0f0f0-0007-0000-0000-000000000001'::uuid,'membership_expiry_reminder',
      'Membership expires today',
      'Dear Karan Malhotra, your 1 Month membership expires today.',
      'subscription','a1a1a1a1-0007-0000-0000-000000000001'::uuid,
      array['admin','manager','reception'],
      'demo:expiry:f0f0f0f0-0007:today','{"remaining_days":0}'::jsonb);
    perform public.queue_business_notification(v_demo_branch,v_demo_tenant,null,
      'f0f0f0f0-0008-0000-0000-000000000001'::uuid,'membership_expiry_reminder',
      'Membership expires in 7 days',
      'Dear Anita Verma, your membership expires in 7 days.',
      'subscription','a1a1a1a1-0008-0000-0000-000000000001'::uuid,
      array['admin','manager','reception'],
      'demo:expiry:f0f0f0f0-0008:7d','{"remaining_days":7}'::jsonb);
    perform public.queue_business_notification(v_demo_branch,v_demo_tenant,null,
      'f0f0f0f0-0014-0000-0000-000000000001'::uuid,'pending_balance',
      'Pending balance: ₹7,980',
      'Dear Anjali Bhatt, you have a pending balance of ₹7,980.',
      'invoice','b2b2b2b2-0014-0000-0000-000000000001'::uuid,
      array['admin','manager','reception'],
      'demo:balance:f0f0f0f0-0014','{"balance":7980}'::jsonb);
    perform public.queue_business_notification(v_demo_branch,v_demo_tenant,null,
      'f0f0f0f0-0015-0000-0000-000000000001'::uuid,'pending_balance',
      'Pending balance: ₹4,850',
      'Dear Mohit Jain, you have a pending balance of ₹4,850.',
      'invoice','b2b2b2b2-0015-0000-0000-000000000001'::uuid,
      array['admin','manager','reception'],
      'demo:balance:f0f0f0f0-0015','{"balance":4850}'::jsonb);
    raise notice 'Notifications queued via queue_business_notification().';
  else
    insert into public.notifications
      (branch_id,tenant_id,member_id,notification_type,title,message,target_roles,metadata)
    values
      (v_demo_branch,v_demo_tenant,'f0f0f0f0-0006-0000-0000-000000000001','membership_expiry_reminder',
       'Membership expires today','Dear Neha Joshi, your 1 Month membership expires today.',
       array['admin','manager','reception'],'{"remaining_days":0}'::jsonb),
      (v_demo_branch,v_demo_tenant,'f0f0f0f0-0007-0000-0000-000000000001','membership_expiry_reminder',
       'Membership expires today','Dear Karan Malhotra, your 1 Month membership expires today.',
       array['admin','manager','reception'],'{"remaining_days":0}'::jsonb),
      (v_demo_branch,v_demo_tenant,'f0f0f0f0-0008-0000-0000-000000000001','membership_expiry_reminder',
       'Membership expires in 7 days','Dear Anita Verma, your membership expires in 7 days.',
       array['admin','manager','reception'],'{"remaining_days":7}'::jsonb),
      (v_demo_branch,v_demo_tenant,'f0f0f0f0-0014-0000-0000-000000000001','pending_balance',
       'Pending balance: ₹7,980','Dear Anjali Bhatt, pending balance ₹7,980.',
       array['admin','manager','reception'],'{"balance":7980}'::jsonb),
      (v_demo_branch,v_demo_tenant,'f0f0f0f0-0015-0000-0000-000000000001','pending_balance',
       'Pending balance: ₹4,850','Dear Mohit Jain, pending balance ₹4,850.',
       array['admin','manager','reception'],'{"balance":4850}'::jsonb)
    on conflict do nothing;
    raise notice 'Notifications inserted directly.';
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────
-- STEP 13: CRM LEADS (only if table exists)
-- ──────────────────────────────────────────────────────────────
do $$
declare
  v_demo_branch uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_demo_tenant uuid := '22222222-0002-0000-0000-000000000002';
begin
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='leads') then
    raise notice 'leads table not found — skipping.';
    return;
  end if;
  insert into public.leads (branch_id,tenant_id,full_name,phone,status,source,notes,created_at)
  values
    (v_demo_branch,v_demo_tenant,'Varun Kapoor',   '9800001001','new',      'walk_in',  'Interested in 6-month plan',now()-interval '3 days'),
    (v_demo_branch,v_demo_tenant,'Sonal Mehta',    '9800001002','contacted','referral', 'Called back, wants to visit',now()-interval '5 days'),
    (v_demo_branch,v_demo_tenant,'Aditya Verma',   '9800001003','interested','instagram','Wants PT package demo',    now()-interval '7 days'),
    (v_demo_branch,v_demo_tenant,'Divya Choudhary','9800001004','trial',    'google',   'Trial booked for tomorrow',now()-interval '1 day'),
    (v_demo_branch,v_demo_tenant,'Rohan Saxena',   '9800001005','converted','walk_in',  'Joined 3-month plan',      now()-interval '10 days'),
    (v_demo_branch,v_demo_tenant,'Tanya Bose',     '9800001006','lost',     'facebook', 'Price concern',            now()-interval '15 days')
  on conflict do nothing;
  raise notice 'CRM leads inserted.';
end $$;

-- ──────────────────────────────────────────────────────────────
-- STEP 14: VERIFY TALWALKAR COUNTS UNCHANGED
-- ──────────────────────────────────────────────────────────────
do $$
declare
  r        record;
  v_before bigint;
  v_after  bigint;
  v_fail   boolean := false;
begin
  for r in select entity from _tw_before order by entity loop
    select cnt into v_before from _tw_before where entity = r.entity;
    execute format('select count(*) from public.%I where branch_id=$1',r.entity)
      using '6a2a77a6-5f5b-4816-bfe2-590d61437af8'::uuid into v_after;
    if v_before != v_after then
      raise warning 'TALWALKAR MISMATCH: % before=% after=%',r.entity,v_before,v_after;
      v_fail := true;
    else
      raise notice 'Talwalkar % OK (%)', r.entity, v_before;
    end if;
  end loop;
  if v_fail then
    raise exception 'CRITICAL: Talwalkar data was modified. Rolling back.';
  end if;
  raise notice '✓ All Talwalkar counts unchanged.';
end $$;

-- ──────────────────────────────────────────────────────────────
-- STEP 15: FINAL REPORT
-- ──────────────────────────────────────────────────────────────
select
  'Demo Gym' as account,
  (select tenant_id  from public.branches where id = 'aaaaaaaa-0000-0000-0000-000000000001') as tenant_id,
  (select count(*)   from public.members          where branch_id='aaaaaaaa-0000-0000-0000-000000000001') as total_members,
  (select count(*)   from public.members          where branch_id='aaaaaaaa-0000-0000-0000-000000000001' and status='active') as active,
  (select count(*)   from public.members          where branch_id='aaaaaaaa-0000-0000-0000-000000000001' and status='inactive') as inactive,
  (select count(*)   from public.subscriptions    where branch_id='aaaaaaaa-0000-0000-0000-000000000001' and end_date=current_date) as expiring_today,
  (select count(*)   from public.subscriptions    where branch_id='aaaaaaaa-0000-0000-0000-000000000001' and end_date between current_date+1 and current_date+7) as expiring_7d,
  (select count(*)   from public.subscriptions    where branch_id='aaaaaaaa-0000-0000-0000-000000000001' and end_date between current_date+1 and current_date+30) as expiring_30d,
  (select count(*)   from public.invoices         where branch_id='aaaaaaaa-0000-0000-0000-000000000001' and balance_amount>0) as pending_balance,
  (select count(*)   from public.payments         where branch_id='aaaaaaaa-0000-0000-0000-000000000001') as payments,
  (select count(*)   from public.attendance       where branch_id='aaaaaaaa-0000-0000-0000-000000000001' and attendance_date=current_date) as today_checkins,
  (select count(*)   from public.notifications    where branch_id='aaaaaaaa-0000-0000-0000-000000000001') as notifications,
  '✓ Talwalkar untouched' as safety;

commit;
