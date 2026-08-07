-- ================================================================
-- Reset DB & Import ONLY July 2026 Register Sheet Data
-- ================================================================

begin;

alter table public.members alter column phone drop not null;

-- Delete all previous data to ensure ONLY July 2026 sheet data exists
delete from public.receivables;
delete from public.payments;
delete from public.invoices;
delete from public.subscriptions;
delete from public.attendance;
delete from public.members;

-- ──────────────────────────────────────────────────────────────
-- STEP 1: Insert new members not already in the DB
-- ──────────────────────────────────────────────────────────────
insert into public.members (branch_id, full_name, gender, phone, status, created_at) values
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Nirmala Bhoi','female','9002000001','active','2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Anjali Pawar','female','9002000002','active','2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Rajeshwari Yashwante','female','9002000003','active','2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Sujata Tidke','female','9002000004','active','2026-07-02'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Wajesh Mohammad','male','9002000005','active','2026-07-02'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Munindra Ingle','male','9002000006','active','2026-07-02'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Koyana Kardekar','female','9002000007','active','2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Piyush Lokhande','male','9002000008','active','2026-07-06'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Rahul Ingle','male','9002000009','active','2026-07-02'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Janhvi Taywade','female','9002000010','active','2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Dr Shrikant Pulkantwar','male','9002000011','active','2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Dr Vinay','male','9002000012','active','2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Dr Sanjay','male','9002000013','active','2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Neelam Wankhade','female','9002000014','active','2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Atul Wankhade','male','9002000015','active','2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Vidya Lahe','female','9002000016','active','2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Rizwan Shah','male','9002000017','active','2026-07-30'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Angel Jain','female','9002000018','active','2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Sahu Adhau','male','9002000019','active','2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Balkrishna Adhau','male','9002000020','active','2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Aman Shyed','male','9002000021','active','2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Amrut Deshmukh','male','9002000022','active','2026-07-26'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Sharukh Janwani','male','9002000023','active','2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Mukund Gupta','male','9002000024','active','2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Aman Amlani','male','9002000025','active','2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Abhimanyu Bhargav','male','9002000026','active','2026-07-02'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Ankush Wankhade','male','9002000027','active','2026-07-07'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Neha Laddha','female','9002000028','active','2026-07-07'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Himanshu Dulia','male','9002000029','active','2026-07-07'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Padmashree Deshmukh','female','9002000030','active','2026-07-08'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Mohammad Kaif','male','9002000031','active','2026-07-09'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Aashna Rathi','female','9002000032','active','2026-07-09'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Takshak Pays','male','9002000033','active','2026-07-09'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Rakhi Wankhade','female','9002000034','active','2026-07-10'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Purvesh Nishan','male','9002000035','active','2026-07-11'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Palak Wavre','female','9002000036','active','2026-07-13'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Burhan Jamnagarwala','male','9002000037','active','2026-07-14'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Vaibhav Deshmukh','male','9002000038','active','2026-07-14'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Tirthesh Singh','male','9002000039','active','2026-07-14'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Dipti Vaishali Anjali','female','9002000040','active','2026-07-14'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Gunjan Mandlik','female','9002000041','active','2026-07-30'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Gauri Dahane','female','9002000042','active','2026-07-05'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Sarika Deshmukh','female','9002000043','active','2026-07-09'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Danish Kazi','male','9002000044','active','2026-07-18'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Jaidh Khatri','male','9002000045','active','2026-07-18'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Rekha Karnewar','female','9002000046','active','2026-07-20'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Ashwini Malviya','female','9002000047','active','2026-07-20'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Kinjal Rathod','female','9002000048','active','2026-07-20'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Pritam Hiwase','male','9002000049','active','2026-07-21'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Dhruv Daga','male','9002000050','active','2026-07-21'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Arpit Mundhada','male','9002000051','active','2026-07-21'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Gaurang Gadling','male','9002000052','active','2026-07-21'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Ishika Awankar','female','9002000053','active','2026-07-21'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Adanan Khan','male','9002000054','active','2026-07-20'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Gaurav Pinjani','male','9002000055','active','2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Gautam Pinjani','male','9002000056','active','2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Om Dalwani','male','9002000057','active','2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Atharv Pundalikar','male','9002000058','active','2026-07-31'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Nehal Khan','male','9002000059','active','2026-07-27'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Nandini Agrawal','female','9002000060','active','2026-07-26'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Pritam Kukde','male','9002000061','active','2026-07-26'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Sageeta Bacchaate','female','9002000062','active','2026-07-27'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Sangita Bajaj','female','9002000063','active','2026-07-27'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Rajani Shende','female','9002000064','active','2026-07-22'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Vaishnav Shende','male','9002000065','active','2026-07-22'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Owais Pathan','male','9002000066','active','2026-07-23'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Aaryash Kakraniya','male','9002000067','active','2026-07-27'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Ujwal Kade','male','9002000068','active','2026-07-28'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Dr Parikshit','male','9002000069','active','2026-07-29'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Mujtaba Khan','male','9002000070','active','2026-07-29'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Vibha Utkhede','female','9002000071','active','2026-07-31'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8','Ali Khan','male','9002000072','active','2026-07-31');

-- ──────────────────────────────────────────────────────────────
-- STEP 2: Get the plan IDs we need (run this SELECT first to confirm)
-- select id, name from public.membership_plans where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8';
-- ──────────────────────────────────────────────────────────────
-- We'll use a CTE to look up members and plans dynamically
-- so the insert works regardless of auto-generated IDs

-- ──────────────────────────────────────────────────────────────
-- STEP 3: Subscriptions — package + start/end dates from the data
-- ──────────────────────────────────────────────────────────────
insert into public.subscriptions (member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount)
select
  m.id,
  p.id,
  '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
  v.start_date::date,
  (v.start_date::date + (v.months || ' months')::interval)::date,
  case when (v.start_date::date + (v.months || ' months')::interval)::date < current_date then 'expired'::public.subscription_status else 'active'::public.subscription_status end,
  v.total_amount,
  0,
  0,
  v.total_amount
from (values
  -- name, join_date, package_name, duration_months, total_paid+balance
  ('Nirmala Bhoi',          '2026-07-01', '1 Month',   1,  3000),
  ('Anjali Pawar',          '2026-07-01', '1 Month',   1,  3000),
  ('Girish Rathi',          '2026-07-01', '12 Months', 12, 15000),
  ('Rajeshwari Yashwante',  '2026-07-01', '1 Month',   1,  3000),
  ('Sujata Tidke',          '2026-07-02', '6 Months',  6,  11000),
  ('Zaid Khan',             '2026-07-01', '12 Months', 12, 16000),
  ('Wajesh Mohammad',       '2026-07-02', '1 Month',   1,  3000),
  ('Munindra Ingle',        '2026-07-02', '3 Months',  3,  7500),
  ('Koyana Kardekar',       '2026-07-01', '3 Months',  3,  7000),
  ('Piyush Lokhande',       '2026-07-06', '1 Month',   1,  3000),
  ('Rahul Ingle',           '2026-07-02', '1 Month',   1,  3000),
  ('Janhvi Taywade',        '2026-07-03', '1 Month',   1,  3000),
  ('Dr Shrikant Pulkantwar','2026-07-03', '6 Months',  6,  11000),
  ('Dr Vinay',              '2026-07-03', '6 Months',  6,  11000),
  ('Dr Sanjay',             '2026-07-03', '6 Months',  6,  11000),
  ('Rizwan Shah',           '2026-07-30', '12 Months', 12, 16000),
  ('Karan Jayaswal',        '2026-07-01', '12 Months', 12, 18000),
  ('Sahu Adhau',            '2026-07-03', '3 Months',  3,  7500),
  ('Balkrishna Adhau',      '2026-07-03', '3 Months',  3,  7500),
  ('Aman Shyed',            '2026-07-03', '3 Months',  3,  7500),
  ('Amrut Deshmukh',        '2026-07-26', '6 Months',  6,  12000),
  ('Sharukh Janwani',       '2026-07-03', '3 Months',  3,  7500),
  ('Mukund Gupta',          '2026-07-03', '3 Months',  3,  7500),
  ('Aman Amlani',           '2026-07-03', '12 Months', 12, 18000),
  ('Abhimanyu Bhargav',     '2026-07-02', '12 Months', 12, 16000),
  ('Ankush Wankhade',       '2026-07-07', '1 Month',   1,  3000),
  ('Himanshu Dulia',        '2026-07-07', '1 Month',   1,  3000),
  ('Padmashree Deshmukh',   '2026-07-08', '1 Month',   1,  3000),
  ('Mohammad Kaif',         '2026-07-09', '3 Months',  3,  4000),
  ('Takshak Pays',          '2026-07-09', '1 Month',   1,  3000),
  ('Rakhi Wankhade',        '2026-07-10', '1 Month',   1,  3000),
  ('Palak Wavre',           '2026-07-13', '1 Month',   1,  3000),
  ('Burhan Jamnagarwala',   '2026-07-14', '3 Months',  3,  7500),
  ('Vaibhav Deshmukh',      '2026-07-14', '1 Month',   1,  3000),
  ('Tirthesh Singh',        '2026-07-14', '3 Months',  3,  7500),
  ('Danish Kazi',           '2026-07-18', '6 Months',  6,  12000),
  ('Jaidh Khatri',          '2026-07-18', '1 Month',   1,  3000),
  ('Ashwini Malviya',       '2026-07-20', '3 Months',  3,  7000),
  ('Pritam Hiwase',         '2026-07-21', '3 Months',  3,  7500),
  ('Dhruv Daga',            '2026-07-21', '3 Months',  3,  7000),
  ('Arpit Mundhada',        '2026-07-21', '3 Months',  3,  7000),
  ('Atharv Pundalikar',     '2026-07-31', '12 Months', 12, 18000),
  ('Nehal Khan',            '2026-07-27', '3 Months',  3,  7500),
  ('Owais Pathan',          '2026-07-23', '3 Months',  3,  7500),
  ('Ujwal Kade',            '2026-07-28', '3 Months',  3,  7500),
  ('Pritam Kukde',          '2026-07-27', '12 Months', 12, 18000),
  ('Shlok Panpaliya',       '2026-07-27', '12 Months', 12, 18000),
  ('Mujtaba Khan',          '2026-07-29', '1 Month',   1,  3000),
  ('Vibha Utkhede',         '2026-07-31', '1 Month',   1,  3000),
  ('Ali Khan',              '2026-07-31', '12 Months', 12, 17000)
) as v(full_name, start_date, plan_name, months, total_amount)
join public.members m on m.full_name = v.full_name
  and m.branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
join public.membership_plans p on p.name = v.plan_name
  and p.branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- STEP 4: Invoices — total_amount = paid + balance
-- amount_paid = paid column, balance_amount = balance column
-- status: paid if balance=0, partial if balance>0
-- ──────────────────────────────────────────────────────────────
insert into public.invoices (member_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items)
select
  m.id,
  '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
  v.total_amount,
  0, 0,
  v.total_amount,
  v.paid,
  v.balance,
  case when v.balance = 0 then 'paid' else 'partial' end,
  case when v.balance = 0 then 'completed' else 'partial' end,
  ('[{"description":"' || v.package || '","amount":' || v.total_amount || '}]')::jsonb
from (values
  -- name, package label, total(paid+balance), paid, balance
  ('Nirmala Bhoi',          '1M Membership',    3000,  3000,  0),
  ('Anjali Pawar',          '1M Membership',    3000,  3000,  0),
  ('Girish Rathi',          '12M Membership',   15000, 15000, 0),
  ('Rajeshwari Yashwante',  '1M Membership',    3000,  3000,  0),
  ('Sujata Tidke',          '6M Membership',    11000, 11000, 0),
  ('Zaid Khan',             '12M Membership',   16000, 10000, 6000),
  ('Wajesh Mohammad',       '1M Membership',    3000,  3000,  0),
  ('Munindra Ingle',        '3M Membership',    7500,  7500,  0),
  ('Koyana Kardekar',       '3M Membership',    7000,  6000,  1000),
  ('Piyush Lokhande',       '1M Membership',    3000,  3000,  0),
  ('Rahul Ingle',           '1M Membership',    3000,  3000,  0),
  ('Janhvi Taywade',        '1M Membership',    3000,  3000,  0),
  ('Dr Shrikant Pulkantwar','6M Membership',    11000, 11000, 0),
  ('Dr Vinay',              '6M Membership',    11000, 0,     11000),
  ('Dr Sanjay',             '6M Membership',    11000, 11000, 0),
  ('Rizwan Shah',           '12M Membership',   16000, 7000,  9000),
  ('Karan Jayaswal',        '12M Membership',   18000, 18000, 0),
  ('Angel Jain',            '1M PT Package',    7000,  7000,  0),
  ('Sahu Adhau',            '3M Membership',    7500,  7500,  0),
  ('Balkrishna Adhau',      '3M Membership',    7500,  7500,  0),
  ('Aman Shyed',            '3M Membership',    7500,  2000,  5500),
  ('Amrut Deshmukh',        '6M Membership',    12000, 12000, 0),
  ('Sharukh Janwani',       '3M Membership',    7500,  7500,  0),
  ('Mukund Gupta',          '3M Membership',    7500,  7500,  0),
  ('Aman Amlani',           '12M Membership',   18000, 10000, 8000),
  ('Abhimanyu Bhargav',     '12M Membership',   16000, 16000, 0),
  ('Ankush Wankhade',       '1M Membership',    3000,  3000,  0),
  ('Himanshu Dulia',        '1M Membership',    3000,  3000,  0),
  ('Padmashree Deshmukh',   '1M Membership',    3000,  3000,  0),
  ('Mohammad Kaif',         '3M Membership',    4000,  1000,  3000),
  ('Aashna Rathi',          '1M PT Package',    8000,  8000,  0),
  ('Takshak Pays',          '1M Membership',    3000,  3000,  0),
  ('Rakhi Wankhade',        '1M PT + 1M Gym',   11000, 11000, 0),
  ('Palak Wavre',           '1M Membership',    3000,  3000,  0),
  ('Burhan Jamnagarwala',   '3M Membership',    7500,  7500,  0),
  ('Vaibhav Deshmukh',      '1M Membership',    3000,  3000,  0),
  ('Tirthesh Singh',        '3M Membership',    7500,  7500,  0),
  ('Dipti Vaishali Anjali', '12M Membership',   40000, 20000, 20000),
  ('Danish Kazi',           '6M Membership',    12000, 12000, 0),
  ('Jaidh Khatri',          '1M Membership',    3000,  3000,  0),
  ('Anuradha Kapoor',       '1M PT Package',    7000,  7000,  0),
  ('Rekha Karnewar',        '1M PT Package',    6000,  6000,  0),
  ('Ashwini Malviya',       '3M Membership',    7000,  7000,  0),
  ('Kinjal Rathod',         '1M PT + 3M Gym',   11000, 11000, 0),
  ('Pritam Hiwase',         '3M Membership',    7500,  7500,  0),
  ('Dhruv Daga',            '3M Membership',    7000,  7000,  0),
  ('Arpit Mundhada',        '3M Membership',    7000,  7000,  0),
  ('Gaurang Gadling',       '1M PT Package',    4000,  4000,  0),
  ('Ishika Awankar',        '3M Renewal',       15000, 6000,  9000),
  ('Adanan Khan',           '1M Membership',    3000,  3000,  0),
  ('Gaurav Pinjani',        '12M Membership',   16000, 12000, 4000),
  ('Gautam Pinjani',        '12M Membership',   16000, 15000, 1000),
  ('Om Dalwani',            '12M Membership',   16000, 15000, 1000),
  ('Atharv Pundalikar',     '12M Membership',   18000, 18000, 0),
  ('Nehal Khan',            '3M Membership',    7500,  6500,  1000),
  ('Nandini Agrawal',       '1M Membership',    6000,  6000,  0),
  ('Pritam Kukde',          '12M Membership',   18000, 12000, 6000),
  ('Sageeta Bacchaate',     'PT Package',       20000, 10000, 10000),
  ('Sangita Bajaj',         '3M PT Package',    14000, 10000, 4000),
  ('Rajani Shende',         '1M Membership',    3000,  3000,  0),
  ('Owais Pathan',          '3M Membership',    7500,  7500,  0),
  ('Aaryash Kakraniya',     '1M Membership',    3000,  3000,  0),
  ('Ujwal Kade',            '3M Membership',    7500,  5000,  2500),
  ('Shlok Panpaliya',       '12M Membership',   18000, 18000, 0),
  ('Dr Parikshit',          '1M PT Package',    7900,  5500,  2400),
  ('Mujtaba Khan',          '1M Membership',    3000,  3000,  0),
  ('Vibha Utkhede',         '1M Membership',    3000,  3000,  0),
  ('Ali Khan',              '12M Membership',   17000, 5000,  12000)
) as v(full_name, package, total_amount, paid, balance)
join public.members m on m.full_name = v.full_name
  and m.branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- STEP 5: Payments — only for members who have paid > 0
-- ──────────────────────────────────────────────────────────────
insert into public.payments (invoice_id, member_id, branch_id, amount, method, status, paid_at, refund_amount)
select
  i.id,
  m.id,
  '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
  v.paid,
  'cash'::public.payment_method,
  'completed'::public.payment_status,
  (v.join_date::date)::timestamptz,
  0
from (values
  ('Nirmala Bhoi',         '2026-07-01', 3000),
  ('Anjali Pawar',         '2026-07-01', 3000),
  ('Girish Rathi',         '2026-07-01', 15000),
  ('Rajeshwari Yashwante', '2026-07-01', 3000),
  ('Sujata Tidke',         '2026-07-02', 11000),
  ('Zaid Khan',            '2026-07-01', 10000),
  ('Wajesh Mohammad',      '2026-07-02', 3000),
  ('Munindra Ingle',       '2026-07-02', 7500),
  ('Koyana Kardekar',      '2026-07-01', 6000),
  ('Piyush Lokhande',      '2026-07-06', 3000),
  ('Rahul Ingle',          '2026-07-02', 3000),
  ('Janhvi Taywade',       '2026-07-03', 3000),
  ('Dr Shrikant Pulkantwar','2026-07-03',11000),
  ('Dr Sanjay',            '2026-07-03', 11000),
  ('Rizwan Shah',          '2026-07-30', 7000),
  ('Karan Jayaswal',       '2026-07-01', 18000),
  ('Angel Jain',           '2026-07-01', 7000),
  ('Sahu Adhau',           '2026-07-03', 7500),
  ('Balkrishna Adhau',     '2026-07-03', 7500),
  ('Aman Shyed',           '2026-07-03', 2000),
  ('Amrut Deshmukh',       '2026-07-26', 12000),
  ('Sharukh Janwani',      '2026-07-03', 7500),
  ('Mukund Gupta',         '2026-07-03', 7500),
  ('Aman Amlani',          '2026-07-03', 10000),
  ('Abhimanyu Bhargav',    '2026-07-02', 16000),
  ('Ankush Wankhade',      '2026-07-07', 3000),
  ('Himanshu Dulia',       '2026-07-07', 3000),
  ('Padmashree Deshmukh',  '2026-07-08', 3000),
  ('Mohammad Kaif',        '2026-07-09', 1000),
  ('Aashna Rathi',         '2026-07-09', 8000),
  ('Takshak Pays',         '2026-07-09', 3000),
  ('Rakhi Wankhade',       '2026-07-10', 11000),
  ('Palak Wavre',          '2026-07-13', 3000),
  ('Burhan Jamnagarwala',  '2026-07-14', 7500),
  ('Vaibhav Deshmukh',     '2026-07-14', 3000),
  ('Tirthesh Singh',       '2026-07-14', 7500),
  ('Dipti Vaishali Anjali','2026-07-14', 20000),
  ('Danish Kazi',          '2026-07-18', 12000),
  ('Jaidh Khatri',         '2026-07-18', 3000),
  ('Anuradha Kapoor',      '2026-07-18', 7000),
  ('Rekha Karnewar',       '2026-07-20', 6000),
  ('Ashwini Malviya',      '2026-07-20', 7000),
  ('Kinjal Rathod',        '2026-07-20', 11000),
  ('Pritam Hiwase',        '2026-07-21', 7500),
  ('Dhruv Daga',           '2026-07-21', 7000),
  ('Arpit Mundhada',       '2026-07-21', 7000),
  ('Gaurang Gadling',      '2026-07-21', 4000),
  ('Ishika Awankar',       '2026-07-21', 6000),
  ('Adanan Khan',          '2026-07-20', 3000),
  ('Gaurav Pinjani',       '2026-07-01', 12000),
  ('Gautam Pinjani',       '2026-07-01', 15000),
  ('Om Dalwani',           '2026-07-01', 15000),
  ('Atharv Pundalikar',    '2026-07-31', 18000),
  ('Nehal Khan',           '2026-07-27', 6500),
  ('Nandini Agrawal',      '2026-07-26', 6000),
  ('Pritam Kukde',         '2026-07-27', 12000),
  ('Sageeta Bacchaate',    '2026-07-27', 10000),
  ('Sangita Bajaj',        '2026-07-27', 10000),
  ('Rajani Shende',        '2026-07-22', 3000),
  ('Owais Pathan',         '2026-07-23', 7500),
  ('Aaryash Kakraniya',    '2026-07-27', 3000),
  ('Ujwal Kade',           '2026-07-28', 5000),
  ('Shlok Panpaliya',      '2026-07-27', 18000),
  ('Dr Parikshit',         '2026-07-29', 5500),
  ('Mujtaba Khan',         '2026-07-29', 3000),
  ('Vibha Utkhede',        '2026-07-31', 3000),
  ('Ali Khan',             '2026-07-31', 5000)
) as v(full_name, join_date, paid)
join public.members m on m.full_name = v.full_name
  and m.branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
join public.invoices i on i.member_id = m.id
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- STEP 6: Receivables — members with outstanding balance > 0
-- ──────────────────────────────────────────────────────────────
insert into public.receivables (branch_id, member_id, invoice_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
select
  '6a2a77a6-5f5b-4816-bfe2-590d61437af8',
  m.id,
  i.id,
  'membership',
  i.total_amount,
  i.amount_paid,
  i.balance_amount,
  current_date + interval '30 days',
  case when i.amount_paid = 0 then 'pending' else 'partial' end
from public.invoices i
join public.members m on m.id = i.member_id
where i.branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
  and i.balance_amount > 0
  and m.created_at >= '2026-07-01'
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- STEP 7: Verify final counts
-- ──────────────────────────────────────────────────────────────
select
  (select count(*) from public.members where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8') as total_members,
  (select count(*) from public.subscriptions where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8') as total_subscriptions,
  (select count(*) from public.invoices where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8') as total_invoices,
  (select count(*) from public.payments where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8') as total_payments,
  (select count(*) from public.receivables where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8' and status in ('pending','partial')) as outstanding_dues;

commit;
