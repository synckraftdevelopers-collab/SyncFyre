$token = $env:SUPABASE_ACCESS_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
    throw "Set SUPABASE_ACCESS_TOKEN before running this script."
}
$apiUrl = "https://api.supabase.com/v1/projects/siycjpmsujcxkvdsfcvq/database/query"
$branch = "6a2a77a6-5f5b-4816-bfe2-590d61437af8"
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

function Run-SQL($sql, $label) {
    $payload = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json @{ query = $sql }))
    try {
        Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $payload | Out-Null
        Write-Host "  OK  $label"
    } catch {
        Write-Host "  ERR $label : $($_.ErrorDetails.Message)"
    }
}

# Batch 1 - first 50 members (2026 sheet part 1)
$b1 = @"
insert into public.members (branch_id,full_name,gender,date_of_birth,phone,email,height_cm,weight_kg,emergency_contact_name,consent_relation,consent_phone,screening_date,valid_until,status) values
('$branch','Gaurav Patorkar','male',NULL,'8983095565',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-07','active'),
('$branch','Fuzail Syed','male',NULL,'9370786786',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-25','active'),
('$branch','Aditya Nawarde','male',NULL,'9373898774',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-05','active'),
('$branch','Vibha Utkhede','female','1983-02-06','8999238013','vibhautkhede123@gmail.com',152.4,79,'Amol Utkhede','Husband','9309772099','2026-07-28','2026-09-01','active'),
('$branch','Junaid Alishan','male',NULL,'9822202115',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-30','active'),
('$branch','Mujtaba Khan','male','1992-08-05','7507990169','Mujtabakhan579@gmail.com',170.18,78,'Ahmed Khan','Father','7507407311',NULL,'2026-08-29','active'),
('$branch','Ujwal P Kale','male','1991-11-12','7387072031','UJWALKALE8889@gmail.com',180.34,76,'J D Deshmukh','Brother','9922022627',NULL,'2026-10-27','active'),
('$branch','Nehal Khan Asif Khan','male','1994-11-06','8657333910','nehalasifkhan@gmail.com',NULL,NULL,'Rizwan Bunnu','Brother','9765616266',NULL,'2027-10-27','active'),
('$branch','Shahu B Adhau','male','1999-10-06','7888125747',NULL,NULL,NULL,'Seema Adhau','Mother','9823141435',NULL,'2026-10-03','active'),
('$branch','Shlok Panpaliya','male','2000-06-07','9359431950',NULL,167.64,55,'Manish Panpaliya','Father','9422159970',NULL,'2026-07-27','active'),
('$branch','Aaryansh Kakraniya','male',NULL,'7798007525',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-27','active'),
('$branch','Rajeshwari Ashish Yashwante','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-01','active'),
('$branch','Shrijeet Bhoyar','male',NULL,NULL,NULL,177.5,99.5,NULL,NULL,NULL,NULL,'2026-12-24','active'),
('$branch','Tirtheshwar Singh','male','1989-10-25','9175101221','tirtheshwar@gmail.com',NULL,NULL,'Priya Khaware','Wife','9175011221','2026-07-28','2026-10-12','active'),
('$branch','Kinjal Arnav Rathod','female','1995-10-15','9920422643',NULL,167.64,70,NULL,NULL,NULL,NULL,'2026-10-20','active'),
('$branch','Adnan Dawaulu','male',NULL,'9527977552',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-20','active'),
('$branch','Sarang Sonone','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-16','active'),
('$branch','Aditi Ingle','female','2003-09-25','7620819138','aditiingle25@gmail.com',160.02,40,NULL,NULL,NULL,'2026-06-08','2026-07-08','active'),
('$branch','Aakash Bhoyar','male',NULL,'7020598188',NULL,162.56,79,NULL,NULL,NULL,NULL,'2026-07-21','active'),
('$branch','Syed Ahmad','male',NULL,'7987899968',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-01','active'),
('$branch','Pratiksha Tawani','female',NULL,'9665949589',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-05','active'),
('$branch','Jaideep Mehta','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-18','active'),
('$branch','Umesh Sawarkar','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-01','active'),
('$branch','Adnan Shaikh','male','2001-02-06','7709448791',NULL,172.72,72,NULL,NULL,NULL,NULL,'2026-07-20','active'),
('$branch','Kesar Jagmalani','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-14','active'),
('$branch','Arrukh Husaain','male',NULL,'8208177980',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-21','active'),
('$branch','Shriram Anurag Shivhare','male','1999-08-10','9503081170','shriramshivhare438@gmail.com',167.64,79,NULL,NULL,NULL,NULL,'2026-07-29','active'),
('$branch','Rajani Harish Shende','female','1966-08-16','9860332195',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-22','active'),
('$branch','Prathmesh Yawale','male',NULL,NULL,NULL,177.8,NULL,NULL,NULL,NULL,NULL,'2026-07-26','active'),
('$branch','Rohan Chimole','male',NULL,'7387776444',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-20','active'),
('$branch','Khatri Brother','male','2002-04-22','9970111237',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-01','active'),
('$branch','Shivam Thakur','male','1996-11-25','8888345278',NULL,180.34,85,NULL,NULL,NULL,NULL,'2026-07-29','active'),
('$branch','Yash Pranjale','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-20','active'),
('$branch','Mishab Jameel','male',NULL,'9730347861',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-03','active'),
('$branch','Anuj Ranchriya','male',NULL,'9923900901',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-10','active'),
('$branch','Anil Kilekar','male',NULL,'8698522254',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-04','active'),
('$branch','Anurag Panchariya','male',NULL,'9923900901',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-10','active'),
('$branch','Sushilkumar Pawdiya','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-10','active'),
('$branch','Koyana Kardelar','female',NULL,'8888815164',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-30','active'),
('$branch','Sanskruti Umak','female',NULL,'8788408226',NULL,NULL,52.3,NULL,NULL,NULL,NULL,'2026-12-15','active'),
('$branch','Shrikant Tayade','male','1990-09-16','7769812010',NULL,208.28,105,NULL,NULL,NULL,NULL,'2026-07-01','active'),
('$branch','Ravaale Chirniye','male','1995-03-25','8806766700',NULL,NULL,81,NULL,NULL,NULL,NULL,'2026-07-23','active'),
('$branch','Faidh Khatri','male',NULL,'9373751113',NULL,NULL,NULL,NULL,NULL,NULL,'2026-06-16','2026-07-17','active'),
('$branch','Dr Vishal Bahekar','male',NULL,'9860193985',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Amrut Deshmukh','male',NULL,'7972239437',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Prajwal Mahatme','male',NULL,'7767911110',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-10','active'),
('$branch','Angel Jain','male',NULL,'7887743409',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-03','active'),
('$branch','Ansh Bhushan Tale','male','2008-05-14','9529727503',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-17','active'),
('$branch','Jatin','male',NULL,'9588451913',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-18','active'),
('$branch','Mohammad Khan','male',NULL,'9970384055',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-02','active')
on conflict do nothing;
"@
Run-SQL $b1 "Batch 1 (2026 part 1 - 50 rows)"

# Remaining batches omitted here for brevity in this rewrite step; keep the existing SQL content below unchanged.('$branch','Dr Vishal Bahekar','male',NULL,'9860193985',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Amrut Deshmukh','male',NULL,'7972239437',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Prajwal Mahatme','male',NULL,'7767911110',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-10','active'),
('$branch','Angel Jain','male',NULL,'7887743409',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-03','active'),
('$branch','Ansh Bhushan Tale','male','2008-05-14','9529727503',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-17','active'),
('$branch','Jatin','male',NULL,'9588451913',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-18','active'),
('$branch','Mohammad Khan','male',NULL,'9970384055',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-02','active')
on conflict do nothing;
"@
Run-SQL $b1 "Batch 1 (2026 part 1 - 50 rows)"

# Batch 2 — 2026 sheet part 2 (50 rows)
$b2 = @"
insert into public.members (branch_id,full_name,gender,date_of_birth,phone,email,height_cm,weight_kg,emergency_contact_name,consent_relation,consent_phone,screening_date,valid_until,status) values
('$branch','Krish Pande','male','2005-05-29',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-06-25','2026-07-29','active'),
('$branch','Sanghratna Sarode','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-10','active'),
('$branch','Laksh Khatri','male',NULL,'9373751113',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-17','active'),
('$branch','Arnav Rathod','male',NULL,'8591962299',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Pratiksha Sawant','female','2001-04-28','8080473066','pratikshasawant28001@gmail.com',NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-08','active'),
('$branch','Ruturaj Deshmukh','male',NULL,'8436922591',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-30','active'),
('$branch','Rohit Kumar','male',NULL,'8076045887',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-12','active'),
('$branch','Sangeeta Gulhane','female',NULL,'8329933769',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-02','active'),
('$branch','Ujwala R Parteti','female',NULL,'8329787684',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-11','active'),
('$branch','Vipul Pinjani','male',NULL,'9604223511',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-11','active'),
('$branch','Sajid Khan','male',NULL,'9860587195',NULL,172.72,56.3,NULL,NULL,NULL,NULL,'2026-07-03','active'),
('$branch','Shrikhande','male',NULL,'8005372248',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-04','active'),
('$branch','Sara Barwe','female',NULL,'8788413810',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-04','active'),
('$branch','Neha Sangavi','female',NULL,'9545416789',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-13','active'),
('$branch','Jatin Shah','male',NULL,'9890226416',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-26','active'),
('$branch','Pranav Bhamore','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-25','active'),
('$branch','A D Ramteke','male','1977-06-03','8208756348',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-18','active'),
('$branch','Dr Manjusha N Tayade','female','1981-10-13','9689179304','manjushatayade@gmail.com',157,NULL,NULL,NULL,NULL,NULL,'2026-11-14','active'),
('$branch','Ishita Band','female',NULL,'7038063000',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-04','active'),
('$branch','Bhumika Rajput','female','2005-08-16','8010770251',NULL,162.56,70,NULL,NULL,NULL,NULL,'2026-07-24','active'),
('$branch','Archana Mange','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-09','active'),
('$branch','Bhakti Sahare','female',NULL,'8329376455',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-13','active'),
('$branch','Naushad Ali','male','1995-06-25','9823100353','mr.naushad.ali.z.ali@gmail.com',180.34,89,NULL,NULL,NULL,NULL,'2026-11-24','active'),
('$branch','Vinita Nistane','female','1968-10-12','9823028125',NULL,154.94,65.5,NULL,NULL,NULL,NULL,'2026-11-18','active'),
('$branch','Muzammil Panjwani',NULL,NULL,'9579000777',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Munindra Ingle','male','2003-08-30','7767073396','munindra.ingle@gmail.com',175,70,NULL,NULL,NULL,NULL,'2026-08-01','active'),
('$branch','Mohammad Wajeeh','male',NULL,'8459111360',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-02','active'),
('$branch','Raksha Dongre','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-06-11','active'),
('$branch','Aaun Bandukhwala','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-26','active'),
('$branch','Sachin Nichat','male',NULL,'8412956111',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-16','active'),
('$branch','Tanmay R Gawande','male',NULL,'9588402997',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-04','active'),
('$branch','Sameer Hussain','male',NULL,'7066457710',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-19','active'),
('$branch','Shitiz S Sarvaiye','male',NULL,'9370109350',NULL,175.26,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Nikhil V Sherekar','male','1992-05-13','8390377801',NULL,177.8,NULL,NULL,NULL,NULL,NULL,'2026-12-02','active'),
('$branch','Rishabh Agrawal','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-15','active'),
('$branch','Rohini Mankar','female','1985-10-15','9765433348',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Sanskruti','female',NULL,'9370081053',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'active'),
('$branch','Aayushi Sharma','female',NULL,'9816984415','ayushisna@gmail.com',152,NULL,NULL,NULL,NULL,NULL,NULL,'active'),
('$branch','Roshani Laddha','female','1994-07-30',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'active'),
('$branch','Gaurav B Mendse','male',NULL,'9921600018',NULL,170.18,78,NULL,NULL,NULL,NULL,NULL,'active'),
('$branch','Mukund Gupta','male','2007-11-05','7666331856',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-03','active'),
('$branch','Sujata Tidake','female','2000-05-06','7709920215',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Sarthak Sandeep Wawandar','male','2000-09-23',NULL,NULL,180,70,NULL,NULL,NULL,'2026-06-29',NULL,'active'),
('$branch','Prachi Kadu','female','1986-11-03','9921619991',NULL,154.94,65,NULL,NULL,NULL,NULL,'2026-12-30','active'),
('$branch','Karan Sharma','male','1999-05-07',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-17','active'),
('$branch','Manoj Jadhav','male',NULL,'8600140550',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-19','active'),
('$branch','Kiran Chaudhari','female','1973-01-01','9604742292',NULL,NULL,79,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Nandini Saraf Agrawal','female','1997-06-18','9140960985',NULL,NULL,NULL,NULL,NULL,NULL,'2025-01-05','2026-12-31','active'),
('$branch','Mohit Khandare','male',NULL,'8830029152',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Manojkumar Jadhav','male',NULL,'8600940550',NULL,172.72,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active')
on conflict do nothing;
"@
Run-SQL $b2 "Batch 2 (2026 part 2 - 50 rows)"

# Batch 3 — 2026 sheet part 3
$b3 = @"
insert into public.members (branch_id,full_name,gender,date_of_birth,phone,email,height_cm,weight_kg,emergency_contact_name,consent_relation,consent_phone,screening_date,valid_until,status) values
('$branch','Manisha Sapkal','female','1966-05-01',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'active'),
('$branch','Shaan Ahmad','male',NULL,'9371202690',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'active'),
('$branch','Junaid Khan','male',NULL,'9370894634',NULL,NULL,NULL,NULL,NULL,NULL,'2024-12-25','2026-12-31','active'),
('$branch','Poonam Jaiswal','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-01','active'),
('$branch','Poonam Belokar','female','1978-07-18','9422155251',NULL,175.26,95,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Gopal Belokar','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Krishna Sharma','male','2004-03-04','7387420777',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-05','active'),
('$branch','Dr D T Ingole','male',NULL,NULL,NULL,NULL,78,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Akshata Mandada','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-02-17','2026-12-31','active'),
('$branch','Dr Prashant Thakare','male',NULL,'9423425720',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Syed Makhdoom Ali','male','1991-08-13','9890375247',NULL,NULL,NULL,NULL,NULL,NULL,'2024-12-31','2026-12-31','active'),
('$branch','Sagar R Khandelwal','male',NULL,'9545487471',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Vedant Agrawal','male','1996-08-19','7972055812',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Sujal Sahu','male','2006-06-01','9890947819',NULL,NULL,NULL,NULL,NULL,NULL,'2025-03-07','2026-12-31','active'),
('$branch','Sartaaj Khan','male','2001-10-25','8830109897',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Swapnil Shirbhate','male','1973-11-11','9823012106',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Prashik Ramteke','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2005-02-27','2026-12-30','active'),
('$branch','Anakainat Shaikh','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Surbhi Chandak','female',NULL,'9823151613',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Pritam A Hiwase','male','1995-10-21','7507234760',NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-12','2026-12-12','active'),
('$branch','Prince Ali Khan','male',NULL,'8788285864',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-12-14','active'),
('$branch','Prema Jaiswal','female',NULL,'8208054373',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Pinky Khandelwal','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Purva Mange','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Pooja Agrawal','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Rakesh Bihani','male','1976-11-19',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Prajwal Meshram','male',NULL,'8669779788',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Avinish Sarvaiya','male','1996-03-04','9764855688',NULL,NULL,104,NULL,NULL,NULL,NULL,'2026-12-20','active'),
('$branch','Archana Baile','female',NULL,'9960582003',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Ankush P Sonone','male','1994-11-14','8390036269',NULL,175.26,87,NULL,NULL,NULL,NULL,'2026-12-31','active'),
('$branch','Aditya Sharma','male',NULL,'8412841166',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-10','active'),
('$branch','Rahul Kodyan','male',NULL,'9627777739',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-12-17','active'),
('$branch','Sachin R Nichat','male',NULL,'8412956111',NULL,179.83,71,NULL,NULL,NULL,NULL,'2026-07-16','active'),
('$branch','Sanjeev Gulhane','male',NULL,'9422856873',NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-15','2026-07-31','active'),
('$branch','Parth Anil Yalekar','male','2004-09-21',NULL,NULL,187,87,NULL,NULL,NULL,NULL,'2026-07-10','active'),
('$branch','Parvaz Ali','male','1997-08-02','8329709688',NULL,170.69,97,NULL,NULL,NULL,NULL,'2026-07-29','active'),
('$branch','Gauri Dahane','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-02','active'),
('$branch','Gaurav P Patorkar','male','2008-08-16','8983095565',NULL,177.8,73,NULL,NULL,NULL,NULL,'2026-08-30','active'),
('$branch','Mansi M Pund','female',NULL,'8668394985',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-10','active'),
('$branch','Janhavi Tagwde','female','2007-11-08','9226291168','jauhani081107@gmail.com',152.4,16,NULL,NULL,NULL,NULL,'2026-08-03','active'),
('$branch','Ajinkya P Damodar','male','2000-01-16','9579998105',NULL,NULL,62,NULL,NULL,NULL,NULL,'2026-08-30','active'),
('$branch','Anuradha Kapoor','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-18','2026-08-04','active'),
('$branch','Anjali Pawar','female',NULL,'7249238039',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-02','active'),
('$branch','Nirmala Bhoi','female',NULL,'9823712315',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-02','active'),
('$branch','Rahul P Ingale','male','1992-02-16','7350373929',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-02','active'),
('$branch','Piyush Lokhande','male','1989-06-01','8600755078',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-02','active'),
('$branch','Abhinav Bhargava','male',NULL,'9604686533',NULL,184,NULL,NULL,NULL,NULL,NULL,'2026-08-01','active'),
('$branch','Mohak Nanwani','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-30','active'),
('$branch','Sayad Rana','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-24','active'),
('$branch','Suyog P Lahane','male',NULL,'9699713852',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-19','active')
on conflict do nothing;
"@
Run-SQL $b3 "Batch 3 (2026 part 3 - 50 rows)"

# Batch 4 — 2026 part 4 + 2027 sheet part 1
$b4 = @"
insert into public.members (branch_id,full_name,gender,date_of_birth,phone,email,height_cm,weight_kg,emergency_contact_name,consent_relation,consent_phone,screening_date,valid_until,status) values
('$branch','Anupma Deshmukh','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-20','active'),
('$branch','Suraj Jaiswal','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-08','active'),
('$branch','Suvidha Wankhade','female','1998-06-12','8459931075',NULL,152.4,81,NULL,'Mother','8308698226',NULL,'2026-09-13','active'),
('$branch','Sarukha Janwani','female',NULL,'9834040291',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-03','active'),
('$branch','Vinayak Nagariya','male','2000-06-04','8421489330',NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-01','2026-09-28','active'),
('$branch','Simran Nagariya','female','2000-02-06','8421489330','simransahu9999@gmail.com',NULL,NULL,NULL,NULL,NULL,'2026-06-29','2026-09-29','active'),
('$branch','Kalash Mundala','male',NULL,'9822514804',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-27','active'),
('$branch','Neelam Wankhade','female',NULL,'9075117344',NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-02','2026-09-02','active'),
('$branch','Krunal Wankhade','male',NULL,'9075117345',NULL,NULL,NULL,NULL,NULL,'9975770897',NULL,'2026-09-21','active'),
('$branch','Paresh Raja','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-20','active'),
('$branch','Nomaah Akhtar','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-06-27','2026-09-30','active'),
('$branch','Aditya Raut','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-01','active'),
('$branch','Atul Borade','male','1976-02-24','9763702566',NULL,179.83,80,NULL,NULL,NULL,NULL,'2026-10-01','active'),
('$branch','Mangesh Lokde','male',NULL,'9923481804',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-01','active'),
('$branch','Swaraj Raut','male',NULL,'7219505758',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-02','active'),
('$branch','Ayush Meghar','male',NULL,'8856014706',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-04',NULL,'active'),
('$branch','Mangesh A Lakade','male','1985-04-02','9923481804',NULL,174,71,NULL,NULL,NULL,'2026-10-05','2026-10-01','active'),
('$branch','Abhishek Singh Pawar','male','1992-05-13','9637965258',NULL,195.58,NULL,NULL,NULL,NULL,'2024-10-01','2026-10-01','active'),
('$branch','Jay Mahgani','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-02-25','2026-10-25','active'),
('$branch','Vrjaa Aware','male','2001-10-03','8208817887',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-04','active'),
('$branch','Atul Mahashabde','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-08-07','2026-10-07','active'),
('$branch','Sarita Mahashabde','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2024-08-07','2026-10-07','active'),
('$branch','Yash Taneja','male','1998-11-20','9263180304',NULL,NULL,NULL,NULL,NULL,NULL,'2024-11-11','2026-10-11','active'),
('$branch','Abhijit Watne','male','1983-06-18','8788284004',NULL,177.8,NULL,NULL,NULL,NULL,'2024-10-12','2026-10-12','active'),
('$branch','Gauri Pande','female',NULL,'7414974012',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-15','active'),
('$branch','Imran Shah','male',NULL,'8698245759',NULL,NULL,NULL,NULL,NULL,NULL,'2024-10-16','2026-10-16','active'),
('$branch','Sagar Jadiya','male',NULL,'9168898223',NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-24','2026-10-24','active'),
('$branch','Harsh Lathiya','male',NULL,'7972562421',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-01','active'),
('$branch','Mahesh Gathani','male',NULL,'9823089846',NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-20','2026-10-20','active'),
('$branch','Kashish Wakpaujar','female','2005-08-11','8329798011',NULL,162.56,73,NULL,NULL,NULL,'2025-10-27','2026-10-27','active'),
('$branch','Yashwant Prabhakar','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-15','active'),
('$branch','Jaideep Mehta','male','1994-05-30','8806591212',NULL,187.96,NULL,NULL,NULL,NULL,'2025-11-18','2026-11-18','active'),
('$branch','Sanjay Sahare','male',NULL,'8806770022',NULL,NULL,NULL,NULL,NULL,NULL,'2026-06-24',NULL,'active'),
('$branch','Shlok Panpaliya','male','2000-06-07','9423548410','shlokp762@gmail.com',164,NULL,'Manish Panpaliya','Father','9422159970','2024-03-02',NULL,'active'),
('$branch','Ishika Awankar','female',NULL,NULL,NULL,NULL,NULL,'Ajay Awankar','Father','9673210263','2026-07-20',NULL,'active'),
('$branch','Kamus Daga','female',NULL,'9422830343',NULL,NULL,NULL,NULL,NULL,NULL,'2026-11-18',NULL,'active'),
('$branch','Faijal Khau','male','1994-12-13','9284798926',NULL,NULL,72,NULL,NULL,NULL,'2026-03-25',NULL,'active'),
('$branch','Atik Baghlon','male','1993-08-03','9960232393',NULL,NULL,63,NULL,NULL,NULL,'2026-03-24','2027-03-21','active'),
('$branch','Shashank Pinjani','male','2001-12-21','9834323610',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-06-11','active'),
('$branch','Dr Balkrishna Adhale','male','1964-11-10','9823970577',NULL,162.56,62,NULL,NULL,NULL,'2026-07-03','2027-07-01','active'),
('$branch','Karan Jaiswal','male',NULL,'9823061218',NULL,NULL,NULL,NULL,NULL,NULL,'2024-09-06','2026-06-24','active'),
('$branch','Jayvinder Kaur Saluja','male',NULL,'8999791212',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-06-01','active'),
('$branch','Bhupendra Gaud','male',NULL,'9420127269',NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-19',NULL,'active'),
('$branch','Amit Sahu','male',NULL,'9284342580',NULL,NULL,NULL,NULL,NULL,NULL,'2025-12-26','2026-01-30','active'),
('$branch','Amit Joshi','male',NULL,'9823075912',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'active'),
('$branch','Pranav P Mundhada','male',NULL,'9637834076',NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-14','2025-12-31','active'),
('$branch','Aditya A Kadu','male',NULL,'9359511808',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-02-14','active'),
('$branch','Sameer Pande','male',NULL,'9422156436',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-02-14','active'),
('$branch','Nitin Saorik','male','1977-04-07','9422159955',NULL,180.34,NULL,NULL,NULL,NULL,NULL,'2027-02-27','active'),
('$branch','Simant Waghmare','male',NULL,'7972229231',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-02-17','active')
on conflict do nothing;
"@
Run-SQL $b4 "Batch 4 (2026 part 4 + 2027 start - 50 rows)"

# Batch 5 — 2027 sheet remainder
$b5 = @"
insert into public.members (branch_id,full_name,gender,date_of_birth,phone,email,height_cm,weight_kg,emergency_contact_name,consent_relation,consent_phone,screening_date,valid_until,status) values
('$branch','Sunny Pinjani','male',NULL,'9403676868',NULL,NULL,NULL,NULL,NULL,NULL,'2026-02-19','2027-02-19','active'),
('$branch','Snehal Rahate','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-02-20','active'),
('$branch','Anas Patel','male','2000-05-23','9765432187',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-03-13','active'),
('$branch','Yogesh Chavan','male','1992-06-09','9404796603',NULL,179.83,68.5,NULL,NULL,NULL,NULL,'2027-05-17','active'),
('$branch','Raj Jharkare','male','2000-02-01','9370081053',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-05-07','active'),
('$branch','Sagar Q Gadue','male','1989-07-14','9096226800',NULL,170.18,88,NULL,NULL,NULL,NULL,'2027-05-27','active'),
('$branch','Sajid S Memon','male',NULL,'9764250120',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-05-24','active'),
('$branch','Saurabh Ghogare','male',NULL,'9503609987',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-05-04','active'),
('$branch','Zeeshan Shaikh','male','2000-03-16','8668994984','zeeshenskto8@gmail.com',162.56,88,NULL,NULL,NULL,NULL,'2027-05-29','active'),
('$branch','Faizan Raza','male',NULL,'7798347869',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-05-05','active'),
('$branch','SK Imran','male',NULL,'9325518555',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-05-04','active'),
('$branch','Moshin Khan','male',NULL,'9822118102',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-06-05','active'),
('$branch','Manthan P Jaiswal','male',NULL,NULL,NULL,183,NULL,NULL,NULL,NULL,NULL,'2027-05-07','active'),
('$branch','Raj Thakre','male',NULL,'9370081053',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-06-10','active'),
('$branch','Azhar Habib','male',NULL,'8637730787',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-04-20','active'),
('$branch','Lukaman Jaliyawala','male',NULL,'9420518135',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-04-20','active'),
('$branch','Syed Sahil','male','1997-07-02','9130439030',NULL,154.94,70,NULL,NULL,NULL,NULL,'2027-04-06','active'),
('$branch','Kamil Ahmad','female','2005-02-25',NULL,NULL,180.34,NULL,NULL,NULL,NULL,NULL,'2027-04-21','active'),
('$branch','Vishwa Bangadkar','male',NULL,'8055060021',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-04-02','active'),
('$branch','Omkar','male',NULL,'8999507645',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-04-13','active'),
('$branch','Sunny Bijore','male','1997-03-16','7219506173',NULL,NULL,NULL,'Aauya Jadhav',NULL,'9699089200',NULL,'2027-01-01','active'),
('$branch','Arya Jadhav','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-11-01','active'),
('$branch','Manjit Meshram','male',NULL,'9860502689',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-03-23','active'),
('$branch','Ishan Kasat','male','2003-01-13','832956731',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'active'),
('$branch','Vandana Korde','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-03-08','active'),
('$branch','Ashok Wankhede','male',NULL,'8390031377',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-03-08','active'),
('$branch','Tanisha Khandelwal','female',NULL,'8669078856',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-03-01','active'),
('$branch','Rizwan Khan','male',NULL,'9834119834',NULL,NULL,NULL,NULL,NULL,NULL,'2024-10-29','2027-03-31','active'),
('$branch','Talal Mohammad Adeel','male','2001-01-02','9923447717',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-03-12','active'),
('$branch','Kunjal P Mandlik','male',NULL,'9156818995',NULL,161.29,78,NULL,NULL,NULL,'2026-06-21','2026-07-21','active'),
('$branch','Akaih Panday','male','1996-07-07','8237392064',NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-10','2027-05-21','active'),
('$branch','Vaishali Chede','female','1980-10-26','9420547504',NULL,NULL,NULL,'Pankaj Chede','Husband','9422193111',NULL,NULL,'active'),
('$branch','Owais Memon','male',NULL,'9960171305',NULL,NULL,NULL,NULL,NULL,NULL,'2025-06-10','2027-06-05','active'),
('$branch','Dr Ashwini R Pundkar','female',NULL,'9890790968',NULL,157.48,62,NULL,NULL,NULL,'2017-09-20','2026-01-31','active'),
('$branch','Sonali Thakare','female',NULL,'9890408107',NULL,NULL,NULL,NULL,NULL,NULL,'2026-02-28','2027-01-31','active'),
('$branch','Anupama Sorode','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2024-04-12','2027-01-30','active'),
('$branch','Ashwini Kalne','female',NULL,'7020780080',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-01-30','active'),
('$branch','Poornima D Jayde','male','1999-04-30','9518529254',NULL,162.56,NULL,NULL,NULL,NULL,'2024-03-08','2027-02-28','active'),
('$branch','Pratyush Tawani','female',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-09','2027-01-09','active'),
('$branch','Vaishnavi Tawani','female','1998-12-11','8087020869',NULL,180.34,NULL,NULL,NULL,NULL,'2025-04-18','2026-08-02','active'),
('$branch','Bhumika Rajput','female','2005-08-16','8010770251',NULL,NULL,68.06,NULL,NULL,NULL,NULL,'2027-12-31','active'),
('$branch','Sachin Chandhani','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-03-01','2027-03-01','active'),
('$branch','Sanskar Sahu','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-01','2027-03-10','active'),
('$branch','Tanishka A Sarvaiya','female','2002-09-11','9527239109','Sawaiya.tamishka@gmail.com',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'active'),
('$branch','Harsh Laddha','male',NULL,'7666373052',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-03-08','active'),
('$branch','Ayan Khan','male','2007-09-27','8007063767',NULL,182.88,75,NULL,NULL,'8237758000','2025-04-02','2027-03-30','active'),
('$branch','Naved Khan','male','2000-06-03','8237725822',NULL,180.34,82,NULL,NULL,NULL,NULL,'2027-03-30','active'),
('$branch','Kshitij S Sarvaiya','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-01-30','active'),
('$branch','Dr Sayali Jahagirdar','female','1978-10-12','9922914788',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-03-08','active'),
('$branch','Aditya Fuladi','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-06-12','active')
on conflict do nothing;
"@
Run-SQL $b5 "Batch 5 (2027 part 1 - 50 rows)"

$b6 = @"
insert into public.members (branch_id,full_name,gender,date_of_birth,phone,email,height_cm,weight_kg,emergency_contact_name,consent_relation,consent_phone,screening_date,valid_until,status) values
('$branch','Shantanu Tikle','male',NULL,'7620147993',NULL,176,64,NULL,NULL,NULL,'2024-12-10','2027-06-05','active'),
('$branch','Shubham Khandelwal','male','1994-09-24','9423659999',NULL,170.69,103,NULL,NULL,NULL,NULL,'2027-07-07','active'),
('$branch','Rekha Kardawar','female',NULL,'9822576066',NULL,NULL,NULL,'Ram','Husband','9623504600',NULL,'2027-07-27','active'),
('$branch','Manthan Jaiswal','male',NULL,'7020858955',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-06-05','active'),
('$branch','Anshul Khandelwal','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-06-10','active'),
('$branch','Vishal Rane','male',NULL,'8530340397',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-06-18','active'),
('$branch','Abhinav Bhargav','male',NULL,'9604686533',NULL,170,63.7,NULL,NULL,NULL,'2024-08-05','2027-09-15','active'),
('$branch','Vaishali Kadu','female',NULL,'9763742527',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'active'),
('$branch','Prachi Kadu','female','1986-11-03','9921619991',NULL,157.48,60,NULL,NULL,NULL,'2024-01-30','2027-01-30','active'),
('$branch','Zaid Khan','male',NULL,'8862018785',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-07-01','active'),
('$branch','Gaurang Gadbail','male','1994-02-01','9860123769',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-03-12','active'),
('$branch','Gaurav Rathod','male',NULL,'7020682544',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-03-08','active'),
('$branch','Omkar Kumbhar','male',NULL,'8999507645',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-03-29','active'),
('$branch','Manoj Vinod Gupta','male',NULL,'8446620803',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-03-26','active'),
('$branch','Jtarikesh Gawande','male','2002-05-17','9284921034',NULL,182.88,76,NULL,NULL,NULL,NULL,'2027-03-14','active'),
('$branch','Manjit Maheshvar','male',NULL,'9860502689',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2027-03-23','active')
on conflict do nothing;
"@
Run-SQL $b6 "Batch 6 (2027 final - 16 rows)"

# Final count
Write-Host "`nVerifying final count..."
$checkBody = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json @{ query = "select count(*) as total from public.members;" }))
$result = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $checkBody
Write-Host "Total members in database: $($result.total)"

