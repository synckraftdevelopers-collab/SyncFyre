-- ================================================================
-- STRICT CLIENT SHEET IMPORT — MEMBERS + SUBSCRIPTIONS + INVOICES
-- ================================================================
begin;

alter table public.members alter column phone drop not null;

-- Wipe all existing data completely
delete from public.receivables;
delete from public.payments;
delete from public.invoices;
delete from public.subscriptions;
delete from public.attendance;
delete from public.members;

-- 1. Insert members
insert into public.members (branch_id, full_name, phone, status, created_at) values
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'nirmala bhoi', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'anjali pawar', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'girish rathi...PT YASH', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'rajeshwari yashwante', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'sujata tidke', NULL, 'active', '2026-07-02'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'zaid khan', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'wajesh mohammad', NULL, 'active', '2026-07-02'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'munindra ingle', NULL, 'active', '2026-07-02'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'koyana', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'piyush lokhande', NULL, 'active', '2026-07-06'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'rahul ingle', NULL, 'active', '2026-07-02'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'janhvi taywade', NULL, 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'dr shrikant', NULL, 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'dr vinay', NULL, 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'dr sanjay', NULL, 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'neelam / atul', NULL, 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'janhvi taywade... PT..', NULL, 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'vidya lahe', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'rizwan shah', NULL, 'active', '2026-07-10'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'karan jayaswal', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'angel jain', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'sahu adhau', NULL, 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'balkrishna adhau', NULL, 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'kunal/neelam wankhade', NULL, 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'aman shyed', NULL, 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'amrut deshmukh', NULL, 'active', '2026-07-26'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'sharukh janwani', NULL, 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'yash hingankar', NULL, 'active', '2026-07-02'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'aman amlani', NULL, 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'mukund gupta', NULL, 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'piyush kumar', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'vrajesh karwa', NULL, 'active', '2026-07-05'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'prashant mandlik', NULL, 'active', '2026-07-04'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'deepak lokhande', NULL, 'active', '2026-07-06'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'vrajesh karwa', NULL, 'active', '2026-07-06'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'abhimanyu bhargav', NULL, 'active', '2026-07-02'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'sharukh janwani', NULL, 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'janhvi taywade', NULL, 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'nandkishor kale', NULL, 'active', '2026-07-07'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'shubham khandelwal', NULL, 'active', '2026-07-06'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'ankush wankhade', NULL, 'active', '2026-07-07'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'pulkantwar shrikant', NULL, 'active', '2026-07-06'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'ankush wankhade', NULL, 'active', '2026-07-07'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'NEHA ladha', NULL, 'active', '2026-07-07'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'deepak lokhande', NULL, 'active', '2026-07-05'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'sonika deshmukh', NULL, 'active', '2026-07-09'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'gauri dahane', NULL, 'active', '2026-07-05'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'gauri dahane', NULL, 'active', '2026-07-05'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'rakhi wankhade', NULL, 'active', '2026-07-10'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'himanshu', NULL, 'active', '2026-07-07'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'sonal gupta', NULL, 'active', '2026-07-07'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'padmashree deshmukh', NULL, 'active', '2026-07-07'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'mohammad kaif', NULL, 'active', '2026-07-09'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'shifa khan', NULL, 'active', '2026-07-09'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'aashna rathi', NULL, 'active', '2026-07-09'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'takshak pays', NULL, 'active', '2026-07-09'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'rakhi wankhade', NULL, 'active', '2026-07-10'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'purvesh nishan', NULL, 'active', '2026-07-11'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'palak wavre', NULL, 'active', '2026-07-13'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'deepak lokhande', NULL, 'active', '2026-07-13'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'burhan jamnagarwala', NULL, 'active', '2026-07-14'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'vaibhav deshmukh', NULL, 'active', '2026-07-14'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'tirthesh singh', NULL, 'active', '2026-07-14'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'ashish sir friend', NULL, 'active', '2026-07-14'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'sarthak sir', NULL, 'active', '2026-07-14'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'dipti/vaishali/anjali', NULL, 'active', '2026-07-14'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'gunjan mandlik', NULL, 'active', '2026-07-30'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'deepak lokhande', NULL, 'active', '2026-07-16'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'anil killekar', NULL, 'active', '2026-07-26'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'aarti bhargav', NULL, 'active', '2026-07-09'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'aditi ingole', NULL, 'active', '2026-07-15'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'pratiksha sawant', NULL, 'active', '2026-07-15'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'rukhaar/ abail', NULL, 'active', '2026-07-17'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'syed moammeer', NULL, 'active', '2026-07-17'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'SAKSHI BAJAJ', NULL, 'active', '2026-07-20'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'nandkishor kale', NULL, 'active', '2026-07-17'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'sakshi bajaj', NULL, 'active', '2026-07-20'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Danish kazi', NULL, 'active', '2026-07-18'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'jaidh khatri', NULL, 'active', '2026-07-18'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'anuradha kapoor', NULL, 'active', '2026-07-18'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'rekha karnewar', NULL, 'active', '2026-07-20'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'ashwini malviya', NULL, 'active', '2026-07-20'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'ashwini mavlya', NULL, 'active', '2026-07-20'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'kinjal armv rathod', NULL, 'active', '2026-07-20'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'aarti bhargawa', NULL, 'active', '2026-07-20'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'pritam hiwase', NULL, 'active', '2026-07-21'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'dhruv daga', NULL, 'active', '2026-07-21'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'arpit mundhada', NULL, 'active', '2026-07-21'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'gaurang gadling', NULL, 'active', '2026-07-21'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'janhvi taywade', NULL, 'active', '2026-07-21'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'ishika awankar', NULL, 'active', '2026-07-21'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'adanan', NULL, 'active', '2026-07-20'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'gaurav pinjani', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'gautam pinjani', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'om dalwani', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'ATHARV PUNDALIKAR', NULL, 'active', '2026-07-31'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'NEHAL KHAN', NULL, 'active', '2026-07-27'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'NANDINI AGRAWAL', NULL, 'active', '2026-07-26'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'PRITAM KUKDE', NULL, 'active', '2026-07-26'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'SAGEETA BACCHAATE. .HARSHAL PT', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'SAGEETA BACCHAATE .', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'sangita bajaj', NULL, 'active', '2026-07-27'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'rajani harish shende', NULL, 'active', '2026-07-22'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'vaishnav shende', NULL, 'active', '2026-07-22'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'owais pathan', NULL, 'active', '2026-07-23'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'aaryash kakraniya', NULL, 'active', '2026-07-27'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'nandeesni', NULL, 'active', '2026-07-27'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'ujwal kade', NULL, 'active', '2026-07-28'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'pritam kukade', NULL, 'active', '2026-07-27'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'shlok panpaliya', NULL, 'active', '2026-07-27'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'shrigopal rathi', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'manish deshmukh', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'seika deshmukh', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'dr parikshit', NULL, 'active', '2026-07-29'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'mujtaba khan', NULL, 'active', '2026-07-29'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'vibha utkhede', NULL, 'active', '2026-07-11'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'member_row_117', NULL, 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'ali', NULL, 'active', '2026-07-31');

-- 2. Insert Subscriptions, Invoices & Payments

do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'nirmala bhoi' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-01'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'anjali pawar' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-01'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'girish rathi...PT YASH' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      15000,
      0,
      0,
      15000,
      '2026-07-01'::timestamptz
    );

    if 15000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 15000, 0, 0, 15000, 15000, 0, 'paid', 'completed', '[{"description":"12m","amount":15000}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 15000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 15000, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 15000, 15000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'rajeshwari yashwante' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-01'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'sujata tidke' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '6 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-02'::date,
      ('2026-07-02'::date + (6 || ' months')::interval)::date,
      case when ('2026-07-02'::date + (6 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      11000,
      0,
      0,
      11000,
      '2026-07-02'::timestamptz
    );

    if 11000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 11000, 0, 0, 11000, 11000, 0, 'paid', 'completed', '[{"description":"6m","amount":11000}]'::jsonb, '2026-07-02')
      returning id into v_invoice_id;

      if 11000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 11000, 'cash', 'completed', '2026-07-02'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 11000, 11000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'zaid khan' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      16000,
      0,
      0,
      16000,
      '2026-07-01'::timestamptz
    );

    if 16000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 16000, 0, 0, 16000, 10000, 6000, 'partial', 'partial', '[{"description":"12m","amount":16000}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 10000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 10000, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 6000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 16000, 10000, 6000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'wajesh mohammad' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-02'::date,
      ('2026-07-02'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-02'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-02'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-02')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-02'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'munindra ingle' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-02'::date,
      ('2026-07-02'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-02'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7500,
      0,
      0,
      7500,
      '2026-07-02'::timestamptz
    );

    if 7500 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 0, 0, 7500, 7500, 0, 'paid', 'completed', '[{"description":"3m","amount":7500}]'::jsonb, '2026-07-02')
      returning id into v_invoice_id;

      if 7500 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 'cash', 'completed', '2026-07-02'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7500, 7500, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'koyana' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7000,
      0,
      0,
      7000,
      '2026-07-01'::timestamptz
    );

    if 7000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7000, 0, 0, 7000, 6000, 1000, 'partial', 'partial', '[{"description":"3m","amount":7000}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 6000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 6000, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 1000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7000, 6000, 1000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'piyush lokhande' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-06'::date,
      ('2026-07-06'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-06'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-06'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-06')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-06'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'rahul ingle' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-02'::date,
      ('2026-07-02'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-02'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-02'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-02')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-02'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'janhvi taywade' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-03'::date,
      ('2026-07-03'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-03'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-03'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-03')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-03'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'dr shrikant' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '6 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-03'::date,
      ('2026-07-03'::date + (6 || ' months')::interval)::date,
      case when ('2026-07-03'::date + (6 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      11000,
      0,
      0,
      11000,
      '2026-07-03'::timestamptz
    );

    if 11000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 11000, 0, 0, 11000, 11000, 0, 'paid', 'completed', '[{"description":"6m","amount":11000}]'::jsonb, '2026-07-03')
      returning id into v_invoice_id;

      if 11000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 11000, 'cash', 'completed', '2026-07-03'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 11000, 11000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'dr vinay' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '6 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-03'::date,
      ('2026-07-03'::date + (6 || ' months')::interval)::date,
      case when ('2026-07-03'::date + (6 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      11000,
      0,
      0,
      11000,
      '2026-07-03'::timestamptz
    );

    if 11000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 11000, 0, 0, 11000, 0, 11000, 'partial', 'partial', '[{"description":"6m","amount":11000}]'::jsonb, '2026-07-03')
      returning id into v_invoice_id;

      if 0 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 0, 'cash', 'completed', '2026-07-03'::timestamptz, 0);
      end if;

      if 11000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 11000, 0, 11000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'dr sanjay' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '6 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-03'::date,
      ('2026-07-03'::date + (6 || ' months')::interval)::date,
      case when ('2026-07-03'::date + (6 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      11000,
      0,
      0,
      11000,
      '2026-07-03'::timestamptz
    );

    if 11000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 11000, 0, 0, 11000, 11000, 0, 'paid', 'completed', '[{"description":"6m","amount":11000}]'::jsonb, '2026-07-03')
      returning id into v_invoice_id;

      if 11000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 11000, 'cash', 'completed', '2026-07-03'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 11000, 11000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'neelam / atul' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '2 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-03'::date,
      ('2026-07-03'::date + (2 || ' months')::interval)::date,
      case when ('2026-07-03'::date + (2 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      0,
      0,
      0,
      0,
      '2026-07-03'::timestamptz
    );

    if 0 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 0, 0, 0, 0, 0, 0, 'paid', 'completed', '[{"description":"2m","amount":0}]'::jsonb, '2026-07-03')
      returning id into v_invoice_id;

      if 0 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 0, 'cash', 'completed', '2026-07-03'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 0, 0, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'janhvi taywade... PT..' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-03'::date,
      ('2026-07-03'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-03'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      4500,
      0,
      0,
      4500,
      '2026-07-03'::timestamptz
    );

    if 4500 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4500, 0, 0, 4500, 4500, 0, 'paid', 'completed', '[{"description":"1m pt","amount":4500}]'::jsonb, '2026-07-03')
      returning id into v_invoice_id;

      if 4500 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4500, 'cash', 'completed', '2026-07-03'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 4500, 4500, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'vidya lahe' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      36000,
      0,
      0,
      36000,
      '2026-07-01'::timestamptz
    );

    if 36000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 36000, 0, 0, 36000, 0, 36000, 'partial', 'partial', '[{"description":"12pt","amount":36000}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 0 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 0, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 36000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 36000, 0, 36000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'rizwan shah' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-10'::date,
      ('2026-07-10'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-10'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      16000,
      0,
      0,
      16000,
      '2026-07-10'::timestamptz
    );

    if 16000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 16000, 0, 0, 16000, 7000, 9000, 'partial', 'partial', '[{"description":"12m","amount":16000}]'::jsonb, '2026-07-10')
      returning id into v_invoice_id;

      if 7000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7000, 'cash', 'completed', '2026-07-10'::timestamptz, 0);
      end if;

      if 9000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 16000, 7000, 9000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'karan jayaswal' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      18000,
      0,
      0,
      18000,
      '2026-07-01'::timestamptz
    );

    if 18000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 18000, 0, 0, 18000, 18000, 0, 'paid', 'completed', '[{"description":"12m","amount":18000}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 18000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 18000, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 18000, 18000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'angel jain' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7000,
      0,
      0,
      7000,
      '2026-07-01'::timestamptz
    );

    if 7000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7000, 0, 0, 7000, 7000, 0, 'paid', 'completed', '[{"description":"1mpt","amount":7000}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 7000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7000, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7000, 7000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'sahu adhau' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-03'::date,
      ('2026-07-03'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-03'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7500,
      0,
      0,
      7500,
      '2026-07-03'::timestamptz
    );

    if 7500 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 0, 0, 7500, 7500, 0, 'paid', 'completed', '[{"description":"3m","amount":7500}]'::jsonb, '2026-07-03')
      returning id into v_invoice_id;

      if 7500 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 'cash', 'completed', '2026-07-03'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7500, 7500, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'balkrishna adhau' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-03'::date,
      ('2026-07-03'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-03'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7500,
      0,
      0,
      7500,
      '2026-07-03'::timestamptz
    );

    if 7500 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 0, 0, 7500, 7500, 0, 'paid', 'completed', '[{"description":"3m","amount":7500}]'::jsonb, '2026-07-03')
      returning id into v_invoice_id;

      if 7500 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 'cash', 'completed', '2026-07-03'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7500, 7500, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'kunal/neelam wankhade' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '2 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-03'::date,
      ('2026-07-03'::date + (2 || ' months')::interval)::date,
      case when ('2026-07-03'::date + (2 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      10000,
      0,
      0,
      10000,
      '2026-07-03'::timestamptz
    );

    if 10000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 10000, 0, 0, 10000, 10000, 0, 'paid', 'completed', '[{"description":"2m","amount":10000}]'::jsonb, '2026-07-03')
      returning id into v_invoice_id;

      if 10000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 10000, 'cash', 'completed', '2026-07-03'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 10000, 10000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'aman shyed' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-03'::date,
      ('2026-07-03'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-03'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7500,
      0,
      0,
      7500,
      '2026-07-03'::timestamptz
    );

    if 7500 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 0, 0, 7500, 2000, 5500, 'partial', 'partial', '[{"description":"3m","amount":7500}]'::jsonb, '2026-07-03')
      returning id into v_invoice_id;

      if 2000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 2000, 'cash', 'completed', '2026-07-03'::timestamptz, 0);
      end if;

      if 5500 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7500, 2000, 5500, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'amrut deshmukh' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '6 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-26'::date,
      ('2026-07-26'::date + (6 || ' months')::interval)::date,
      case when ('2026-07-26'::date + (6 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      12000,
      0,
      0,
      12000,
      '2026-07-26'::timestamptz
    );

    if 12000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 12000, 0, 0, 12000, 12000, 0, 'paid', 'completed', '[{"description":"6m","amount":12000}]'::jsonb, '2026-07-26')
      returning id into v_invoice_id;

      if 12000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 12000, 'cash', 'completed', '2026-07-26'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 12000, 12000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'sharukh janwani' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-03'::date,
      ('2026-07-03'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-03'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7500,
      0,
      0,
      7500,
      '2026-07-03'::timestamptz
    );

    if 7500 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 0, 0, 7500, 7500, 0, 'paid', 'completed', '[{"description":"3m","amount":7500}]'::jsonb, '2026-07-03')
      returning id into v_invoice_id;

      if 7500 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 'cash', 'completed', '2026-07-03'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7500, 7500, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'yash hingankar' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '2 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-02'::date,
      ('2026-07-02'::date + (2 || ' months')::interval)::date,
      case when ('2026-07-02'::date + (2 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      5000,
      0,
      0,
      5000,
      '2026-07-02'::timestamptz
    );

    if 5000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 5000, 0, 0, 5000, 5000, 0, 'paid', 'completed', '[{"description":"2m","amount":5000}]'::jsonb, '2026-07-02')
      returning id into v_invoice_id;

      if 5000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 5000, 'cash', 'completed', '2026-07-02'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 5000, 5000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'aman amlani' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-03'::date,
      ('2026-07-03'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-03'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      18000,
      0,
      0,
      18000,
      '2026-07-03'::timestamptz
    );

    if 18000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 18000, 0, 0, 18000, 10000, 8000, 'partial', 'partial', '[{"description":"12m","amount":18000}]'::jsonb, '2026-07-03')
      returning id into v_invoice_id;

      if 10000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 10000, 'cash', 'completed', '2026-07-03'::timestamptz, 0);
      end if;

      if 8000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 18000, 10000, 8000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'mukund gupta' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-03'::date,
      ('2026-07-03'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-03'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7500,
      0,
      0,
      7500,
      '2026-07-03'::timestamptz
    );

    if 7500 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 0, 0, 7500, 7500, 0, 'paid', 'completed', '[{"description":"3m","amount":7500}]'::jsonb, '2026-07-03')
      returning id into v_invoice_id;

      if 7500 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 'cash', 'completed', '2026-07-03'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7500, 7500, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'piyush kumar' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      1000,
      0,
      0,
      1000,
      '2026-07-01'::timestamptz
    );

    if 1000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 1000, 0, 0, 1000, 1000, 0, 'paid', 'completed', '[{"description":"3m","amount":1000}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 1000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 1000, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 1000, 1000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'vrajesh karwa' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-05'::date,
      ('2026-07-05'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-05'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      16000,
      0,
      0,
      16000,
      '2026-07-05'::timestamptz
    );

    if 16000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 16000, 0, 0, 16000, 16000, 0, 'paid', 'completed', '[{"description":"12m","amount":16000}]'::jsonb, '2026-07-05')
      returning id into v_invoice_id;

      if 16000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 16000, 'cash', 'completed', '2026-07-05'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 16000, 16000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'prashant mandlik' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-04'::date,
      ('2026-07-04'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-04'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      16000,
      0,
      0,
      16000,
      '2026-07-04'::timestamptz
    );

    if 16000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 16000, 0, 0, 16000, 16000, 0, 'paid', 'completed', '[{"description":"12m","amount":16000}]'::jsonb, '2026-07-04')
      returning id into v_invoice_id;

      if 16000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 16000, 'cash', 'completed', '2026-07-04'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 16000, 16000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'deepak lokhande' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-06'::date,
      ('2026-07-06'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-06'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-06'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-06')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-06'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'vrajesh karwa' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-06'::date,
      ('2026-07-06'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-06'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      4000,
      0,
      0,
      4000,
      '2026-07-06'::timestamptz
    );

    if 4000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 0, 0, 4000, 4000, 0, 'paid', 'completed', '[{"description":"1m p.t","amount":4000}]'::jsonb, '2026-07-06')
      returning id into v_invoice_id;

      if 4000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 'cash', 'completed', '2026-07-06'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 4000, 4000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'abhimanyu bhargav' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-02'::date,
      ('2026-07-02'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-02'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      16000,
      0,
      0,
      16000,
      '2026-07-02'::timestamptz
    );

    if 16000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 16000, 0, 0, 16000, 16000, 0, 'paid', 'completed', '[{"description":"12m","amount":16000}]'::jsonb, '2026-07-02')
      returning id into v_invoice_id;

      if 16000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 16000, 'cash', 'completed', '2026-07-02'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 16000, 16000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'sharukh janwani' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-03'::date,
      ('2026-07-03'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-03'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      10000,
      0,
      0,
      10000,
      '2026-07-03'::timestamptz
    );

    if 10000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 10000, 0, 0, 10000, 10000, 0, 'paid', 'completed', '[{"description":"3m","amount":10000}]'::jsonb, '2026-07-03')
      returning id into v_invoice_id;

      if 10000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 10000, 'cash', 'completed', '2026-07-03'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 10000, 10000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'janhvi taywade' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-03'::date,
      ('2026-07-03'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-03'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      4500,
      0,
      0,
      4500,
      '2026-07-03'::timestamptz
    );

    if 4500 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4500, 0, 0, 4500, 4500, 0, 'paid', 'completed', '[{"description":"1m","amount":4500}]'::jsonb, '2026-07-03')
      returning id into v_invoice_id;

      if 4500 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4500, 'cash', 'completed', '2026-07-03'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 4500, 4500, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'nandkishor kale' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-07'::date,
      ('2026-07-07'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-07'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      16000,
      0,
      0,
      16000,
      '2026-07-07'::timestamptz
    );

    if 16000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 16000, 0, 0, 16000, 16000, 0, 'paid', 'completed', '[{"description":"12m","amount":16000}]'::jsonb, '2026-07-07')
      returning id into v_invoice_id;

      if 16000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 16000, 'cash', 'completed', '2026-07-07'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 16000, 16000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'shubham khandelwal' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-06'::date,
      ('2026-07-06'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-06'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      18000,
      0,
      0,
      18000,
      '2026-07-06'::timestamptz
    );

    if 18000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 18000, 0, 0, 18000, 18000, 0, 'paid', 'completed', '[{"description":"12m","amount":18000}]'::jsonb, '2026-07-06')
      returning id into v_invoice_id;

      if 18000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 18000, 'cash', 'completed', '2026-07-06'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 18000, 18000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'ankush wankhade' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-07'::date,
      ('2026-07-07'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-07'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-07'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-07')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-07'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'pulkantwar shrikant' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-06'::date,
      ('2026-07-06'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-06'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7000,
      0,
      0,
      7000,
      '2026-07-06'::timestamptz
    );

    if 7000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7000, 0, 0, 7000, 7000, 0, 'paid', 'completed', '[{"description":"12m","amount":7000}]'::jsonb, '2026-07-06')
      returning id into v_invoice_id;

      if 7000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7000, 'cash', 'completed', '2026-07-06'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7000, 7000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'ankush wankhade' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-07'::date,
      ('2026-07-07'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-07'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      8000,
      0,
      0,
      8000,
      '2026-07-07'::timestamptz
    );

    if 8000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 8000, 0, 0, 8000, 8000, 0, 'paid', 'completed', '[{"description":"1M P.T","amount":8000}]'::jsonb, '2026-07-07')
      returning id into v_invoice_id;

      if 8000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 8000, 'cash', 'completed', '2026-07-07'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 8000, 8000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'NEHA ladha' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-07'::date,
      ('2026-07-07'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-07'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      21000,
      0,
      0,
      21000,
      '2026-07-07'::timestamptz
    );

    if 21000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 21000, 0, 0, 21000, 21000, 0, 'paid', 'completed', '[{"description":"3m p.t","amount":21000}]'::jsonb, '2026-07-07')
      returning id into v_invoice_id;

      if 21000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 21000, 'cash', 'completed', '2026-07-07'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 21000, 21000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'deepak lokhande' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-05'::date,
      ('2026-07-05'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-05'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      4000,
      0,
      0,
      4000,
      '2026-07-05'::timestamptz
    );

    if 4000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 0, 0, 4000, 4000, 0, 'paid', 'completed', '[{"description":"1m p.t","amount":4000}]'::jsonb, '2026-07-05')
      returning id into v_invoice_id;

      if 4000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 'cash', 'completed', '2026-07-05'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 4000, 4000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'sonika deshmukh' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-09'::date,
      ('2026-07-09'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-09'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      4000,
      0,
      0,
      4000,
      '2026-07-09'::timestamptz
    );

    if 4000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 0, 0, 4000, 4000, 0, 'paid', 'completed', '[{"description":"1m p.t","amount":4000}]'::jsonb, '2026-07-09')
      returning id into v_invoice_id;

      if 4000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 'cash', 'completed', '2026-07-09'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 4000, 4000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'gauri dahane' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-05'::date,
      ('2026-07-05'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-05'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      4000,
      0,
      0,
      4000,
      '2026-07-05'::timestamptz
    );

    if 4000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 0, 0, 4000, 4000, 0, 'paid', 'completed', '[{"description":"1m p.t","amount":4000}]'::jsonb, '2026-07-05')
      returning id into v_invoice_id;

      if 4000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 'cash', 'completed', '2026-07-05'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 4000, 4000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'gauri dahane' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-05'::date,
      ('2026-07-05'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-05'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7500,
      0,
      0,
      7500,
      '2026-07-05'::timestamptz
    );

    if 7500 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 0, 0, 7500, 7500, 0, 'paid', 'completed', '[{"description":"1m","amount":7500}]'::jsonb, '2026-07-05')
      returning id into v_invoice_id;

      if 7500 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 'cash', 'completed', '2026-07-05'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7500, 7500, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'rakhi wankhade' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-10'::date,
      ('2026-07-10'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-10'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      8000,
      0,
      0,
      8000,
      '2026-07-10'::timestamptz
    );

    if 8000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 8000, 0, 0, 8000, 8000, 0, 'paid', 'completed', '[{"description":"1m p.t","amount":8000}]'::jsonb, '2026-07-10')
      returning id into v_invoice_id;

      if 8000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 8000, 'cash', 'completed', '2026-07-10'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 8000, 8000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'himanshu' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-07'::date,
      ('2026-07-07'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-07'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-07'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-07')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-07'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'sonal gupta' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-07'::date,
      ('2026-07-07'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-07'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      16000,
      0,
      0,
      16000,
      '2026-07-07'::timestamptz
    );

    if 16000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 16000, 0, 0, 16000, 16000, 0, 'paid', 'completed', '[{"description":"12m","amount":16000}]'::jsonb, '2026-07-07')
      returning id into v_invoice_id;

      if 16000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 16000, 'cash', 'completed', '2026-07-07'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 16000, 16000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'padmashree deshmukh' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-07'::date,
      ('2026-07-07'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-07'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-07'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-07')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-07'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'mohammad kaif' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-09'::date,
      ('2026-07-09'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-09'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      4000,
      0,
      0,
      4000,
      '2026-07-09'::timestamptz
    );

    if 4000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 0, 0, 4000, 1000, 3000, 'partial', 'partial', '[{"description":"3m","amount":4000}]'::jsonb, '2026-07-09')
      returning id into v_invoice_id;

      if 1000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 1000, 'cash', 'completed', '2026-07-09'::timestamptz, 0);
      end if;

      if 3000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 4000, 1000, 3000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'shifa khan' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-09'::date,
      ('2026-07-09'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-09'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-09'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-09')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-09'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'aashna rathi' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-09'::date,
      ('2026-07-09'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-09'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      11200,
      0,
      0,
      11200,
      '2026-07-09'::timestamptz
    );

    if 11200 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 11200, 0, 0, 11200, 8000, 3200, 'partial', 'partial', '[{"description":"1m p.t","amount":11200}]'::jsonb, '2026-07-09')
      returning id into v_invoice_id;

      if 8000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 8000, 'cash', 'completed', '2026-07-09'::timestamptz, 0);
      end if;

      if 3200 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 11200, 8000, 3200, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'takshak pays' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-09'::date,
      ('2026-07-09'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-09'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-09'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-09')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-09'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'rakhi wankhade' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-10'::date,
      ('2026-07-10'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-10'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-10'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-10')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-10'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'purvesh nishan' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-11'::date,
      ('2026-07-11'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-11'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-11'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 500, 2500, 'partial', 'partial', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-11')
      returning id into v_invoice_id;

      if 500 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 500, 'cash', 'completed', '2026-07-11'::timestamptz, 0);
      end if;

      if 2500 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 500, 2500, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'palak wavre' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-13'::date,
      ('2026-07-13'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-13'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-13'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-13')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-13'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'deepak lokhande' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-13'::date,
      ('2026-07-13'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-13'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      4000,
      0,
      0,
      4000,
      '2026-07-13'::timestamptz
    );

    if 4000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 0, 0, 4000, 4000, 0, 'paid', 'completed', '[{"description":"upg","amount":4000}]'::jsonb, '2026-07-13')
      returning id into v_invoice_id;

      if 4000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 'cash', 'completed', '2026-07-13'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 4000, 4000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'burhan jamnagarwala' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-14'::date,
      ('2026-07-14'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-14'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7500,
      0,
      0,
      7500,
      '2026-07-14'::timestamptz
    );

    if 7500 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 0, 0, 7500, 7500, 0, 'paid', 'completed', '[{"description":"3m","amount":7500}]'::jsonb, '2026-07-14')
      returning id into v_invoice_id;

      if 7500 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 'cash', 'completed', '2026-07-14'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7500, 7500, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'vaibhav deshmukh' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-14'::date,
      ('2026-07-14'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-14'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-14'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-14')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-14'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'tirthesh singh' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-14'::date,
      ('2026-07-14'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-14'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7500,
      0,
      0,
      7500,
      '2026-07-14'::timestamptz
    );

    if 7500 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 0, 0, 7500, 7500, 0, 'paid', 'completed', '[{"description":"3m","amount":7500}]'::jsonb, '2026-07-14')
      returning id into v_invoice_id;

      if 7500 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 'cash', 'completed', '2026-07-14'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7500, 7500, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'ashish sir friend' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-14'::date,
      ('2026-07-14'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-14'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      2000,
      0,
      0,
      2000,
      '2026-07-14'::timestamptz
    );

    if 2000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 2000, 0, 0, 2000, 2000, 0, 'paid', 'completed', '[{"description":"1m","amount":2000}]'::jsonb, '2026-07-14')
      returning id into v_invoice_id;

      if 2000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 2000, 'cash', 'completed', '2026-07-14'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 2000, 2000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'sarthak sir' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-14'::date,
      ('2026-07-14'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-14'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      5600,
      0,
      0,
      5600,
      '2026-07-14'::timestamptz
    );

    if 5600 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 5600, 0, 0, 5600, 4000, 1600, 'partial', 'partial', '[{"description":"1m p.t","amount":5600}]'::jsonb, '2026-07-14')
      returning id into v_invoice_id;

      if 4000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 'cash', 'completed', '2026-07-14'::timestamptz, 0);
      end if;

      if 1600 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 5600, 4000, 1600, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'dipti/vaishali/anjali' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-14'::date,
      ('2026-07-14'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-14'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      40000,
      0,
      0,
      40000,
      '2026-07-14'::timestamptz
    );

    if 40000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 40000, 0, 0, 40000, 20000, 20000, 'partial', 'partial', '[{"description":"12m","amount":40000}]'::jsonb, '2026-07-14')
      returning id into v_invoice_id;

      if 20000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 20000, 'cash', 'completed', '2026-07-14'::timestamptz, 0);
      end if;

      if 20000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 40000, 20000, 20000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'gunjan mandlik' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-30'::date,
      ('2026-07-30'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-30'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      0,
      0,
      0,
      0,
      '2026-07-30'::timestamptz
    );

    if 0 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 0, 0, 0, 0, 0, 0, 'paid', 'completed', '[{"description":"12m","amount":0}]'::jsonb, '2026-07-30')
      returning id into v_invoice_id;

      if 0 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 0, 'cash', 'completed', '2026-07-30'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 0, 0, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'deepak lokhande' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-16'::date,
      ('2026-07-16'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-16'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      5600,
      0,
      0,
      5600,
      '2026-07-16'::timestamptz
    );

    if 5600 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 5600, 0, 0, 5600, 4000, 1600, 'partial', 'partial', '[{"description":"1m p.t","amount":5600}]'::jsonb, '2026-07-16')
      returning id into v_invoice_id;

      if 4000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 'cash', 'completed', '2026-07-16'::timestamptz, 0);
      end if;

      if 1600 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 5600, 4000, 1600, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'anil killekar' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-26'::date,
      ('2026-07-26'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-26'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      16000,
      0,
      0,
      16000,
      '2026-07-26'::timestamptz
    );

    if 16000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 16000, 0, 0, 16000, 7500, 8500, 'partial', 'partial', '[{"description":"12m","amount":16000}]'::jsonb, '2026-07-26')
      returning id into v_invoice_id;

      if 7500 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 'cash', 'completed', '2026-07-26'::timestamptz, 0);
      end if;

      if 8500 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 16000, 7500, 8500, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'aarti bhargav' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-09'::date,
      ('2026-07-09'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-09'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      15000,
      0,
      0,
      15000,
      '2026-07-09'::timestamptz
    );

    if 15000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 15000, 0, 0, 15000, 15000, 0, 'paid', 'completed', '[{"description":"12m","amount":15000}]'::jsonb, '2026-07-09')
      returning id into v_invoice_id;

      if 15000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 15000, 'cash', 'completed', '2026-07-09'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 15000, 15000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'aditi ingole' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-15'::date,
      ('2026-07-15'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-15'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      6000,
      0,
      0,
      6000,
      '2026-07-15'::timestamptz
    );

    if 6000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 6000, 0, 0, 6000, 6000, 0, 'paid', 'completed', '[{"description":"3m","amount":6000}]'::jsonb, '2026-07-15')
      returning id into v_invoice_id;

      if 6000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 6000, 'cash', 'completed', '2026-07-15'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 6000, 6000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'pratiksha sawant' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-15'::date,
      ('2026-07-15'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-15'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      6000,
      0,
      0,
      6000,
      '2026-07-15'::timestamptz
    );

    if 6000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 6000, 0, 0, 6000, 6000, 0, 'paid', 'completed', '[{"description":"3m","amount":6000}]'::jsonb, '2026-07-15')
      returning id into v_invoice_id;

      if 6000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 6000, 'cash', 'completed', '2026-07-15'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 6000, 6000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'rukhaar/ abail' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-17'::date,
      ('2026-07-17'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-17'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      11000,
      0,
      0,
      11000,
      '2026-07-17'::timestamptz
    );

    if 11000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 11000, 0, 0, 11000, 1500, 9500, 'partial', 'partial', '[{"description":"3m","amount":11000}]'::jsonb, '2026-07-17')
      returning id into v_invoice_id;

      if 1500 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 1500, 'cash', 'completed', '2026-07-17'::timestamptz, 0);
      end if;

      if 9500 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 11000, 1500, 9500, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'syed moammeer' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-17'::date,
      ('2026-07-17'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-17'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-17'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-17')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-17'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'SAKSHI BAJAJ' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-20'::date,
      ('2026-07-20'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-20'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7000,
      0,
      0,
      7000,
      '2026-07-20'::timestamptz
    );

    if 7000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7000, 0, 0, 7000, 7000, 0, 'paid', 'completed', '[{"description":"3M","amount":7000}]'::jsonb, '2026-07-20')
      returning id into v_invoice_id;

      if 7000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7000, 'cash', 'completed', '2026-07-20'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7000, 7000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'nandkishor kale' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-17'::date,
      ('2026-07-17'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-17'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      4000,
      0,
      0,
      4000,
      '2026-07-17'::timestamptz
    );

    if 4000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 0, 0, 4000, 4000, 0, 'paid', 'completed', '[{"description":"1m","amount":4000}]'::jsonb, '2026-07-17')
      returning id into v_invoice_id;

      if 4000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 'cash', 'completed', '2026-07-17'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 4000, 4000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'sakshi bajaj' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-20'::date,
      ('2026-07-20'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-20'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      4000,
      0,
      0,
      4000,
      '2026-07-20'::timestamptz
    );

    if 4000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 0, 0, 4000, 4000, 0, 'paid', 'completed', '[{"description":"1m","amount":4000}]'::jsonb, '2026-07-20')
      returning id into v_invoice_id;

      if 4000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 'cash', 'completed', '2026-07-20'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 4000, 4000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'Danish kazi' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '6 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-18'::date,
      ('2026-07-18'::date + (6 || ' months')::interval)::date,
      case when ('2026-07-18'::date + (6 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      12000,
      0,
      0,
      12000,
      '2026-07-18'::timestamptz
    );

    if 12000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 12000, 0, 0, 12000, 12000, 0, 'paid', 'completed', '[{"description":"6m","amount":12000}]'::jsonb, '2026-07-18')
      returning id into v_invoice_id;

      if 12000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 12000, 'cash', 'completed', '2026-07-18'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 12000, 12000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'jaidh khatri' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-18'::date,
      ('2026-07-18'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-18'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-18'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-18')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-18'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'anuradha kapoor' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-18'::date,
      ('2026-07-18'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-18'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      9800,
      0,
      0,
      9800,
      '2026-07-18'::timestamptz
    );

    if 9800 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 9800, 0, 0, 9800, 7000, 2800, 'partial', 'partial', '[{"description":"1m p.t","amount":9800}]'::jsonb, '2026-07-18')
      returning id into v_invoice_id;

      if 7000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7000, 'cash', 'completed', '2026-07-18'::timestamptz, 0);
      end if;

      if 2800 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 9800, 7000, 2800, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'rekha karnewar' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-20'::date,
      ('2026-07-20'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-20'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      8400,
      0,
      0,
      8400,
      '2026-07-20'::timestamptz
    );

    if 8400 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 8400, 0, 0, 8400, 6000, 2400, 'partial', 'partial', '[{"description":"1m p.t","amount":8400}]'::jsonb, '2026-07-20')
      returning id into v_invoice_id;

      if 6000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 6000, 'cash', 'completed', '2026-07-20'::timestamptz, 0);
      end if;

      if 2400 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 8400, 6000, 2400, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'ashwini malviya' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-20'::date,
      ('2026-07-20'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-20'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7000,
      0,
      0,
      7000,
      '2026-07-20'::timestamptz
    );

    if 7000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7000, 0, 0, 7000, 7000, 0, 'paid', 'completed', '[{"description":"3m","amount":7000}]'::jsonb, '2026-07-20')
      returning id into v_invoice_id;

      if 7000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7000, 'cash', 'completed', '2026-07-20'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7000, 7000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'ashwini mavlya' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-20'::date,
      ('2026-07-20'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-20'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      4000,
      0,
      0,
      4000,
      '2026-07-20'::timestamptz
    );

    if 4000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 0, 0, 4000, 4000, 0, 'paid', 'completed', '[{"description":"1m","amount":4000}]'::jsonb, '2026-07-20')
      returning id into v_invoice_id;

      if 4000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 'cash', 'completed', '2026-07-20'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 4000, 4000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'kinjal armv rathod' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-20'::date,
      ('2026-07-20'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-20'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      15400,
      0,
      0,
      15400,
      '2026-07-20'::timestamptz
    );

    if 15400 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 15400, 0, 0, 15400, 11000, 4400, 'partial', 'partial', '[{"description":"1m p.t..3m","amount":15400}]'::jsonb, '2026-07-20')
      returning id into v_invoice_id;

      if 11000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 11000, 'cash', 'completed', '2026-07-20'::timestamptz, 0);
      end if;

      if 4400 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 15400, 11000, 4400, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'aarti bhargawa' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-20'::date,
      ('2026-07-20'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-20'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      8400,
      0,
      0,
      8400,
      '2026-07-20'::timestamptz
    );

    if 8400 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 8400, 0, 0, 8400, 6000, 2400, 'partial', 'partial', '[{"description":"1m p.t","amount":8400}]'::jsonb, '2026-07-20')
      returning id into v_invoice_id;

      if 6000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 6000, 'cash', 'completed', '2026-07-20'::timestamptz, 0);
      end if;

      if 2400 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 8400, 6000, 2400, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'pritam hiwase' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-21'::date,
      ('2026-07-21'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-21'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7500,
      0,
      0,
      7500,
      '2026-07-21'::timestamptz
    );

    if 7500 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 0, 0, 7500, 7500, 0, 'paid', 'completed', '[{"description":"3m","amount":7500}]'::jsonb, '2026-07-21')
      returning id into v_invoice_id;

      if 7500 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 'cash', 'completed', '2026-07-21'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7500, 7500, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'dhruv daga' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-21'::date,
      ('2026-07-21'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-21'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7000,
      0,
      0,
      7000,
      '2026-07-21'::timestamptz
    );

    if 7000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7000, 0, 0, 7000, 7000, 0, 'paid', 'completed', '[{"description":"3m","amount":7000}]'::jsonb, '2026-07-21')
      returning id into v_invoice_id;

      if 7000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7000, 'cash', 'completed', '2026-07-21'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7000, 7000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'arpit mundhada' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-21'::date,
      ('2026-07-21'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-21'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7000,
      0,
      0,
      7000,
      '2026-07-21'::timestamptz
    );

    if 7000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7000, 0, 0, 7000, 7000, 0, 'paid', 'completed', '[{"description":"3m","amount":7000}]'::jsonb, '2026-07-21')
      returning id into v_invoice_id;

      if 7000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7000, 'cash', 'completed', '2026-07-21'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7000, 7000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'gaurang gadling' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-21'::date,
      ('2026-07-21'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-21'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      5600,
      0,
      0,
      5600,
      '2026-07-21'::timestamptz
    );

    if 5600 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 5600, 0, 0, 5600, 4000, 1600, 'partial', 'partial', '[{"description":"1m p.t","amount":5600}]'::jsonb, '2026-07-21')
      returning id into v_invoice_id;

      if 4000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 4000, 'cash', 'completed', '2026-07-21'::timestamptz, 0);
      end if;

      if 1600 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 5600, 4000, 1600, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'janhvi taywade' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-21'::date,
      ('2026-07-21'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-21'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      11200,
      0,
      0,
      11200,
      '2026-07-21'::timestamptz
    );

    if 11200 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 11200, 0, 0, 11200, 8000, 3200, 'partial', 'partial', '[{"description":"1m p.t","amount":11200}]'::jsonb, '2026-07-21')
      returning id into v_invoice_id;

      if 8000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 8000, 'cash', 'completed', '2026-07-21'::timestamptz, 0);
      end if;

      if 3200 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 11200, 8000, 3200, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'ishika awankar' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-21'::date,
      ('2026-07-21'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-21'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      15000,
      0,
      0,
      15000,
      '2026-07-21'::timestamptz
    );

    if 15000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 15000, 0, 0, 15000, 6000, 9000, 'partial', 'partial', '[{"description":"Gym Membership","amount":15000}]'::jsonb, '2026-07-21')
      returning id into v_invoice_id;

      if 6000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 6000, 'cash', 'completed', '2026-07-21'::timestamptz, 0);
      end if;

      if 9000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 15000, 6000, 9000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'adanan' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-20'::date,
      ('2026-07-20'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-20'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-20'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"moaambar1m","amount":3000}]'::jsonb, '2026-07-20')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-20'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'gaurav pinjani' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      16000,
      0,
      0,
      16000,
      '2026-07-01'::timestamptz
    );

    if 16000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 16000, 0, 0, 16000, 12000, 4000, 'partial', 'partial', '[{"description":"Gym Membership","amount":16000}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 12000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 12000, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 4000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 16000, 12000, 4000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'gautam pinjani' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      16000,
      0,
      0,
      16000,
      '2026-07-01'::timestamptz
    );

    if 16000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 16000, 0, 0, 16000, 15000, 1000, 'partial', 'partial', '[{"description":"Gym Membership","amount":16000}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 15000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 15000, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 1000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 16000, 15000, 1000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'om dalwani' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      16000,
      0,
      0,
      16000,
      '2026-07-01'::timestamptz
    );

    if 16000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 16000, 0, 0, 16000, 15000, 1000, 'partial', 'partial', '[{"description":"Gym Membership","amount":16000}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 15000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 15000, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 1000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 16000, 15000, 1000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'ATHARV PUNDALIKAR' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-31'::date,
      ('2026-07-31'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-31'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      18000,
      0,
      0,
      18000,
      '2026-07-31'::timestamptz
    );

    if 18000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 18000, 0, 0, 18000, 18000, 0, 'paid', 'completed', '[{"description":"12M","amount":18000}]'::jsonb, '2026-07-31')
      returning id into v_invoice_id;

      if 18000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 18000, 'cash', 'completed', '2026-07-31'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 18000, 18000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'NEHAL KHAN' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-27'::date,
      ('2026-07-27'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-27'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7500,
      0,
      0,
      7500,
      '2026-07-27'::timestamptz
    );

    if 7500 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 0, 0, 7500, 6500, 1000, 'partial', 'partial', '[{"description":"3M","amount":7500}]'::jsonb, '2026-07-27')
      returning id into v_invoice_id;

      if 6500 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 6500, 'cash', 'completed', '2026-07-27'::timestamptz, 0);
      end if;

      if 1000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7500, 6500, 1000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'NANDINI AGRAWAL' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-26'::date,
      ('2026-07-26'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-26'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      6000,
      0,
      0,
      6000,
      '2026-07-26'::timestamptz
    );

    if 6000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 6000, 0, 0, 6000, 6000, 0, 'paid', 'completed', '[{"description":"1M","amount":6000}]'::jsonb, '2026-07-26')
      returning id into v_invoice_id;

      if 6000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 6000, 'cash', 'completed', '2026-07-26'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 6000, 6000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'PRITAM KUKDE' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-26'::date,
      ('2026-07-26'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-26'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      16000,
      0,
      0,
      16000,
      '2026-07-26'::timestamptz
    );

    if 16000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 16000, 0, 0, 16000, 10000, 6000, 'partial', 'partial', '[{"description":"Gym Membership","amount":16000}]'::jsonb, '2026-07-26')
      returning id into v_invoice_id;

      if 10000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 10000, 'cash', 'completed', '2026-07-26'::timestamptz, 0);
      end if;

      if 6000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 16000, 10000, 6000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'SAGEETA BACCHAATE. .HARSHAL PT' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      15000,
      0,
      0,
      15000,
      '2026-07-01'::timestamptz
    );

    if 15000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 15000, 0, 0, 15000, 10000, 5000, 'partial', 'partial', '[{"description":"Gym Membership","amount":15000}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 10000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 10000, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 5000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 15000, 10000, 5000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'SAGEETA BACCHAATE .' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      10000,
      0,
      0,
      10000,
      '2026-07-01'::timestamptz
    );

    if 10000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 10000, 0, 0, 10000, 10000, 0, 'paid', 'completed', '[{"description":"Gym Membership","amount":10000}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 10000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 10000, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 10000, 10000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'sangita bajaj' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-27'::date,
      ('2026-07-27'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-27'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      14000,
      0,
      0,
      14000,
      '2026-07-27'::timestamptz
    );

    if 14000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 14000, 0, 0, 14000, 10000, 4000, 'partial', 'partial', '[{"description":"3m pt","amount":14000}]'::jsonb, '2026-07-27')
      returning id into v_invoice_id;

      if 10000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 10000, 'cash', 'completed', '2026-07-27'::timestamptz, 0);
      end if;

      if 4000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 14000, 10000, 4000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'rajani harish shende' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-22'::date,
      ('2026-07-22'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-22'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-22'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-22')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-22'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'vaishnav shende' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-22'::date,
      ('2026-07-22'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-22'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      1000,
      0,
      0,
      1000,
      '2026-07-22'::timestamptz
    );

    if 1000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 1000, 0, 0, 1000, 1000, 0, 'paid', 'completed', '[{"description":"Gym Membership","amount":1000}]'::jsonb, '2026-07-22')
      returning id into v_invoice_id;

      if 1000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 1000, 'cash', 'completed', '2026-07-22'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 1000, 1000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'owais pathan' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-23'::date,
      ('2026-07-23'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-23'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7500,
      0,
      0,
      7500,
      '2026-07-23'::timestamptz
    );

    if 7500 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 0, 0, 7500, 7500, 0, 'paid', 'completed', '[{"description":"3m","amount":7500}]'::jsonb, '2026-07-23')
      returning id into v_invoice_id;

      if 7500 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 'cash', 'completed', '2026-07-23'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7500, 7500, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'aaryash kakraniya' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-27'::date,
      ('2026-07-27'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-27'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-27'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-27')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-27'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'nandeesni' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-27'::date,
      ('2026-07-27'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-27'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      8400,
      0,
      0,
      8400,
      '2026-07-27'::timestamptz
    );

    if 8400 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 8400, 0, 0, 8400, 6000, 2400, 'partial', 'partial', '[{"description":"1m p.t","amount":8400}]'::jsonb, '2026-07-27')
      returning id into v_invoice_id;

      if 6000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 6000, 'cash', 'completed', '2026-07-27'::timestamptz, 0);
      end if;

      if 2400 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 8400, 6000, 2400, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'ujwal kade' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '3 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-28'::date,
      ('2026-07-28'::date + (3 || ' months')::interval)::date,
      case when ('2026-07-28'::date + (3 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7500,
      0,
      0,
      7500,
      '2026-07-28'::timestamptz
    );

    if 7500 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7500, 0, 0, 7500, 5000, 2500, 'partial', 'partial', '[{"description":"3m","amount":7500}]'::jsonb, '2026-07-28')
      returning id into v_invoice_id;

      if 5000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 5000, 'cash', 'completed', '2026-07-28'::timestamptz, 0);
      end if;

      if 2500 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7500, 5000, 2500, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'pritam kukade' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-27'::date,
      ('2026-07-27'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-27'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      18000,
      0,
      0,
      18000,
      '2026-07-27'::timestamptz
    );

    if 18000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 18000, 0, 0, 18000, 12000, 6000, 'partial', 'partial', '[{"description":"12m","amount":18000}]'::jsonb, '2026-07-27')
      returning id into v_invoice_id;

      if 12000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 12000, 'cash', 'completed', '2026-07-27'::timestamptz, 0);
      end if;

      if 6000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 18000, 12000, 6000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'shlok panpaliya' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-27'::date,
      ('2026-07-27'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-27'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      18000,
      0,
      0,
      18000,
      '2026-07-27'::timestamptz
    );

    if 18000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 18000, 0, 0, 18000, 18000, 0, 'paid', 'completed', '[{"description":"12m","amount":18000}]'::jsonb, '2026-07-27')
      returning id into v_invoice_id;

      if 18000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 18000, 'cash', 'completed', '2026-07-27'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 18000, 18000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'shrigopal rathi' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      0,
      0,
      0,
      0,
      '2026-07-01'::timestamptz
    );

    if 0 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 0, 0, 0, 0, 0, 0, 'paid', 'completed', '[{"description":"Gym Membership","amount":0}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 0 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 0, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 0, 0, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'manish deshmukh' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      0,
      0,
      0,
      0,
      '2026-07-01'::timestamptz
    );

    if 0 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 0, 0, 0, 0, 0, 0, 'paid', 'completed', '[{"description":"Gym Membership","amount":0}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 0 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 0, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 0, 0, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'seika deshmukh' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      0,
      0,
      0,
      0,
      '2026-07-01'::timestamptz
    );

    if 0 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 0, 0, 0, 0, 0, 0, 'paid', 'completed', '[{"description":"Gym Membership","amount":0}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 0 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 0, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 0, 0, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'dr parikshit' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-29'::date,
      ('2026-07-29'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-29'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      7900,
      0,
      0,
      7900,
      '2026-07-29'::timestamptz
    );

    if 7900 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 7900, 0, 0, 7900, 5500, 2400, 'partial', 'partial', '[{"description":"1m p.t","amount":7900}]'::jsonb, '2026-07-29')
      returning id into v_invoice_id;

      if 5500 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 5500, 'cash', 'completed', '2026-07-29'::timestamptz, 0);
      end if;

      if 2400 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 7900, 5500, 2400, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'mujtaba khan' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-29'::date,
      ('2026-07-29'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-29'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-29'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-29')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-29'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'vibha utkhede' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-11'::date,
      ('2026-07-11'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-11'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-11'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-11')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-11'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'member_row_117' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '1 Month' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-01'::date,
      ('2026-07-01'::date + (1 || ' months')::interval)::date,
      case when ('2026-07-01'::date + (1 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      3000,
      0,
      0,
      3000,
      '2026-07-01'::timestamptz
    );

    if 3000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 0, 0, 3000, 3000, 0, 'paid', 'completed', '[{"description":"1m","amount":3000}]'::jsonb, '2026-07-01')
      returning id into v_invoice_id;

      if 3000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 3000, 'cash', 'completed', '2026-07-01'::timestamptz, 0);
      end if;

      if 0 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 3000, 3000, 0, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;


do $$
declare
  v_member_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;
begin
  select id into v_member_id from public.members where full_name = 'ali' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  select id into v_plan_id from public.membership_plans where name = '12 Months' and branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  
  if v_plan_id is null then
    select id into v_plan_id from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' limit 1;
  end if;

  if v_member_id is not null then
    -- Insert Subscription
    insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount, created_at)
    values (
      v_member_id,
      v_plan_id,
      '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
      '2026-07-31'::date,
      ('2026-07-31'::date + (12 || ' months')::interval)::date,
      case when ('2026-07-31'::date + (12 || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
      17000,
      0,
      0,
      17000,
      '2026-07-31'::timestamptz
    );

    if 17000 > 0 then
      -- Insert Invoice
      insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items, created_at)
      values (v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 17000, 0, 0, 17000, 5000, 12000, 'partial', 'partial', '[{"description":"12m","amount":17000}]'::jsonb, '2026-07-31')
      returning id into v_invoice_id;

      if 5000 > 0 then
        insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
        values (v_invoice_id, v_member_id, '6a2a77a6-5f5b-4816-bfe2-590d61437af8', 5000, 'cash', 'completed', '2026-07-31'::timestamptz, 0);
      end if;

      if 12000 > 0 then
        insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
        values ('6a2a77a6-5f5b-4816-bfe2-590d61437af8', v_member_id, v_invoice_id, 'membership', 17000, 5000, 12000, current_date + interval '30 days', 'partial');
      end if;
    end if;
  end if;
end $$;

commit;