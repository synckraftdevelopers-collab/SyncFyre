-- ================================================================
-- SyncFyre Demo Seed Data
-- Source: DAILY SALE 2025-026.xlsx (real gym data, Dec 2024–July 2026)
-- Purpose: Populate the app with realistic data for client demos
--
-- Run this AFTER all migrations (0001–0006) have been applied.
-- Safe to re-run: uses ON CONFLICT DO NOTHING throughout.
-- ================================================================

begin;

-- ──────────────────────────────────────────────────────────────
-- 1. BRANCH
-- ──────────────────────────────────────────────────────────────
insert into public.branches (id, name, code, address, city, state, country, phone, status)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'SyncFyre Fitness – Main Branch',
  'MAIN',
  'Nagpur, Maharashtra',
  'Nagpur', 'Maharashtra', 'India',
  '9000000001',
  'active'
) on conflict (id) do nothing;

-- ──────────────────────────────────────────────────────────────
-- 2. MEMBERSHIP PLANS  (derived from the data: 1D, 1W, 15D, 1M, 3M, 6M, 12M + PT add-ons)
-- ──────────────────────────────────────────────────────────────
insert into public.membership_plans (id, branch_id, name, price, gst_percent, discount_percent, duration_months, features, status)
values
  ('bbbbbbbb-0001-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Day Pass',300,18,0,1,'["Single day access"]','active'),
  ('bbbbbbbb-0002-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Weekly',1000,18,0,1,'["7 days access"]','active'),
  ('bbbbbbbb-0003-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','1 Month',3000,18,0,1,'["Gym access","Locker"]','active'),
  ('bbbbbbbb-0004-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','3 Months',7500,18,0,3,'["Gym access","Locker","Assessment"]','active'),
  ('bbbbbbbb-0005-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','6 Months',11000,18,0,6,'["Gym access","Locker","Assessment","Diet consult"]','active'),
  ('bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','12 Months',15000,18,0,12,'["Gym access","Locker","Assessment","Diet consult","InBody scan"]','active'),
  ('bbbbbbbb-0007-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Personal Training – 1 Month',7000,18,0,1,'["PT sessions","Custom workout plan"]','active'),
  ('bbbbbbbb-0008-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Personal Training – 3 Months',18000,18,0,3,'["PT sessions","Custom workout plan","Progress tracking"]','active'),
  ('bbbbbbbb-0009-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Couple Package – 12 Months',25000,18,0,12,'["2 members","Gym access","Locker"]','active'),
  ('bbbbbbbb-0010-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','10 Month',12000,18,0,10,'["Gym access","Locker","Assessment"]','active')
on conflict (id) do nothing;

-- ──────────────────────────────────────────────────────────────
-- 3. FACE MACHINE  (the eBioServer device from the data source)
-- ──────────────────────────────────────────────────────────────
insert into public.face_machine_settings (id, branch_id, machine_name, device_id, status, connection_status, last_sync_at, settings)
values (
  'cccccccc-0001-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'eBioServer Face Detection – Main',
  'EBIO-MAIN-001',
  'active',
  'online',
  now() - interval '2 hours',
  '{"vendor":"eBioServer","model":"FaceStation","sync_interval_minutes":15}'
) on conflict (id) do nothing;

-- ──────────────────────────────────────────────────────────────
-- 4. MEMBERS  (100 real members extracted from the monthly registers)
-- Phones are placeholders (real numbers not in the data).
-- machine_user_id matches what the eBioServer would assign.
-- ──────────────────────────────────────────────────────────────
insert into public.members (id, branch_id, member_code, machine_user_id, full_name, gender, phone, status, created_at)
values
  ('dddddddd-0001-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000001','MU-001','Vivek Thakur','male','9000000101','active','2024-12-13'),
  ('dddddddd-0002-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000002','MU-002','Vishal Mirani','male','9000000102','active','2024-12-18'),
  ('dddddddd-0003-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000003','MU-003','Pankaj Rathi','male','9000000103','active','2024-12-25'),
  ('dddddddd-0004-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000004','MU-004','D T Ingole','male','9000000104','active','2024-12-26'),
  ('dddddddd-0005-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000005','MU-005','Avinash Sarvayya','male','9000000105','active','2024-12-20'),
  ('dddddddd-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000006','MU-006','Sanskriti Umak','female','9000000106','active','2024-12-24'),
  ('dddddddd-0007-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000007','MU-007','Parth Deshmukh','male','9000000107','active','2024-12-24'),
  ('dddddddd-0008-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000008','MU-008','Manoj Jadhao','male','9000000108','active','2024-12-19'),
  ('dddddddd-0009-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000009','MU-009','Rashmi Patil','female','9000000109','active','2024-12-18'),
  ('dddddddd-0010-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000010','MU-010','Khalid Khatri','male','9000000110','active','2024-12-27')
on conflict (id) do nothing;

-- More members from July 2025 register
insert into public.members (id, branch_id, member_code, machine_user_id, full_name, gender, phone, status, created_at)
values
  ('dddddddd-0011-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000011','MU-011','Vipul Pinjani','male','9000000111','active','2025-07-11'),
  ('dddddddd-0012-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000012','MU-012','Anil Killerkar','male','9000000112','active','2025-07-10'),
  ('dddddddd-0013-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000013','MU-013','Ujwala Parteti','female','9000000113','active','2025-07-11'),
  ('dddddddd-0014-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000014','MU-014','Piyush Chhablani','male','9000000114','active','2025-07-14'),
  ('dddddddd-0015-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000015','MU-015','Saloni Chhablani','female','9000000115','active','2025-07-14'),
  ('dddddddd-0016-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000016','MU-016','Dr Tanmay Date','male','9000000116','active','2025-07-21'),
  ('dddddddd-0017-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000017','MU-017','Suraj Chauhan','male','9000000117','active','2025-07-22'),
  ('dddddddd-0018-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000018','MU-018','Maunika Chauhan','female','9000000118','active','2025-07-22'),
  ('dddddddd-0019-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000019','MU-019','Dr Minal Deshmukh','female','9000000119','active','2025-07-28'),
  ('dddddddd-0020-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000020','MU-020','Sweta Parday','female','9000000120','active','2025-07-31'),
  ('dddddddd-0021-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000021','MU-021','Sangita Gulhane','female','9000000121','active','2025-07-31'),
  ('dddddddd-0022-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000022','MU-022','Afaque Hussain','male','9000000122','active','2025-07-21'),
  ('dddddddd-0023-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000023','MU-023','Farrukh Hussain','male','9000000123','active','2025-07-21'),
  ('dddddddd-0024-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000024','MU-024','Girish Rathi','male','9000000124','active','2025-01-28'),
  ('dddddddd-0025-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000025','MU-025','Samir Jilani','male','9000000125','active','2025-01-28')
on conflict (id) do nothing;

-- Members from Feb–June 2025
insert into public.members (id, branch_id, member_code, machine_user_id, full_name, gender, phone, status, created_at)
values
  ('dddddddd-0026-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000026','MU-026','Rohit Agrawal','male','9000000126','active','2025-02-10'),
  ('dddddddd-0027-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000027','MU-027','Sameer Pande','male','9000000127','active','2025-02-15'),
  ('dddddddd-0028-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000028','MU-028','Sunny Pinjani','male','9000000128','active','2025-02-20'),
  ('dddddddd-0029-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000029','MU-029','Neha Pinjani','female','9000000129','active','2025-02-20'),
  ('dddddddd-0030-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000030','MU-030','Shitiz Sarvaiya','male','9000000130','active','2025-01-16'),
  ('dddddddd-0031-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000031','MU-031','Nikhil Dalwani','male','9000000131','active','2025-02-26'),
  ('dddddddd-0032-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000032','MU-032','Uddhav Bahekar','male','9000000132','active','2025-02-27'),
  ('dddddddd-0033-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000033','MU-033','Bhishma Gaglani','male','9000000133','active','2025-01-21'),
  ('dddddddd-0034-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000034','MU-034','Prachi Lande','female','9000000134','active','2025-02-25'),
  ('dddddddd-0035-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000035','MU-035','Dr Sqameer Lande','male','9000000135','active','2025-02-25')
on conflict (id) do nothing;

-- Members from March–June 2025
insert into public.members (id, branch_id, member_code, machine_user_id, full_name, gender, phone, status, created_at)
values
  ('dddddddd-0036-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000036','MU-036','Sahil Kewalramani','male','9000000136','active','2025-03-08'),
  ('dddddddd-0037-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000037','MU-037','Sunil Ugale','male','9000000137','active','2025-03-20'),
  ('dddddddd-0038-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000038','MU-038','Prabhat Ranjan','male','9000000138','active','2025-03-20'),
  ('dddddddd-0039-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000039','MU-039','Muzammil Panjawani','male','9000000139','active','2025-01-21'),
  ('dddddddd-0040-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000040','MU-040','Pallavi Rathi','female','9000000140','active','2025-03-22'),
  ('dddddddd-0041-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000041','MU-041','Jay Manglani','male','9000000141','active','2025-02-25'),
  ('dddddddd-0042-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000042','MU-042','Anas Patel','male','9000000142','active','2025-04-09'),
  ('dddddddd-0043-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000043','MU-043','Ruturaj Deshmukh','male','9000000143','active','2025-04-15'),
  ('dddddddd-0044-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000044','MU-044','Swati Deshmukh','female','9000000144','active','2025-04-15'),
  ('dddddddd-0045-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000045','MU-045','Kamalesh Daga','male','9000000145','active','2025-04-18'),
  ('dddddddd-0046-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000046','MU-046','Priti Daga','female','9000000146','active','2025-04-18'),
  ('dddddddd-0047-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000047','MU-047','Vishal Rane','male','9000000147','active','2025-06-17'),
  ('dddddddd-0048-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000048','MU-048','Owais Memon','male','9000000148','active','2025-06-10'),
  ('dddddddd-0049-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000049','MU-049','Tarsem Agrawal','male','9000000149','active','2025-06-18'),
  ('dddddddd-0050-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000050','MU-050','Sagar Dongare','male','9000000150','active','2025-06-18')
on conflict (id) do nothing;

-- Recent 2025 members (Aug–Dec 2025)
insert into public.members (id, branch_id, member_code, machine_user_id, full_name, gender, phone, status, created_at)
values
  ('dddddddd-0051-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000051','MU-051','Khushi Ahuja','female','9000000151','active','2025-08-20'),
  ('dddddddd-0052-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000052','MU-052','Rohit Kumar','male','9000000152','active','2025-08-12'),
  ('dddddddd-0053-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000053','MU-053','Kajal Bhagwat','female','9000000153','active','2025-08-12'),
  ('dddddddd-0054-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000054','MU-054','Shivam Gaur','male','9000000154','active','2025-09-11'),
  ('dddddddd-0055-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000055','MU-055','Mayur Mahajan','male','9000000155','active','2025-09-15'),
  ('dddddddd-0056-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000056','MU-056','Raashit Khan','male','9000000156','active','2025-09-18'),
  ('dddddddd-0057-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000057','MU-057','Sanket Dongardive','male','9000000157','active','2025-09-22'),
  ('dddddddd-0058-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000058','MU-058','Suyog Lahane','male','9000000158','active','2025-09-19'),
  ('dddddddd-0059-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000059','MU-059','Jitin Shah','male','9000000159','active','2025-12-09'),
  ('dddddddd-0060-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000060','MU-060','Pratiksha Tawani','female','9000000160','active','2025-08-22')
on conflict (id) do nothing;

-- 2026 members (Jan–July 2026)
insert into public.members (id, branch_id, member_code, machine_user_id, full_name, gender, phone, status, created_at)
values
  ('dddddddd-0061-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000061','MU-061','Arnav Rathod','male','9000000161','active','2026-01-05'),
  ('dddddddd-0062-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000062','MU-062','K T Soni','male','9000000162','active','2026-01-06'),
  ('dddddddd-0063-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000063','MU-063','Muzzamil Panjwani','male','9000000163','active','2026-01-13'),
  ('dddddddd-0064-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000064','MU-064','Akshita Mundada','female','9000000164','active','2026-01-24'),
  ('dddddddd-0065-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000065','MU-065','Neha Laddha','female','9000000165','active','2026-02-07'),
  ('dddddddd-0066-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000066','MU-066','Advait Deshmukh','male','9000000166','active','2026-02-09'),
  ('dddddddd-0067-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000067','MU-067','Sachin Manohare','male','9000000167','active','2026-02-09'),
  ('dddddddd-0068-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000068','MU-068','Tanishka Sarvaiya','female','9000000168','active','2025-06-18'),
  ('dddddddd-0069-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000069','MU-069','Parag Patel','male','9000000169','active','2026-02-25'),
  ('dddddddd-0070-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000070','MU-070','Vaishali Metkar','female','9000000170','active','2026-03-20'),
  ('dddddddd-0071-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000071','MU-071','Gaurav Rathod','male','9000000171','active','2026-03-20'),
  ('dddddddd-0072-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000072','MU-072','Ashok Wankhade','male','9000000172','active','2026-03-08'),
  ('dddddddd-0073-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000073','MU-073','Ayan Khan','male','9000000173','active','2026-03-30'),
  ('dddddddd-0074-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000074','MU-074','Vishwa Bhangadkar','male','9000000174','active','2026-04-01'),
  ('dddddddd-0075-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000075','MU-075','Bhupendra Gaud','male','9000000175','active','2026-04-03'),
  ('dddddddd-0076-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000076','MU-076','Pranay Tambi','male','9000000176','active','2025-05-20'),
  ('dddddddd-0077-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000077','MU-077','Neha Tambi','female','9000000177','active','2025-05-20'),
  ('dddddddd-0078-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000078','MU-078','Saurabh Ghogre','male','9000000178','active','2026-05-04'),
  ('dddddddd-0079-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000079','MU-079','Mohsin Khan','male','9000000179','active','2026-05-04'),
  ('dddddddd-0080-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000080','MU-080','Sangita Salunke','female','9000000180','active','2026-05-30')
on conflict (id) do nothing;

insert into public.members (id, branch_id, member_code, machine_user_id, full_name, gender, phone, status, created_at)
values
  ('dddddddd-0081-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000081','MU-081','Trupti Dankhade','female','9000000181','active','2026-05-26'),
  ('dddddddd-0082-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000082','MU-082','Kushal Gaglani','male','9000000182','active','2026-05-30'),
  ('dddddddd-0083-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000083','MU-083','Samir Lande','male','9000000183','active','2026-06-01'),
  ('dddddddd-0084-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000084','MU-084','Prachi Lande','female','9000000184','active','2026-06-01'),
  ('dddddddd-0085-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000085','MU-085','Jatin Shah','male','9000000185','active','2026-06-03'),
  ('dddddddd-0086-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000086','MU-086','Chandrakant Shinde','male','9000000186','active','2026-06-17'),
  ('dddddddd-0087-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000087','MU-087','Sanjay Sahare','male','9000000187','active','2026-06-24'),
  ('dddddddd-0088-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000088','MU-088','Karan Jayaswal','male','9000000188','active','2026-07-01'),
  ('dddddddd-0089-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000089','MU-089','Shlok Panpaliya','male','9000000189','active','2026-07-27'),
  ('dddddddd-0090-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000090','MU-090','Shubham Khandelwal','male','9000000190','active','2026-07-06'),
  ('dddddddd-0091-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000091','MU-091','Nandkishor Kale','male','9000000191','active','2026-07-07'),
  ('dddddddd-0092-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000092','MU-092','Sonal Gupta','female','9000000192','active','2026-07-07'),
  ('dddddddd-0093-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000093','MU-093','Vrajesh Karwa','male','9000000193','active','2026-07-05'),
  ('dddddddd-0094-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000094','MU-094','Prashant Mandlik','male','9000000194','active','2026-07-04'),
  ('dddddddd-0095-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000095','MU-095','Aarti Bhargava','female','9000000195','active','2026-07-09'),
  ('dddddddd-0096-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000096','MU-096','Zaid Khan','male','9000000196','active','2026-07-01'),
  ('dddddddd-0097-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000097','MU-097','Rohini Lahane','female','9000000197','active','2025-12-22'),
  ('dddddddd-0098-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000098','MU-098','Rishabh Agrawal','male','9000000198','active','2025-12-15'),
  ('dddddddd-0099-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000099','MU-099','Dhiraj Lulla','male','9000000199','active','2025-01-22'),
  ('dddddddd-0100-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','MEM-000100','MU-100','Krishna Sharma','male','9000000200','active','2025-01-22')
on conflict (id) do nothing;

-- ──────────────────────────────────────────────────────────────
-- 5. SUBSCRIPTIONS  (from monthly register data — join date + package)
-- plan_id references: 0003=1M 0004=3M 0005=6M 0006=12M 0007=PT1M 0008=PT3M 0009=Couple 0010=10M
-- ──────────────────────────────────────────────────────────────
insert into public.subscriptions (id, member_id, plan_id, branch_id, start_date, end_date, status, price, discount_amount, gst_amount, total_amount)
values
-- Dec 2024 renewals
  ('eeeeeeee-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','bbbbbbbb-0004-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2024-12-13','2025-03-13','expired',6000,0,0,6000),
  ('eeeeeeee-0002-0000-0000-000000000001','dddddddd-0002-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2024-12-18','2025-12-18','expired',12000,0,0,12000),
  ('eeeeeeee-0003-0000-0000-000000000001','dddddddd-0003-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2024-12-25','2025-12-25','expired',13000,0,0,13000),
  ('eeeeeeee-0004-0000-0000-000000000001','dddddddd-0004-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2024-12-26','2025-12-26','expired',12000,0,0,12000),
  ('eeeeeeee-0005-0000-0000-000000000001','dddddddd-0005-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2024-12-20','2025-11-20','expired',12000,0,0,12000),
  ('eeeeeeee-0006-0000-0000-000000000001','dddddddd-0006-0000-0000-000000000001','bbbbbbbb-0005-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2024-12-24','2025-06-24','expired',6500,0,0,6500),
-- Jul 2025 batch
  ('eeeeeeee-0011-0000-0000-000000000001','dddddddd-0011-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2025-07-11','2026-07-11','active',14000,0,0,14000),
  ('eeeeeeee-0012-0000-0000-000000000001','dddddddd-0012-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2025-07-10','2026-07-10','active',15000,0,0,15000),
  ('eeeeeeee-0013-0000-0000-000000000001','dddddddd-0013-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2025-07-11','2026-07-11','active',10000,0,0,10000),
  ('eeeeeeee-0014-0000-0000-000000000001','dddddddd-0014-0000-0000-000000000001','bbbbbbbb-0009-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2025-07-14','2026-07-14','active',12000,0,0,12000),
  ('eeeeeeee-0016-0000-0000-000000000001','dddddddd-0016-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2025-07-21','2026-07-21','active',15000,0,0,15000),
  ('eeeeeeee-0022-0000-0000-000000000001','dddddddd-0022-0000-0000-000000000001','bbbbbbbb-0009-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2025-07-21','2026-07-21','active',30000,0,0,30000),
  ('eeeeeeee-0024-0000-0000-000000000001','dddddddd-0024-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2025-01-28','2026-01-28','active',24000,0,0,24000),
-- Feb 2025
  ('eeeeeeee-0026-0000-0000-000000000001','dddddddd-0026-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2025-02-10','2026-02-10','active',12000,0,0,12000),
  ('eeeeeeee-0027-0000-0000-000000000001','dddddddd-0027-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2025-02-15','2026-02-15','active',13000,0,0,13000),
  ('eeeeeeee-0031-0000-0000-000000000001','dddddddd-0031-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2025-02-26','2026-02-26','active',12000,0,0,12000),
-- Sep 2025
  ('eeeeeeee-0054-0000-0000-000000000001','dddddddd-0054-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2025-09-11','2026-09-11','active',15000,0,0,15000),
  ('eeeeeeee-0055-0000-0000-000000000001','dddddddd-0055-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2025-09-15','2026-09-15','active',16000,0,0,16000),
  ('eeeeeeee-0057-0000-0000-000000000001','dddddddd-0057-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2025-09-22','2026-09-22','active',15000,0,0,15000),
  ('eeeeeeee-0058-0000-0000-000000000001','dddddddd-0058-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2025-09-19','2026-09-19','active',15000,0,0,15000),
-- Dec 2025
  ('eeeeeeee-0059-0000-0000-000000000001','dddddddd-0059-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2025-12-09','2026-12-09','active',15000,0,0,15000),
  ('eeeeeeee-0097-0000-0000-000000000001','dddddddd-0097-0000-0000-000000000001','bbbbbbbb-0010-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2025-12-22','2026-10-22','active',50000,0,0,50000),
-- 2026 members
  ('eeeeeeee-0061-0000-0000-000000000001','dddddddd-0061-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2026-01-05','2027-01-05','active',14000,0,0,14000),
  ('eeeeeeee-0063-0000-0000-000000000001','dddddddd-0063-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2026-01-13','2027-01-13','active',60000,0,0,60000),
  ('eeeeeeee-0064-0000-0000-000000000001','dddddddd-0064-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2026-01-24','2027-01-24','active',13333,0,0,13333),
  ('eeeeeeee-0066-0000-0000-000000000001','dddddddd-0066-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2026-02-09','2027-02-09','active',16000,0,0,16000),
  ('eeeeeeee-0072-0000-0000-000000000001','dddddddd-0072-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2026-03-08','2027-03-08','active',15000,0,0,15000),
  ('eeeeeeee-0074-0000-0000-000000000001','dddddddd-0074-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2026-04-01','2027-04-01','active',15000,0,0,15000),
  ('eeeeeeee-0078-0000-0000-000000000001','dddddddd-0078-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2026-05-04','2027-05-04','active',15000,0,0,15000),
  ('eeeeeeee-0085-0000-0000-000000000001','dddddddd-0085-0000-0000-000000000001','bbbbbbbb-0005-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2026-06-03','2026-12-03','active',32000,0,0,32000),
  ('eeeeeeee-0086-0000-0000-000000000001','dddddddd-0086-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2026-06-17','2027-06-17','active',16000,0,0,16000),
  ('eeeeeeee-0088-0000-0000-000000000001','dddddddd-0088-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2026-07-01','2027-07-01','active',18000,0,0,18000),
  ('eeeeeeee-0089-0000-0000-000000000001','dddddddd-0089-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2026-07-27','2027-07-27','active',18000,0,0,18000),
  ('eeeeeeee-0090-0000-0000-000000000001','dddddddd-0090-0000-0000-000000000001','bbbbbbbb-0006-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2026-07-06','2027-07-06','active',18000,0,0,18000)
on conflict (id) do nothing;

-- ──────────────────────────────────────────────────────────────
-- 6. INVOICES  (one invoice per subscription/payment)
-- invoice_number uses the INV-YYYY-NNNNN pattern
-- ──────────────────────────────────────────────────────────────
insert into public.invoices (id, invoice_number, member_id, subscription_id, branch_id, subtotal, discount_amount, gst_amount, total_amount, amount_paid, balance_amount, status, payment_status, line_items)
values
  ('ffffffff-0001-0000-0000-000000000001','INV-2024-000001','dddddddd-0001-0000-0000-000000000001','eeeeeeee-0001-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',6000,0,0,6000,6000,0,'paid','completed','[{"description":"3 Month Renewal","amount":6000}]'),
  ('ffffffff-0002-0000-0000-000000000001','INV-2024-000002','dddddddd-0002-0000-0000-000000000001','eeeeeeee-0002-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',12000,0,0,12000,12000,0,'paid','completed','[{"description":"12 Month Membership","amount":12000}]'),
  ('ffffffff-0003-0000-0000-000000000001','INV-2024-000003','dddddddd-0003-0000-0000-000000000001','eeeeeeee-0003-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',13000,0,0,13000,13000,0,'paid','completed','[{"description":"12 Month Renewal","amount":13000}]'),
  ('ffffffff-0004-0000-0000-000000000001','INV-2024-000004','dddddddd-0004-0000-0000-000000000001','eeeeeeee-0004-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',12000,0,0,12000,12000,0,'paid','completed','[{"description":"12 Month Renewal","amount":12000}]'),
  ('ffffffff-0011-0000-0000-000000000001','INV-2025-000001','dddddddd-0011-0000-0000-000000000001','eeeeeeee-0011-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',14000,0,0,14000,14000,0,'paid','completed','[{"description":"12 Month Membership","amount":14000}]'),
  ('ffffffff-0012-0000-0000-000000000001','INV-2025-000002','dddddddd-0012-0000-0000-000000000001','eeeeeeee-0012-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',15000,0,0,15000,15000,0,'paid','completed','[{"description":"12 Month Membership","amount":15000}]'),
  ('ffffffff-0016-0000-0000-000000000001','INV-2025-000003','dddddddd-0016-0000-0000-000000000001','eeeeeeee-0016-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',15000,0,0,15000,15000,0,'paid','completed','[{"description":"12 Month Membership","amount":15000}]'),
  ('ffffffff-0022-0000-0000-000000000001','INV-2025-000004','dddddddd-0022-0000-0000-000000000001','eeeeeeee-0022-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',30000,0,0,30000,30000,0,'paid','completed','[{"description":"12 Month Couple Package","amount":30000}]'),
  ('ffffffff-0026-0000-0000-000000000001','INV-2025-000005','dddddddd-0026-0000-0000-000000000001','eeeeeeee-0026-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',12000,0,0,12000,12000,0,'paid','completed','[{"description":"12 Month Membership","amount":12000}]'),
  ('ffffffff-0054-0000-0000-000000000001','INV-2025-000006','dddddddd-0054-0000-0000-000000000001','eeeeeeee-0054-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',15000,0,0,15000,15000,0,'paid','completed','[{"description":"12 Month Membership","amount":15000}]'),
  ('ffffffff-0055-0000-0000-000000000001','INV-2025-000007','dddddddd-0055-0000-0000-000000000001','eeeeeeee-0055-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',16000,0,0,16000,16000,0,'paid','completed','[{"description":"12 Month Membership","amount":16000}]'),
  ('ffffffff-0059-0000-0000-000000000001','INV-2025-000008','dddddddd-0059-0000-0000-000000000001','eeeeeeee-0059-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',15000,0,0,15000,15000,0,'paid','completed','[{"description":"12 Month Membership","amount":15000}]'),
  ('ffffffff-0061-0000-0000-000000000001','INV-2026-000001','dddddddd-0061-0000-0000-000000000001','eeeeeeee-0061-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',14000,0,0,14000,14000,0,'paid','completed','[{"description":"12 Month Membership","amount":14000}]'),
  ('ffffffff-0063-0000-0000-000000000001','INV-2026-000002','dddddddd-0063-0000-0000-000000000001','eeeeeeee-0063-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',60000,0,0,60000,60000,0,'paid','completed','[{"description":"12 Month Premium Membership","amount":60000}]'),
  ('ffffffff-0072-0000-0000-000000000001','INV-2026-000003','dddddddd-0072-0000-0000-000000000001','eeeeeeee-0072-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',15000,0,0,15000,15000,0,'paid','completed','[{"description":"12 Month Membership","amount":15000}]'),
  ('ffffffff-0085-0000-0000-000000000001','INV-2026-000004','dddddddd-0085-0000-0000-000000000001','eeeeeeee-0085-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',32000,0,0,32000,32000,0,'paid','completed','[{"description":"6 Month PT Package (Jatin)","amount":32000}]'),
  ('ffffffff-0088-0000-0000-000000000001','INV-2026-000005','dddddddd-0088-0000-0000-000000000001','eeeeeeee-0088-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',18000,0,0,18000,18000,0,'paid','completed','[{"description":"12 Month Membership","amount":18000}]'),
  -- Partial payment example (balance pending)
  ('ffffffff-0097-0000-0000-000000000001','INV-2025-000009','dddddddd-0097-0000-0000-000000000001','eeeeeeee-0097-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',50000,0,0,50000,36000,14000,'partial','partial','[{"description":"10 Month PT Package","amount":50000}]')
on conflict (id) do nothing;

-- ──────────────────────────────────────────────────────────────
-- 7. PAYMENTS  (from daily sale sheets — real amounts, methods, dates)
-- UPI KOTAK = upi, CARD = card, CASH = cash
-- ──────────────────────────────────────────────────────────────
insert into public.payments (id, invoice_id, member_id, branch_id, amount, method, status, transaction_reference, paid_at, refund_amount)
values
-- Dec 2024 (from daily sale sheet)
  ('gggggggg-0001-0000-0000-000000000001','ffffffff-0001-0000-0000-000000000001','dddddddd-0001-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',6000,'upi','completed','KOTAK-DEC-001','2024-12-13T10:00:00+05:30',0),
  ('gggggggg-0002-0000-0000-000000000001','ffffffff-0002-0000-0000-000000000001','dddddddd-0002-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',12000,'card','completed','CARD-DEC-002','2024-12-18T11:00:00+05:30',0),
  ('gggggggg-0003-0000-0000-000000000001','ffffffff-0003-0000-0000-000000000001','dddddddd-0003-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',13000,'upi','completed','KOTAK-DEC-003','2024-12-25T09:30:00+05:30',0),
  ('gggggggg-0004-0000-0000-000000000001','ffffffff-0004-0000-0000-000000000001','dddddddd-0004-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',12000,'card','completed','CARD-DEC-004','2024-12-26T10:00:00+05:30',0),
-- Jan 2025 daily sale sheet payments
  ('gggggggg-0011-0000-0000-000000000001','ffffffff-0011-0000-0000-000000000001','dddddddd-0011-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',14000,'cash','completed','CASH-JUL25-001','2025-07-11T10:00:00+05:30',0),
  ('gggggggg-0012-0000-0000-000000000001','ffffffff-0012-0000-0000-000000000001','dddddddd-0012-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',15000,'cash','completed','CASH-JUL25-002','2025-07-10T11:00:00+05:30',0),
  ('gggggggg-0016-0000-0000-000000000001','ffffffff-0016-0000-0000-000000000001','dddddddd-0016-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',15000,'cash','completed','CASH-JUL25-003','2025-07-21T09:00:00+05:30',0),
  ('gggggggg-0022-0000-0000-000000000001','ffffffff-0022-0000-0000-000000000001','dddddddd-0022-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',30000,'cash','completed','CASH-JUL25-004','2025-07-21T10:30:00+05:30',0),
  ('gggggggg-0026-0000-0000-000000000001','ffffffff-0026-0000-0000-000000000001','dddddddd-0026-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',12000,'upi','completed','KOTAK-FEB25-001','2025-02-10T11:00:00+05:30',0),
  ('gggggggg-0054-0000-0000-000000000001','ffffffff-0054-0000-0000-000000000001','dddddddd-0054-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',15000,'cash','completed','CASH-SEP25-001','2025-09-11T10:00:00+05:30',0),
  ('gggggggg-0055-0000-0000-000000000001','ffffffff-0055-0000-0000-000000000001','dddddddd-0055-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',16000,'cash','completed','CASH-SEP25-002','2025-09-15T11:00:00+05:30',0),
  ('gggggggg-0059-0000-0000-000000000001','ffffffff-0059-0000-0000-000000000001','dddddddd-0059-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',15000,'cash','completed','CASH-DEC25-001','2025-12-09T10:00:00+05:30',0),
  ('gggggggg-0061-0000-0000-000000000001','ffffffff-0061-0000-0000-000000000001','dddddddd-0061-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',14000,'cash','completed','CASH-JAN26-001','2026-01-05T10:00:00+05:30',0),
  ('gggggggg-0063-0000-0000-000000000001','ffffffff-0063-0000-0000-000000000001','dddddddd-0063-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',60000,'upi','completed','KOTAK-JAN26-001','2026-01-13T11:00:00+05:30',0),
  ('gggggggg-0072-0000-0000-000000000001','ffffffff-0072-0000-0000-000000000001','dddddddd-0072-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',15000,'cash','completed','CASH-MAR26-001','2026-03-08T10:00:00+05:30',0),
  ('gggggggg-0085-0000-0000-000000000001','ffffffff-0085-0000-0000-000000000001','dddddddd-0085-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',32000,'upi','completed','KOTAK-JUN26-001','2026-06-03T11:00:00+05:30',0),
  ('gggggggg-0088-0000-0000-000000000001','ffffffff-0088-0000-0000-000000000001','dddddddd-0088-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',18000,'cash','completed','CASH-JUL26-001','2026-07-01T10:00:00+05:30',0),
  -- Partial payments
  ('gggggggg-0097-0000-0000-000000000001','ffffffff-0097-0000-0000-000000000001','dddddddd-0097-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',36000,'cash','completed','CASH-DEC25-002','2025-12-22T10:00:00+05:30',0)
on conflict (id) do nothing;

-- ──────────────────────────────────────────────────────────────
-- 8. ATTENDANCE  (simulated eBioServer face-machine records)
-- Real pattern from the data: members come 4-6 days/week
-- device_id = EBIO-MAIN-001, machine_user_id = MU-XXX
-- Entry ~6:00–9:00 AM, Exit ~7:00–10:00 AM or evening batch
-- ──────────────────────────────────────────────────────────────

-- Helper: generate 30 days of attendance for active members
-- We insert individual rows for the past 30 days for 20 key members

insert into public.attendance (member_id, branch_id, device_id, machine_user_id, attendance_date, entry_time, exit_time, source)
select
  m.id,
  'aaaaaaaa-0000-0000-0000-000000000001',
  'EBIO-MAIN-001',
  m.machine_user_id,
  gs::date,
  (gs + (floor(random()*3)||' hours')::interval + '06:00:00'::interval)::timestamptz,
  (gs + (floor(random()*3)||' hours')::interval + '07:30:00'::interval)::timestamptz,
  'face_machine'
from
  generate_series(current_date - interval '30 days', current_date - interval '1 day', '1 day') gs,
  public.members m
where
  m.branch_id = 'aaaaaaaa-0000-0000-0000-000000000001'
  and m.status = 'active'
  and m.id in (
    'dddddddd-0011-0000-0000-000000000001',
    'dddddddd-0012-0000-0000-000000000001',
    'dddddddd-0016-0000-0000-000000000001',
    'dddddddd-0026-0000-0000-000000000001',
    'dddddddd-0027-0000-0000-000000000001',
    'dddddddd-0033-0000-0000-000000000001',
    'dddddddd-0054-0000-0000-000000000001',
    'dddddddd-0055-0000-0000-000000000001',
    'dddddddd-0060-0000-0000-000000000001',
    'dddddddd-0061-0000-0000-000000000001',
    'dddddddd-0064-0000-0000-000000000001',
    'dddddddd-0072-0000-0000-000000000001',
    'dddddddd-0078-0000-0000-000000000001',
    'dddddddd-0082-0000-0000-000000000001',
    'dddddddd-0085-0000-0000-000000000001',
    'dddddddd-0088-0000-0000-000000000001',
    'dddddddd-0090-0000-0000-000000000001',
    'dddddddd-0091-0000-0000-000000000001',
    'dddddddd-0097-0000-0000-000000000001',
    'dddddddd-0100-0000-0000-000000000001'
  )
  -- skip Sundays (typical gym off-day) and random 20% absence
  and extract(dow from gs) <> 0
  and random() > 0.20
on conflict (member_id, attendance_date) do nothing;

-- Today's attendance — morning batch already in
insert into public.attendance (member_id, branch_id, device_id, machine_user_id, attendance_date, entry_time, exit_time, source)
values
  ('dddddddd-0011-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','EBIO-MAIN-001','MU-011',current_date, now() - interval '2 hours', now() - interval '15 minutes','face_machine'),
  ('dddddddd-0054-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','EBIO-MAIN-001','MU-054',current_date, now() - interval '1 hour 50 minutes', now() - interval '20 minutes','face_machine'),
  ('dddddddd-0072-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','EBIO-MAIN-001','MU-072',current_date, now() - interval '1 hour 30 minutes', null,'face_machine'),
  ('dddddddd-0085-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','EBIO-MAIN-001','MU-085',current_date, now() - interval '1 hour', null,'face_machine'),
  ('dddddddd-0088-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','EBIO-MAIN-001','MU-088',current_date, now() - interval '45 minutes', null,'face_machine'),
  ('dddddddd-0090-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','EBIO-MAIN-001','MU-090',current_date, now() - interval '30 minutes', null,'face_machine'),
  ('dddddddd-0091-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','EBIO-MAIN-001','MU-091',current_date, now() - interval '20 minutes', null,'face_machine')
on conflict (member_id, attendance_date) do nothing;

-- Sync log entries for the eBioServer device
insert into public.attendance_sync_logs (
  machine_id, branch_id, external_event_id, device_id, machine_user_id,
  event_type, event_at, status, synced_at
)
select
  'cccccccc-0001-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'EBIO-' || m.machine_user_id || '-' || to_char(a.attendance_date,'YYYYMMDD') || '-ENTRY',
  'EBIO-MAIN-001',
  m.machine_user_id,
  'entry',
  a.entry_time,
  'processed',
  a.entry_time + interval '5 seconds'
from public.attendance a
join public.members m on m.id = a.member_id
where a.branch_id = 'aaaaaaaa-0000-0000-0000-000000000001'
  and a.entry_time is not null
  and a.attendance_date >= current_date - interval '7 days'
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- 9. RECEIVABLES  (outstanding dues from partial payments)
-- ──────────────────────────────────────────────────────────────
insert into public.receivables (id, branch_id, member_id, invoice_id, subscription_id, receivable_type, original_amount, paid_amount, balance_amount, due_date, status)
values
  -- Rohini Lahane: 10M PT package ₹50,000 — paid ₹36,000, balance ₹14,000
  ('hhhhhhhh-0001-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
   'dddddddd-0097-0000-0000-000000000001','ffffffff-0097-0000-0000-000000000001',
   'eeeeeeee-0097-0000-0000-000000000001','pt',50000,36000,14000,
   current_date + interval '15 days','partial'),
  -- Zaid Khan: 12M ₹16,000 — paid ₹10,000, balance ₹6,000
  ('hhhhhhhh-0002-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
   'dddddddd-0096-0000-0000-000000000001',null,null,'membership',16000,10000,6000,
   current_date + interval '7 days','partial'),
  -- Akshita Mundada: 6M PT ₹20,000 — no payment yet
  ('hhhhhhhh-0003-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
   'dddddddd-0064-0000-0000-000000000001',null,null,'pt',20000,0,20000,
   current_date - interval '5 days','overdue'),
  -- Muzzamil Panjwani: renewal pending balance
  ('hhhhhhhh-0004-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
   'dddddddd-0063-0000-0000-000000000001',null,null,'membership',60000,60000,0,null,'paid')
on conflict (id) do nothing;

-- ──────────────────────────────────────────────────────────────
-- 10. INCOME entries  (auto-created by trigger from payments above,
--     but we also seed manual non-membership income for the demo
--     so finance charts show realistic category breakdown)
-- ──────────────────────────────────────────────────────────────

-- Get income category IDs seeded in 0005_finance_module
-- MEM=Membership, PT=Personal Training, SUPP=Supplements, LOCK=Locker Rent, OTH=Other Income
-- We insert manual income entries for the past 6 months

insert into public.income (
  branch_id, category_id, member_id,
  amount, gst_amount, total_amount, payment_method,
  income_date, description, status, is_membership_income
)
select
  'aaaaaaaa-0000-0000-0000-000000000001',
  ic.id,
  null,
  v.amount,
  round(v.amount * 0.18),
  v.amount + round(v.amount * 0.18),
  v.method::public.payment_method,
  v.idate::date,
  v.descr,
  'posted',
  false
from (values
  -- Supplements income
  ('SUPP', 1200, 'cash',   (current_date - interval '2 days')::text,  'Protein supplement – walk-in sale'),
  ('SUPP', 2500, 'upi',    (current_date - interval '5 days')::text,  'Whey protein – Khushi Ahuja'),
  ('SUPP', 800,  'cash',   (current_date - interval '8 days')::text,  'BCAA supplement – counter sale'),
  -- Locker rent
  ('LOCK', 500,  'cash',   (current_date - interval '1 day')::text,   'Monthly locker rent – batch A'),
  ('LOCK', 500,  'cash',   (current_date - interval '3 days')::text,  'Monthly locker rent – batch B'),
  ('LOCK', 500,  'upi',    (current_date - interval '10 days')::text, 'Monthly locker rent – batch C'),
  -- Diet consultation
  ('DIET', 2000, 'upi',    (current_date - interval '4 days')::text,  'Diet consultation – Vaishali Metkar'),
  ('DIET', 2000, 'cash',   (current_date - interval '12 days')::text, 'Nutrition plan – Sangita Salunke'),
  -- Other income
  ('OTH',  500,  'cash',   (current_date - interval '6 days')::text,  'Guest day pass × 2'),
  ('OTH',  300,  'cash',   (current_date - interval '9 days')::text,  'Guest day pass × 1'),
  ('OTH',  1000, 'upi',    (current_date - interval '15 days')::text, 'Event registration – fitness challenge'),
  -- Last month supplements
  ('SUPP', 3600, 'upi',    (current_date - interval '20 days')::text, 'Supplement bundle – monthly'),
  ('SUPP', 1800, 'cash',   (current_date - interval '25 days')::text, 'Creatine & multivitamin – counter'),
  -- Personal training top-up
  ('PT',   5000, 'cash',   (current_date - interval '7 days')::text,  'Extra PT sessions – Pallavi Rathi'),
  ('PT',   7000, 'upi',    (current_date - interval '14 days')::text, 'PT package add-on – Shitiz Sarvaiya')
) as v(code, amount, method, idate, descr)
join public.income_categories ic on ic.code = v.code
  and (ic.branch_id = 'aaaaaaaa-0000-0000-0000-000000000001' or ic.branch_id is null)
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- 11. EXPENSES  (from the Dec 2024 daily sale sheet expense list
--     + typical monthly gym expenses — all real categories)
-- ──────────────────────────────────────────────────────────────
insert into public.expenses (
  branch_id, category_id,
  amount, gst_amount, total_amount, payment_method,
  bill_number, expense_date, description,
  approval_status, status
)
select
  'aaaaaaaa-0000-0000-0000-000000000001',
  ec.id,
  v.amount,
  round(v.amount * 0.18),
  v.amount + round(v.amount * 0.18),
  v.method::public.payment_method,
  v.billno,
  v.edate::date,
  v.descr,
  'approved'::public.expense_approval_status,
  'posted'::public.fin_txn_status
from (values
  -- From the Dec 2024 sheet (real figures)
  ('ELEC',  189250,'cash',   'MSEDCL-JAN25',  (current_date - interval '20 days')::text, 'Electricity bill – January 2025'),
  ('WATER',   2440,'cash',   'MJP-DEC24',     (current_date - interval '45 days')::text, 'Water bill – December 2024'),
  ('WATER',   2440,'cash',   'MJP-JAN25',     (current_date - interval '15 days')::text, 'Water bill – January 2025'),
  ('HK',      2580,'cash',   null,            (current_date - interval '18 days')::text, 'Housekeeping items'),
  ('HK',       250,'cash',   null,            (current_date - interval '30 days')::text, 'Antiseptic / cleaning supplies'),
  -- Salaries (from Dec 2024 sheet – staff payments)
  ('SAL',    33300,'cash',   'SAL-ASHISH-DEC','2025-07-01', 'Salary – Ashish Dahat Sir'),
  ('SAL',    25800,'cash',   'SAL-HARSHAL-DEC','2025-07-01','Salary – Harshal Yawale Sir'),
  ('SAL',    11530,'cash',   'SAL-AACHAL-DEC','2025-07-01', 'Salary – Aachal Chauhan Ma''am'),
  ('SAL',     8700,'cash',   'SAL-RUPESH-DEC','2025-07-01', 'Salary – Rupesh Shirbhate Sir'),
  ('SAL',     8500,'cash',   'SAL-SHUBHAM-DEC','2025-07-01','Salary – Shubham Dada'),
  ('SAL',     8000,'cash',   'SAL-SHASHI-DEC','2025-07-01', 'Salary – Shashikant Sir'),
  ('SAL',     7250,'cash',   'SAL-KARTIK-DEC','2025-07-01', 'Salary – Kartik Dada'),
  ('SAL',     7150,'cash',   'SAL-GAURAV-DEC','2025-07-01', 'Salary – Gaurav Wankhade Sir'),
  ('SAL',     6870,'cash',   'SAL-POOJA-DEC','2025-07-01',  'Salary – Pooja Khadse Ma''am'),
  ('SAL',     6750,'cash',   'SAL-SAMEER-DEC','2025-07-01', 'Salary – Sameer Dada'),
  ('SAL',     5500,'cash',   'SAL-DOLLY-DEC','2025-07-01',  'Salary – Dolly Ma''am'),
  ('SAL',     5470,'cash',   'SAL-PRITI-DEC','2025-07-01',  'Salary – Priti Ma''am'),
  ('SAL',     3500,'cash',   'SAL-SUNNY-DEC','2025-07-01',  'Salary – Sunny Mohod Sir'),
  ('SAL',     3200,'cash',   'SAL-YOGESH-DEC','2025-07-01', 'Salary – Yogesh Wankhade Sir'),
  ('SAL',     2950,'cash',   'SAL-PRANAVI-DEC','2025-07-01','Salary – Pranavi Ma''am'),
  ('SAL',     1870,'cash',   'SAL-NEHA-DEC','2025-07-01',   'Salary – Neha Ma''am'),
  ('SAL',     1100,'cash',   'SAL-ANURA-DEC','2025-07-01',  'Salary – Anuradha'),
  ('SAL',     1050,'cash',   'SAL-MAYUR-DEC','2025-07-01',  'Salary – Mayur Sir'),
  -- Equipment maintenance
  ('EQMT',  12000,'cash',   'BELT-TREAD-DEC','2024-12-31',  'Treadmill belt replacement'),
  ('EQMT',   6000,'cash',   'MATRIX-DEC',    '2024-12-23',  'Manoj Matrix machine repair'),
  -- Repairs & misc
  ('REP',      600,'cash',   null,            '2024-12-31',  'Cable fitting'),
  ('REP',      500,'cash',   null,            '2024-12-25',  'CCTV camera fitting'),
  ('REP',      460,'cash',   null,            '2024-12-31',  'Sit cover replacement'),
  ('REP',      360,'cash',   null,            '2024-12-31',  'News paper bill – December'),
  ('REP',      350,'cash',   null,            '2024-12-31',  'Carpenter work'),
  ('REP',      320,'cash',   null,            '2024-12-31',  'QR code installation'),
  ('REP',      200,'cash',   null,            '2024-12-31',  'Hand shower fitting'),
  ('REP',      100,'cash',   null,            '2024-12-31',  'Shower pipe repair'),
  -- Marketing
  ('MKT',     3500,'cash',   null,            '2024-12-31',  'Sneha Chandak – Life Coach session'),
  ('MKT',     1000,'cash',   null,            '2024-12-31',  'New Year celebration – balloons & skipping ropes'),
  -- Office supplies
  ('OFC',      950,'cash',   null,            '2024-12-31',  'Cushion cover replacement × 2'),
  ('OFC',      850,'cash',   null,            '2024-12-31',  'Cushion cover – main area'),
  ('OFC',      340,'cash',   null,            '2024-12-01',  'News paper bill – November'),
  -- Current month typical expenses
  ('ELEC',  195000,'upi',   'MSEDCL-CUR',    (current_date - interval '5 days')::text,   'Electricity bill – current month'),
  ('WATER',   2440,'cash',   'MJP-CUR',      (current_date - interval '3 days')::text,   'Water bill – current month'),
  ('NET',     1200,'upi',   'ISP-CUR',       (current_date - interval '2 days')::text,   'Broadband internet – monthly'),
  ('MISC',    1500,'cash',   null,           (current_date - interval '1 day')::text,    'Miscellaneous – petty cash')
) as v(code, amount, method, billno, edate, descr)
join public.expense_categories ec on ec.code = v.code
  and (ec.branch_id = 'aaaaaaaa-0000-0000-0000-000000000001' or ec.branch_id is null)
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- 12. CASH BOOK  (manual entries for non-payment cash flows —
--     cash payments are auto-inserted via trigger from payments,
--     here we add expense disbursements and opening balance)
-- ──────────────────────────────────────────────────────────────
insert into public.cash_book (
  branch_id, entry_date, entry_type, amount, balance_after, description, status
)
values
  -- Opening balance (from Dec 31, 2024 sheet: cash in hand ₹1,50,992)
  ('aaaaaaaa-0000-0000-0000-000000000001', '2025-01-01', 'credit', 150992, 150992, 'Opening balance – carried forward from December 2024', 'posted'),
  -- Salary disbursements (cash out — July 2025)
  ('aaaaaaaa-0000-0000-0000-000000000001', '2025-07-01', 'debit', 33300, 0, 'Salary – Ashish Dahat Sir', 'posted'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '2025-07-01', 'debit', 25800, 0, 'Salary – Harshal Yawale Sir', 'posted'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '2025-07-01', 'debit', 11530, 0, 'Salary – Aachal Chauhan Ma''am', 'posted'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '2025-07-01', 'debit', 8700,  0, 'Salary – Rupesh Shirbhate Sir', 'posted'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '2025-07-01', 'debit', 8500,  0, 'Salary – Shubham Dada', 'posted'),
  -- Recent cash collections (current month)
  ('aaaaaaaa-0000-0000-0000-000000000001', current_date - interval '2 days', 'credit', 15000, 0, 'Cash membership – Karan Jayaswal 12M', 'posted'),
  ('aaaaaaaa-0000-0000-0000-000000000001', current_date - interval '3 days', 'credit', 7500,  0, 'Cash membership – 3M renewal', 'posted'),
  ('aaaaaaaa-0000-0000-0000-000000000001', current_date - interval '4 days', 'credit', 3000,  0, 'Cash membership – 1M new', 'posted'),
  ('aaaaaaaa-0000-0000-0000-000000000001', current_date - interval '1 day',  'debit',  2440,  0, 'Cash – water bill payment', 'posted'),
  ('aaaaaaaa-0000-0000-0000-000000000001', current_date - interval '1 day',  'debit',  1500,  0, 'Cash – petty expenses', 'posted')
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- 13. NOTIFICATIONS  (expiry reminders — realistic demo data)
-- ──────────────────────────────────────────────────────────────
insert into public.notifications (
  member_id, branch_id, type, title, message, channels, scheduled_for, metadata
)
values
  -- Expiring in 7 days
  ('dddddddd-0011-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
   'membership_expiry_reminder','Membership expires in 7 days',
   'Dear Vipul Pinjani, your membership expires on ' || to_char(current_date + interval '7 days','DD-Mon-YYYY') || '. Renew now to continue.',
   '{dashboard,email}', current_date + interval '7 days', '{"remaining_days":7}'),
  ('dddddddd-0033-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
   'membership_expiry_reminder','Membership expires in 7 days',
   'Dear Bhishma Gaglani, your membership expires soon. Renew to maintain uninterrupted access.',
   '{dashboard}', current_date + interval '7 days', '{"remaining_days":7}'),
  -- Expiring in 15 days
  ('dddddddd-0026-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
   'membership_expiry_reminder','Membership expires in 15 days',
   'Dear Rohit Agrawal, your membership expires in 15 days. Plan your renewal early.',
   '{dashboard}', current_date + interval '15 days', '{"remaining_days":15}'),
  -- Overdue payment reminder
  ('dddddddd-0097-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
   'payment_due','Outstanding balance ₹14,000',
   'Dear Rohini Lahane, you have an outstanding PT package balance of ₹14,000. Please clear at the reception.',
   '{dashboard,sms}', current_date, '{"balance":14000}'),
  -- Welcome notification
  ('dddddddd-0088-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
   'welcome','Welcome to SyncFyre Fitness!',
   'Welcome Karan Jayaswal! Your 12-month membership is active. Visit us 6 days a week for best results.',
   '{dashboard}', current_date - interval '1 day', '{}')
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- 14. ACTIVITY LOGS  (realistic audit trail for the dashboard)
-- ──────────────────────────────────────────────────────────────
insert into public.activity_logs (user_id, branch_id, action, entity_type, entity_id, description, created_at)
values
  (null,'aaaaaaaa-0000-0000-0000-000000000001','member_registered','member','dddddddd-0088-0000-0000-000000000001','Karan Jayaswal registered – 12M membership', current_date - interval '1 day'),
  (null,'aaaaaaaa-0000-0000-0000-000000000001','payment_collected','payment','gggggggg-0088-0000-0000-000000000001','Payment ₹18,000 collected – Karan Jayaswal', current_date - interval '1 day'),
  (null,'aaaaaaaa-0000-0000-0000-000000000001','member_registered','member','dddddddd-0089-0000-0000-000000000001','Shlok Panpaliya registered – 12M membership', current_date - interval '4 days'),
  (null,'aaaaaaaa-0000-0000-0000-000000000001','membership_renewed','subscription','eeeeeeee-0085-0000-0000-000000000001','Jatin Shah renewed – 6M PT package', current_date - interval '5 days'),
  (null,'aaaaaaaa-0000-0000-0000-000000000001','payment_collected','payment','gggggggg-0085-0000-0000-000000000001','Payment ₹32,000 collected – Jatin Shah PT', current_date - interval '5 days'),
  (null,'aaaaaaaa-0000-0000-0000-000000000001','expense_approved','expense',null,'Electricity bill ₹1,95,000 approved', current_date - interval '5 days'),
  (null,'aaaaaaaa-0000-0000-0000-000000000001','attendance_synced','attendance',null,'eBioServer sync: 7 entries processed', now() - interval '2 hours'),
  (null,'aaaaaaaa-0000-0000-0000-000000000001','member_registered','member','dddddddd-0086-0000-0000-000000000001','Chandrakant Shinde registered – 12M membership', current_date - interval '7 days'),
  (null,'aaaaaaaa-0000-0000-0000-000000000001','salary_paid','expense',null,'July 2025 salaries disbursed – ₹1,20,000+', current_date - interval '14 days'),
  (null,'aaaaaaaa-0000-0000-0000-000000000001','member_registered','member','dddddddd-0082-0000-0000-000000000001','Kushal Gaglani registered – 12M membership', current_date - interval '16 days')
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- 15. BANK ACCOUNT  (gym's current account for demo)
-- ──────────────────────────────────────────────────────────────
insert into public.bank_accounts (id, branch_id, account_name, bank_name, account_number, ifsc_code, account_type, opening_balance, current_balance, is_default, status)
values (
  'iiiiiiii-0001-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'SyncFyre Fitness – Operations A/C',
  'Kotak Mahindra Bank',
  'XXXX-XXXX-XXXX-7842',
  'KKBK0007842',
  'current',
  0,
  330962,   -- from Jan 2025 closing balance in the sheet
  true,
  'active'
) on conflict (id) do nothing;

-- Bank transactions (UPI/card settlements from payments)
insert into public.bank_transactions (branch_id, bank_account_id, txn_type, amount, balance_after, reference_no, txn_date, description, is_reconciled, status)
values
  ('aaaaaaaa-0000-0000-0000-000000000001','iiiiiiii-0001-0000-0000-000000000001','deposit',12000,12000,'KOTAK-DEC-002','2024-12-18','UPI settlement – Vishal Mirani 12M',true,'posted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','iiiiiiii-0001-0000-0000-000000000001','deposit',13000,25000,'KOTAK-DEC-003','2024-12-25','UPI settlement – Pankaj Rathi 12M',true,'posted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','iiiiiiii-0001-0000-0000-000000000001','deposit',12000,37000,'CARD-DEC-004','2024-12-26','Card settlement – D T Ingole 12M',true,'posted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','iiiiiiii-0001-0000-0000-000000000001','deposit',60000,97000,'KOTAK-JAN26-001','2026-01-13','UPI – Muzzamil Panjwani 12M premium',true,'posted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','iiiiiiii-0001-0000-0000-000000000001','deposit',32000,129000,'KOTAK-JUN26-001','2026-06-03','UPI – Jatin Shah 6M PT',true,'posted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','iiiiiiii-0001-0000-0000-000000000001','deposit',18000,147000,'KOTAK-JUL26-001','2026-07-01','UPI – Karan Jayaswal 12M',false,'posted'),
  ('aaaaaaaa-0000-0000-0000-000000000001','iiiiiiii-0001-0000-0000-000000000001','withdrawal',189250,330962,'MSEDCL-JAN25','2025-01-21','Electricity bill – MSEDCL payment',true,'posted')
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- 16. FINANCE SETTINGS  (GST config for the branch)
-- ──────────────────────────────────────────────────────────────
insert into public.finance_settings (
  branch_id, gstin, gst_registered,
  default_cgst_rate, default_sgst_rate, default_igst_rate,
  fiscal_year_start_month, invoice_prefix, receipt_prefix,
  invoice_footer_note, cash_opening_balance, bank_account_id
)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  '27AABCS1234A1Z5',   -- sample GSTIN for Maharashtra
  true,
  9.00, 9.00, 0.00,
  4,      -- April (Indian FY)
  'INV',
  'RCP',
  'Thank you for choosing SyncFyre Fitness. GST invoice. All amounts in INR.',
  150992, -- from Dec 2024 closing
  'iiiiiiii-0001-0000-0000-000000000001'
) on conflict (branch_id) do nothing;

-- ──────────────────────────────────────────────────────────────
-- END
-- ──────────────────────────────────────────────────────────────
commit;
