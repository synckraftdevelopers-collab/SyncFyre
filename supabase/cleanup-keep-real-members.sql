-- ================================================================
-- Keep ONLY real members from the July 2026 Excel sheet.
-- Deletes everyone inserted by the seed scripts who is NOT
-- in the actual gym register.
-- ================================================================

begin;

-- Step 1: See current count before cleanup
-- select count(*) from public.members where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8';

-- Step 2: Delete ALL seeded members from this branch
-- Must delete child records first due to foreign key constraints
delete from public.receivables
where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
  and member_id in (
    select id from public.members
    where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
      and (phone like '900%' or phone like '901%' or phone like '902%')
  );

delete from public.payments
where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
  and member_id in (
    select id from public.members
    where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
      and (phone like '900%' or phone like '901%' or phone like '902%')
  );

delete from public.invoices
where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
  and member_id in (
    select id from public.members
    where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
      and (phone like '900%' or phone like '901%' or phone like '902%')
  );

delete from public.subscriptions
where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
  and member_id in (
    select id from public.members
    where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
      and (phone like '900%' or phone like '901%' or phone like '902%')
  );

delete from public.attendance
where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
  and member_id in (
    select id from public.members
    where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
      and (phone like '900%' or phone like '901%' or phone like '902%')
  );

delete from public.members
where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
  and (phone like '900%' or phone like '901%' or phone like '902%');
      and phone like '900%'
  );

delete from public.members
where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8'
  and phone like '900%';

-- Step 3: Insert ONLY verified real members from the July 2026 sheet
-- Unique people (gym + PT entries merged into one person)
insert into public.members (branch_id, full_name, gender, phone, status, created_at) values
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Nirmala Bhoi',           'female', '9100000001', 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Anjali Pawar',           'female', '9100000002', 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Girish Rathi',           'male',   '9100000003', 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Rajeshwari Yashwante',   'female', '9100000004', 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Sujata Tidke',           'female', '9100000005', 'active', '2026-07-02'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Zaid Khan',              'male',   '9100000006', 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Wajesh Mohammad',        'male',   '9100000007', 'active', '2026-07-02'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Munindra Ingle',         'male',   '9100000008', 'active', '2026-07-02'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Koyana Kardekar',        'female', '9100000009', 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Piyush Lokhande',        'male',   '9100000010', 'active', '2026-07-06'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Rahul Ingle',            'male',   '9100000011', 'active', '2026-07-02'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Janhvi Taywade',         'female', '9100000012', 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Dr Shrikant',            'male',   '9100000013', 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Dr Vinay',               'male',   '9100000014', 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Dr Sanjay',              'male',   '9100000015', 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Neelam Wankhade',        'female', '9100000016', 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Atul Wankhade',          'male',   '9100000017', 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Vidya Lahe',             'female', '9100000018', 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Rizwan Shah',            'male',   '9100000019', 'active', '2026-07-30'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Karan Jayaswal',         'male',   '9100000020', 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Angel Jain',             'female', '9100000021', 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Sahu Adhau',             'male',   '9100000022', 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Balkrishna Adhau',       'male',   '9100000023', 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Kunal Wankhade',         'male',   '9100000024', 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Aman Shyed',             'male',   '9100000025', 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Amrut Deshmukh',         'male',   '9100000026', 'active', '2026-07-26'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Sharukh Janwani',        'male',   '9100000027', 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Yash Hingankar',         'male',   '9100000028', 'active', '2026-07-02'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Aman Amlani',            'male',   '9100000029', 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Mukund Gupta',           'male',   '9100000030', 'active', '2026-07-03'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Piyush Kumar',           'male',   '9100000031', 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Vrajesh Karwa',          'male',   '9100000032', 'active', '2026-07-05'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Prashant Mandlik',       'male',   '9100000033', 'active', '2026-07-04'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Deepak Lokhande',        'male',   '9100000034', 'active', '2026-07-05'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Abhimanyu Bhargav',      'male',   '9100000035', 'active', '2026-07-02'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Nandkishor Kale',        'male',   '9100000036', 'active', '2026-07-07'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Shubham Khandelwal',     'male',   '9100000037', 'active', '2026-07-06'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Ankush Wankhade',        'male',   '9100000038', 'active', '2026-07-07'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Neha Laddha',            'female', '9100000039', 'active', '2026-07-07'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Gauri Dahane',           'female', '9100000040', 'active', '2026-07-05'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Rakhi Wankhade',         'female', '9100000041', 'active', '2026-07-10'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Himanshu',               'male',   '9100000042', 'active', '2026-07-07'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Sonal Gupta',            'female', '9100000043', 'active', '2026-07-07'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Padmashree Deshmukh',    'female', '9100000044', 'active', '2026-07-08'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Mohammad Kaif',          'male',   '9100000045', 'active', '2026-07-09'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Shifa Khan',             'female', '9100000046', 'active', '2026-07-09'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Aashna Rathi',           'female', '9100000047', 'active', '2026-07-09'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Takshak Pays',           'male',   '9100000048', 'active', '2026-07-09'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Purvesh Nishan',         'male',   '9100000049', 'active', '2026-07-11'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Palak Wavre',            'female', '9100000050', 'active', '2026-07-13'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Burhan Jamnagarwala',    'male',   '9100000051', 'active', '2026-07-14'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Vaibhav Deshmukh',       'male',   '9100000052', 'active', '2026-07-14'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Tirthesh Singh',         'male',   '9100000053', 'active', '2026-07-14'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Ashish Sir Friend',      'male',   '9100000054', 'active', '2026-07-14'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Sarthak Sir',            'male',   '9100000055', 'active', '2026-07-14'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Dipti Vaishali Anjali',  'female', '9100000056', 'active', '2026-07-14'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Gunjan Mandlik',         'female', '9100000057', 'active', '2026-07-30'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Anil Killekar',          'male',   '9100000058', 'active', '2026-07-26'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Aarti Bhargav',          'female', '9100000059', 'active', '2026-07-09'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Aditi Ingole',           'female', '9100000060', 'active', '2026-07-15'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Pratiksha Savant',       'female', '9100000061', 'active', '2026-07-15'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Rukhsar Aboli',          'female', '9100000062', 'active', '2026-07-17'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Syed Moammer',           'male',   '9100000063', 'active', '2026-07-17'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Sakshi Bajaj',           'female', '9100000064', 'active', '2026-07-20'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Danish Kazi',            'male',   '9100000065', 'active', '2026-07-18'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Jaidh Khatri',           'male',   '9100000066', 'active', '2026-07-18'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Anuradha Kapoor',        'female', '9100000067', 'active', '2026-07-18'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Rekha Karnewar',         'female', '9100000068', 'active', '2026-07-20'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Ashwini Malviya',        'female', '9100000069', 'active', '2026-07-20'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Kinjal Arnav Rathod',    'female', '9100000070', 'active', '2026-07-20'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Pritam Hiwase',          'male',   '9100000071', 'active', '2026-07-21'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Dhruv Daga',             'male',   '9100000072', 'active', '2026-07-21'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Arpit Mundhada',         'male',   '9100000073', 'active', '2026-07-21'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Gaurang Gadling',        'male',   '9100000074', 'active', '2026-07-21'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Ishika Awankar',         'female', '9100000075', 'active', '2026-07-21'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Adanan Khan',            'male',   '9100000076', 'active', '2026-07-20'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Gaurav Pinjani',         'male',   '9100000077', 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Gautam Pinjani',         'male',   '9100000078', 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Om Dalwani',             'male',   '9100000079', 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Atharv Pundalikar',      'male',   '9100000080', 'active', '2026-07-31'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Nehal Khan',             'male',   '9100000081', 'active', '2026-07-27'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Nandini Agrawal',        'female', '9100000082', 'active', '2026-07-26'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Pritam Kukde',           'male',   '9100000083', 'active', '2026-07-26'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Sageeta Bacchaate',      'female', '9100000084', 'active', '2026-07-27'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Sangita Bajaj',          'female', '9100000085', 'active', '2026-07-27'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Rajani Shende',          'female', '9100000086', 'active', '2026-07-22'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Vaishnav Shende',        'male',   '9100000087', 'active', '2026-07-22'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Owais Pathan',           'male',   '9100000088', 'active', '2026-07-23'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Aaryash Kakraniya',      'male',   '9100000089', 'active', '2026-07-27'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Nandini PT',             'female', '9100000090', 'active', '2026-07-27'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Ujwal Kade',             'male',   '9100000091', 'active', '2026-07-28'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Shlok Panpaliya',        'male',   '9100000092', 'active', '2026-07-27'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Shrigopal Rathi',        'male',   '9100000093', 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Manish Deshmukh',        'male',   '9100000094', 'active', '2026-07-01'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Saika Deshmukh',         'female', '9100000095', 'active', '2026-07-09'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Dr Parikshit',           'male',   '9100000096', 'active', '2026-07-29'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Mujtaba Khan',           'male',   '9100000097', 'active', '2026-07-29'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Vibha Utkhede',          'female', '9100000098', 'active', '2026-07-31'),
('6a2a77a6-5f5b-4816-bfe2-590d61437af8', 'Ali Khan',               'male',   '9100000099', 'active', '2026-07-31');

-- Step 4: Verify final count — should be 99 unique real members
select count(*) as real_members
from public.members
where branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8';

commit;
