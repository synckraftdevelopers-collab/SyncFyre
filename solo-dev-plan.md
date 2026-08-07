# SyncFyre — Solo Developer Complete Plan
# Developer: Aastha | Last Updated: August 2026
# Stack: Next.js 15, React 19, TypeScript, Supabase, Tailwind CSS v4

---

## HOW TO USE THIS FILE

Each task has a checkbox [ ] and a TEST step.
Mark [ ] → [x] when done. Run the test before marking done.
Work one phase at a time. Never skip ahead.

After every coding session run:
  npm run typecheck   → must be 0 errors
  npm run lint        → must be 0 errors

---

## OVERALL STATUS (as of Aug 2026)

Total completion: ~65%

DONE (no work needed):
- Auth: login, logout, forgot/reset password
- Admin dashboard: KPI cards, charts, feeds, quick actions
- Admin members: list, search, filters, pagination, add, edit, detail tabs
- Admin memberships: plan list, create plan, edit plan
- Admin attendance: log view
- Admin payments: list, filter, CSV export
- Admin invoices: create (new), detail view
- Admin finance: full module (12 KPIs, income, expenses, bank, GST, P&L, accounting)
- Admin finance accounting: COA, journal, ledger, trial balance
- Reception dashboard: KPIs, quick actions, feeds
- Reception members: list, add, detail
- Reception payments: list, collect payment
- Reception appointments: list, book new
- Reception attendance: view
- Member dashboard, profile, membership, attendance, workouts, diet, progress, appointments
- Trainer dashboard, members, appointments, workouts, diet plans, progress (create forms)

MISSING / BROKEN (this plan covers all of these):
- Reception members/[id] page (broken import → build error)
- Reception memberships page (placeholder, no real data)
- Admin trainers page (falls to catch-all, no real data)
- Admin appointments page (falls to catch-all, no real data)
- Admin equipment page (falls to catch-all, no real data)
- Admin notifications page (falls to catch-all, no real data)
- Admin reports page (falls to catch-all, no real data)
- Admin staff page (falls to catch-all, no real data)
- Admin settings (face machines only, no branch/users/categories)
- Member notifications page (404)
- Member payments page (404, not in nav)
- Member profile edit (view only)
- Trainer notifications page (404)
- Trainer settings page (404)
- Trainer edit workout / diet plan / progress (create only, no edit)
- All appointment status management (no approve/cancel buttons)
- Error boundaries (no error.tsx on any route)
- Loading skeletons (only dashboard has one)
- Database: branch name "SyncTyre" → needs SQL fix


---

## PHASE 1 — Fix Critical Broken Things
## Estimated time: 2 days
## Goal: zero 404s, zero build errors

---

### TASK 1.1 — Fix Branch Name in Database
Status: [ ]
Problem: "SyncTyre Main Branch" shows in members table Branch column
Fix: Run SQL in Supabase dashboard → SQL Editor

SQL to run:
  UPDATE public.branches
  SET name = REPLACE(name, 'SyncTyre', 'SyncFyre')
  WHERE name ILIKE '%SyncTyre%';

TEST:
  [ ] Go to localhost:3000/admin/members
  [ ] Branch column shows "SyncFyre Main Branch"
  [ ] Check finance pages - branch name correct everywhere

---

### TASK 1.2 — Fix Reception Member Detail Page
Status: [ ]
Problem: app/(reception)/reception/members/[id]/page.tsx imports
         @/components/members/member-detail-tabs which does NOT exist
         → causes TypeScript build error

Fix: Rewrite the file to be self-contained.
File: app/(reception)/reception/members/[id]/page.tsx

The page should:
- Use requireUser(["reception", "admin", "manager"])
- Call getMemberById, getMemberSubscriptions, getMemberPayments,
  getMemberAttendanceSummary, getMemberAttendanceRecords,
  getMemberProgress, getMemberWorkouts, getMemberDietPlans,
  getMemberNotifications, getPlanOptions, getTrainerOptions
- Render hero card (photo, name, badges, stats)
- Use MemberProfileTabs with inline tab content (copy from admin page)
- Back link goes to /reception/members (not /admin/members)
- Show RenewMembershipDialog button

TEST:
  [ ] npm run typecheck → 0 errors
  [ ] Login as reception
  [ ] Go to /reception/members
  [ ] Click any member row
  [ ] Member detail page loads with all tabs
  [ ] Membership tab shows plan and dates
  [ ] Payments tab shows payment history
  [ ] Attendance tab shows visit count

---

### TASK 1.3 — Fix Reception Memberships Page
Status: [ ]
Problem: /reception/memberships shows ModuleOverview placeholder
         /reception/memberships/new → 404

Fix Part A: Replace reception memberships page with real plan list
File: app/(reception)/reception/memberships/page.tsx

The page should:
- Fetch membership_plans from Supabase (active plans for branch)
- Show plan cards: name, duration, price, GST, total payable
- Show "New Subscription" button → /reception/memberships/new
- Show active subscriber count per plan (join subscriptions table)

Fix Part B: Create reception memberships new page
File: app/(reception)/reception/memberships/new/page.tsx

The page should:
- Fetch active members list (for member selector)
- Fetch active plans list (for plan selector)
- Form fields: member (select), plan (select), start date
  auto-calculate: price, discount, GST, total
- On submit: POST to /api/subscriptions (ResourceCreateForm handles this)
- On success: redirect to /reception/memberships

TEST:
  [ ] Login as reception
  [ ] /reception/memberships shows real plan cards with prices
  [ ] Click "New Subscription"
  [ ] Form opens with member dropdown and plan dropdown
  [ ] Select member + plan → price auto-fills
  [ ] Submit → subscription created in DB
  [ ] Redirect back to /reception/memberships
  [ ] Active subscriber count on plan card increments


### TASK 1.4 — Create Member Notifications Page
Status: [ ]
Problem: /member/notifications → 404
         Bell icon in header links there but page doesn't exist

Fix: Create app/(member)/member/notifications/page.tsx

The page should:
- Use getCurrentProfile() to get user
- Find member record: supabase.from("members").select("id").eq("user_id", profile.id)
- Fetch notifications: supabase.from("notifications").select("*").eq("member_id", memberId).order("created_at", {ascending:false}).limit(30)
- Show list: title, message, type badge, date, read/unread indicator
- Mark as read: form action → supabase update read_at = now()
- Empty state: "No notifications yet"

Also add "Notifications" to member nav:
File: lib/nav/member-nav.ts
Add: { label: "Notifications", href: "/member/notifications", icon: Bell }

TEST:
  [ ] Login as member
  [ ] Click bell icon in header → /member/notifications loads
  [ ] If notifications exist, they show with title/message
  [ ] Unread notifications have visual indicator
  [ ] Mark as read works (indicator disappears)
  [ ] Empty state shows if no notifications

---

### TASK 1.5 — Create Trainer Notifications Page
Status: [ ]
Problem: /trainer/notifications → 404
         Header bell icon links there

Fix: Create app/(trainer)/trainer/notifications/page.tsx

The page should:
- Fetch notifications for this trainer's branch
- Show: title, message, type, date, channels
- Mark as read action
- Empty state

TEST:
  [ ] Login as trainer
  [ ] Click bell icon → /trainer/notifications loads without 404
  [ ] Page shows notification list or empty state

---

### TASK 1.6 — Create Trainer Settings Page
Status: [ ]
Problem: /trainer/settings → 404
         Profile dropdown "Settings" links there

Fix: Create app/(trainer)/trainer/settings/page.tsx

The page should:
- Show trainer profile: experience years, specializations, certifications, bio
- Allow editing: bio, specializations (comma-separated), certifications
- Server action to update trainers table
- Show linked user: name, email (read only)

TEST:
  [ ] Login as trainer
  [ ] Click Settings in profile dropdown → page loads without 404
  [ ] Current bio/specializations show prefilled
  [ ] Edit bio → save → new value persists after page reload

---

### PHASE 1 FINAL TEST CHECKLIST
  [ ] npm run typecheck → 0 errors
  [ ] npm run lint → 0 errors
  [ ] Open every nav link in admin portal → no 404
  [ ] Open every nav link in reception portal → no 404
  [ ] Open every nav link in trainer portal → no 404
  [ ] Open every nav link in member portal → no 404
  [ ] Branch name shows "SyncFyre" everywhere
  [ ] Reception member detail page loads fully
  [ ] Reception memberships shows real plans
  [ ] Member notifications page works
  [ ] Trainer notifications + settings work


---

## PHASE 2 — Build Missing Admin Module Pages
## Estimated time: 4 days
## Goal: every sidebar link shows real data from database

---

### TASK 2.1 — Admin Trainers Page
Status: [ ]
Problem: /admin/trainers falls to [module] catch-all → shows placeholder only

Fix: Create app/(admin)/admin/trainers/page.tsx

The page should:
- Use getTrainerReport() from services/report.service.ts
- Show table: Trainer Name, Email, Phone, Experience, Specializations,
  Assigned Members, Upcoming Appointments, Status
- Status filter: Active / Inactive / All
- Search by name
- "Add Trainer" button → /admin/trainers/new (catch-all handles this)
- Click row → trainer detail (simple for now, show profile + assigned members)
- Pagination

Also create: app/(admin)/admin/trainers/[id]/page.tsx (trainer detail)
- Show trainer profile fields
- List of assigned members (from members table where assigned_trainer_id = trainerId)
- Upcoming appointments

Services to use:
- getTrainerReport({ branchId }) → trainer list
- supabase.from("members").select(...).eq("assigned_trainer_id", trainerId) → assigned members
- supabase.from("appointments").select(...).eq("provider_staff_id", trainerId) → appointments

TEST:
  [ ] Login as admin
  [ ] /admin/trainers → real trainer list (not placeholder)
  [ ] Search by name works
  [ ] Status filter works
  [ ] Click "Add Trainer" → /admin/trainers/new form opens
  [ ] Click a trainer row → detail page shows profile + assigned members

---

### TASK 2.2 — Admin Appointments Page
Status: [ ]
Problem: /admin/appointments falls to [module] catch-all

Fix: Create app/(admin)/admin/appointments/page.tsx

The page should:
- Fetch from appointments table with member + provider joins
- Columns: Member, Date, Time, Provider Type, Purpose, Status
- Filters: date range, status (pending/approved/completed/cancelled)
- Status action buttons in each row:
    pending → "Approve" button (updates status to approved)
    approved → "Complete" and "Cancel" buttons
- "Book Appointment" button → /admin/appointments/new
- Pagination
- Default: show upcoming (today + future), with option to show past

Server action needed: updateAppointmentStatusAction
File: app/actions/appointment-actions.ts (create new)
  export async function updateAppointmentStatusAction(id: string, status: string)
  → supabase.from("appointments").update({status}).eq("id", id)
  → revalidatePath("/admin/appointments")

TEST:
  [ ] Login as admin
  [ ] /admin/appointments → real list of appointments
  [ ] Filter by status works
  [ ] Click "Approve" on pending → status changes to approved in table
  [ ] Click "Complete" on approved → status changes to completed
  [ ] "Book Appointment" opens /admin/appointments/new form

---

### TASK 2.3 — Admin Equipment Page
Status: [ ]
Problem: /admin/equipment falls to [module] catch-all

Fix: Create app/(admin)/admin/equipment/page.tsx

The page should:
- Fetch from equipment table
- Columns: Machine Name, Category, Status, Serial Number, Next Maintenance Date
- Status badges: operational=green, maintenance_due=amber,
  under_maintenance=blue, out_of_service=red, retired=gray
- Search by machine name
- Status filter
- "Add Equipment" button → /admin/equipment/new (catch-all handles this)
- Pagination

TEST:
  [ ] Login as admin
  [ ] /admin/equipment → real equipment list
  [ ] Status badges show correct colors
  [ ] "Add Equipment" → form opens and works
  [ ] New equipment appears in list after creation


### TASK 2.4 — Admin Notifications Page
Status: [ ]
Problem: /admin/notifications falls to [module] catch-all

Fix: Create app/(admin)/admin/notifications/page.tsx

The page should:
- Fetch from notifications table for branch
- Columns: Title, Message, Type, Channels, Scheduled For, Read At
- Filter: Unread / All
- Mark as read action (server action)
- "Create Notification" button → /admin/notifications/new (catch-all handles this)
- Show unread count badge

Server action: markNotificationReadAction(id: string)
  → supabase.from("notifications").update({read_at: new Date().toISOString()}).eq("id", id)

TEST:
  [ ] Login as admin
  [ ] /admin/notifications → real notification list
  [ ] Unread notifications highlighted
  [ ] Mark as read → notification updates
  [ ] Filter "Unread" shows only unread

---

### TASK 2.5 — Admin Reports Page
Status: [ ]
Problem: /admin/reports falls to [module] catch-all, links to /api/reports raw CSV

Fix: Create app/(admin)/admin/reports/page.tsx (hub page)
     Create 4 sub-report pages

Hub page (app/(admin)/admin/reports/page.tsx):
- 9 report type cards: Members, Attendance, Payments, Memberships,
  Revenue, Trainers, Monthly Joining, Pending Payments, Subscriptions
- Each card links to its sub-page
- Each card shows service description

Sub-report pages to create:
  app/(admin)/admin/reports/members/page.tsx
    - Use getMembersReport({ branchId, page, pageSize, status, search })
    - Table with all member register view columns
    - Export CSV button → /api/reports?resource=members
    - Date range filter, search, status filter

  app/(admin)/admin/reports/payments/page.tsx
    - Use getPaymentsReport({ branchId, page, pageSize, status, method, dateFrom, dateTo })
    - Table: date, member, plan, amount, method, status, reference
    - Export CSV button
    - Date range + status + method filters

  app/(admin)/admin/reports/revenue/page.tsx
    - Use getMonthlyRevenueSummary({ branchId, monthFrom, monthTo })
    - Monthly summary table: month, transactions, gross, refunds, net
    - Revenue trend chart (reuse DashboardCharts)

  app/(admin)/admin/reports/attendance/page.tsx
    - Use getAttendanceReport({ branchId, page, pageSize, dateFrom, dateTo })
    - Table: date, member, entry time, exit time, duration
    - Date range filter
    - Export CSV button

TEST:
  [ ] Login as admin
  [ ] /admin/reports → hub shows 9 report cards
  [ ] Click Members report → table loads with real members data
  [ ] Click Payments report → table loads with real payments
  [ ] Click Revenue report → monthly summary shows
  [ ] Click Attendance report → attendance log shows
  [ ] Export CSV on any report → file downloads

---

### TASK 2.6 — Admin Staff Page
Status: [ ]
Problem: /admin/staff falls to [module] catch-all

Fix: Create app/(admin)/admin/staff/page.tsx

The page should:
- Fetch from staff table with users join
- Columns: Name, Employee Code, Designation, Joining Date, Salary, Status
- Search, status filter
- "Add Staff" button → /admin/staff/new (catch-all handles this)
- Pagination

TEST:
  [ ] Login as admin
  [ ] /admin/staff → real staff list (or empty state if no staff)
  [ ] "Add Staff" button → form opens and works
  [ ] New staff appears in list

---

### PHASE 2 FINAL TEST CHECKLIST
  [ ] npm run typecheck → 0 errors
  [ ] /admin/trainers → real data, filters work, add works
  [ ] /admin/appointments → real data, status changes work
  [ ] /admin/equipment → real data, add works
  [ ] /admin/notifications → real data, mark read works
  [ ] /admin/reports → all 4 sub-reports load and export CSV
  [ ] /admin/staff → real data, add works


---

## PHASE 3 — Trainer Portal Edit Flows
## Estimated time: 2 days
## Goal: trainer can edit/delete everything they create

---

### TASK 3.1 — Fix Trainer Dashboard Dead Code
Status: [ ]
Problem: First Promise.all block results are all void-ed (dead code)
         wastes 4 DB queries on every dashboard load

File: app/(trainer)/trainer/dashboard/page.tsx

Fix:
- Remove the first Promise.all block entirely (lines that use wrong IDs)
- Keep only the second correct block that uses trainerId
- Add href props to MetricCards so they're clickable:
    Assigned members → /trainer/members
    Today's sessions → /trainer/appointments
    Active workouts → /trainer/workouts
    Progress records → /trainer/progress
- Add quick action buttons: Record Progress, Add Workout, Book Appointment

TEST:
  [ ] Login as trainer
  [ ] Dashboard loads without errors
  [ ] Metric cards are clickable and navigate correctly
  [ ] Quick action buttons navigate to correct pages

---

### TASK 3.2 — Trainer Edit Workout
Status: [ ]
Problem: /trainer/workouts/new works but no edit page exists

Fix:
Create: app/(trainer)/trainer/workouts/[id]/edit/page.tsx
  - Fetch workout by id from supabase
  - Prefill ResourceCreateForm OR build a custom form
  - On submit: PUT/PATCH to update
  - Redirect to /trainer/workouts on success

Add Edit button to workout list:
File: app/(trainer)/trainer/workouts/page.tsx
  - Add Edit button/link on each row → /trainer/workouts/{id}/edit
  - Add Delete button with confirmation → server action

Server action: updateWorkoutAction, deleteWorkoutAction
File: app/actions/trainer-actions.ts (create new file)

TEST:
  [ ] Login as trainer
  [ ] /trainer/workouts → each row has Edit + Delete buttons
  [ ] Click Edit → form prefills with current values
  [ ] Change exercise name → save → list shows updated value
  [ ] Click Delete → confirm dialog → workout removed from list

---

### TASK 3.3 — Trainer Edit Diet Plan
Status: [ ]
Problem: /trainer/diet-plans/new works but no edit page exists

Fix:
Create: app/(trainer)/trainer/diet-plans/[id]/edit/page.tsx
  - Fetch diet plan by id
  - Prefill form (name, start_date, end_date, breakfast, lunch, dinner, snacks, macros)
  - On submit: update record
  - Redirect to /trainer/diet-plans

Add Edit + Delete buttons to diet plans list:
File: app/(trainer)/trainer/diet-plans/page.tsx

Add to trainer-actions.ts: updateDietPlanAction, deleteDietPlanAction

TEST:
  [ ] Login as trainer
  [ ] /trainer/diet-plans → each row has Edit + Delete
  [ ] Click Edit → form prefills correctly
  [ ] Edit breakfast field → save → updated value shows in list
  [ ] Click Delete → diet plan removed

---

### TASK 3.4 — Trainer Edit Progress Record
Status: [ ]
Problem: Progress list has no edit/delete

Fix:
Create: app/(trainer)/trainer/progress/[id]/edit/page.tsx
  - Fetch progress record by id
  - Prefill all measurement fields
  - On submit: update record
  - Redirect to /trainer/progress

Add Edit + Delete buttons to progress list.
Add to trainer-actions.ts: updateProgressAction, deleteProgressAction

TEST:
  [ ] Login as trainer
  [ ] /trainer/progress → each row has Edit + Delete
  [ ] Click Edit → measurements prefill
  [ ] Update weight_kg → save → shows updated in list

---

### PHASE 3 FINAL TEST CHECKLIST
  [ ] Trainer dashboard loads cleanly (no dead queries)
  [ ] All trainer metric cards clickable
  [ ] Can edit any workout (prefills, saves, updates list)
  [ ] Can delete a workout (removes from list)
  [ ] Can edit any diet plan
  [ ] Can delete a diet plan
  [ ] Can edit any progress record
  [ ] npm run typecheck → 0 errors


---

## PHASE 4 — Member Portal Enhancements
## Estimated time: 1.5 days
## Goal: member can take actions, not just read data

---

### TASK 4.1 — Member Profile Edit
Status: [ ]
Problem: /member/profile is view-only. Member can't update their info.

Fix: Add edit mode to app/(member)/member/profile/page.tsx

Option A (simpler): Add a link "Edit Profile" → /member/profile/edit
Create: app/(member)/member/profile/edit/page.tsx
  - Fetch member record
  - Form fields: phone, email, address, emergency_contact_name,
    emergency_contact_phone, fitness_goal, height_cm, weight_kg
  - Server action: updateMemberSelfAction
    → validates input → supabase.from("members").update(...).eq("id", memberId)
    → redirects to /member/profile

TEST:
  [ ] Login as member
  [ ] /member/profile → "Edit Profile" button visible
  [ ] Click Edit Profile → edit form opens with current values prefilled
  [ ] Change phone number → save → /member/profile shows new phone
  [ ] Try invalid email → validation error shows

---

### TASK 4.2 — Member Payments Page
Status: [ ]
Problem: No /member/payments page. Not in nav. Member can't see payment history.

Fix:
Create: app/(member)/member/payments/page.tsx
  - Find member record by user_id
  - Fetch from payment_report_view where member_id = memberId
  - Table: Date, Invoice Number, Plan Name, Amount, Method, Status
  - Empty state: "No payments yet"

Add to nav:
File: lib/nav/member-nav.ts
  Add: { label: "Payments", href: "/member/payments", icon: CircleDollarSign }

TEST:
  [ ] Login as member
  [ ] Sidebar shows "Payments" nav item
  [ ] /member/payments → payment history table loads
  [ ] Shows correct amounts and dates
  [ ] Empty state shows if no payments

---

### TASK 4.3 — Appointment Status Management
Status: [ ]
Problem: Appointments exist but no status buttons anywhere (admin/reception/trainer)

Fix: Add status action buttons to 3 places

A) Admin: app/(admin)/admin/appointments/page.tsx (if built in Phase 2)
   - Already planned with status buttons above

B) Reception: app/(reception)/reception/appointments/page.tsx
   - Add "Approve" button on pending appointments
   - Button calls updateAppointmentStatusAction("approved")

C) Trainer: app/(trainer)/trainer/appointments/page.tsx
   - Add "Complete" button on approved appointments
   - Add "Cancel" button (with confirmation)

Server action file: app/actions/appointment-actions.ts
  export async function updateAppointmentStatusAction(id: string, newStatus: string)
  → supabase update + revalidatePath for all 3 portals

TEST:
  [ ] Login as reception
  [ ] /reception/appointments → pending appointment has "Approve" button
  [ ] Click Approve → status changes to "approved" in table
  [ ] Login as trainer
  [ ] /trainer/appointments → approved appointment has "Complete" button
  [ ] Click Complete → status changes to "completed"

---

### PHASE 4 FINAL TEST CHECKLIST
  [ ] Member can edit their own profile
  [ ] Payments nav item shows in member sidebar
  [ ] /member/payments shows real payment history
  [ ] Appointment status buttons work in reception portal
  [ ] Appointment status buttons work in trainer portal
  [ ] npm run typecheck → 0 errors


---

## PHASE 5 — Admin Settings Expansion
## Estimated time: 1 day
## Goal: settings page is actually useful

---

### TASK 5.1 — Expand Admin Settings Page
Status: [ ]
Problem: /admin/settings only shows face machine configuration
         No branch management, no income/expense categories, no user management

Fix: Update app/(admin)/admin/settings/page.tsx
     Add tabs to the settings page

Tab 1 — Face Machines (existing, keep as-is)

Tab 2 — Branch Info
  - Show current branch: name, city, address, contact phone, email, GSTIN
  - Edit form for branch details
  - Server action: updateBranchAction

Tab 3 — Income Categories
  - List income categories from income_categories table
  - Add new category (name, code)
  - Deactivate existing category
  - Service: listIncomeCategories(), upsertIncomeCategory()

Tab 4 — Expense Categories
  - List expense categories from expense_categories table
  - Add / deactivate
  - Service: listExpenseCategories()

Tab 5 — Membership Plans (link)
  - Just a link card to /admin/memberships for convenience

Implementation approach:
  - Use URL search param ?tab=machines|branch|income|expense|plans
  - Each tab section is server-rendered based on searchParam

TEST:
  [ ] Login as admin → /admin/settings
  [ ] Tabs visible: Face Machines, Branch Info, Income Categories, Expense Categories
  [ ] Branch Info tab shows current branch name/city
  [ ] Edit branch name → save → new name shows everywhere in app
  [ ] Income Categories tab shows list
  [ ] Add new income category → appears in list
  [ ] Add new expense category → appears in expenses/new form dropdown

---

## PHASE 6 — Error Handling & Loading States
## Estimated time: 1 day
## Goal: no page crashes, every page has skeleton loading

---

### TASK 6.1 — Error Boundaries
Status: [ ]
Problem: No error.tsx on any route. Supabase error crashes entire page.

Fix: Create error.tsx files for each portal layout

Files to create:
  app/(admin)/error.tsx
  app/(reception)/error.tsx
  app/(trainer)/error.tsx
  app/(member)/error.tsx

Each should be a "use client" component showing:
  - "Something went wrong" heading
  - Error message (sanitized)
  - "Try again" button that calls reset()
  - Link back to dashboard

Example pattern:
  "use client"
  export default function Error({ error, reset }) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div>
          <h2>Something went wrong</h2>
          <p>{error.message}</p>
          <button onClick={reset}>Try again</button>
        </div>
      </div>
    )
  }

TEST:
  [ ] Temporarily break a Supabase query on members page
  [ ] Page shows error boundary instead of raw crash
  [ ] "Try again" button reloads the page
  [ ] Other pages in the app still work normally

---

### TASK 6.2 — Loading Skeletons
Status: [ ]
Problem: Only dashboard has loading.tsx. All other pages show blank during load.

Fix: Create loading.tsx for high-traffic pages

Files to create (use Skeleton component from components/ui/skeleton.tsx):
  app/(admin)/admin/members/loading.tsx
    → Show skeleton table rows (5 rows, each with avatar + 6 columns)

  app/(admin)/admin/finance/loading.tsx
    → Show skeleton KPI cards (4 cards)

  app/(admin)/admin/payments/loading.tsx
    → Show skeleton table rows

  app/(reception)/reception/members/loading.tsx
    → Same as admin members loading

  app/(reception)/reception/payments/loading.tsx
    → Skeleton rows

Each loading.tsx just exports a component with Skeleton elements
matching the shape of the real page.

TEST:
  [ ] Throttle network to "Slow 3G" in browser devtools
  [ ] Navigate to /admin/members → skeleton rows appear while loading
  [ ] Navigate to /admin/finance → skeleton cards appear while loading
  [ ] No blank white flash on any page

---

### PHASE 6 FINAL TEST CHECKLIST
  [ ] Break a Supabase query → error boundary shows (not crash)
  [ ] All 4 portal error boundaries show friendly message
  [ ] Members page shows skeleton on slow network
  [ ] Finance page shows skeleton on slow network
  [ ] npm run typecheck → 0 errors


---

## PHASE 7 — Full End-to-End Testing
## Estimated time: 1.5 days
## Goal: manually test every critical workflow from login to completion

---

### SCENARIO A — New Member + Membership + Payment
Status: [ ]
Steps:
  1. Login as reception (reception@syncfyre.test / Reception@1234)
  2. Go to /reception/members → click "Add Member"
  3. Complete member wizard: fill all required fields
  4. Click Save → member created
  5. New member appears in /reception/members list
  6. Click new member → /reception/members/[id] loads with full profile
  7. Go to /reception/memberships → click "New Subscription"
  8. Select the new member + a plan
  9. Submit → subscription created
  10. Go to /reception/payments → click "Collect Payment"
  11. Select the new member → invoice created → enter payment amount
  12. Submit → payment recorded
  13. Check: payment appears in /reception/payments list
  14. Login as the new member user → /member/dashboard shows active plan
  15. /member/membership shows subscription with days remaining

TEST PASS CRITERIA:
  [ ] Member created successfully with correct member code
  [ ] Subscription shows in admin /admin/members/[id] → Membership tab
  [ ] Payment shows in admin /admin/payments
  [ ] Member portal shows active plan correctly

---

### SCENARIO B — Finance Workflow
Status: [ ]
Steps:
  1. Login as admin
  2. /admin/finance/income/new → add income entry (cash, ₹5000)
  3. /admin/finance/income → new entry appears in list
  4. /admin/finance/expenses/new → add expense (rent, ₹10000, cash)
  5. /admin/finance/expenses → new expense shows as "pending" approval
  6. Click Approve on the expense → status becomes "approved"
  7. /admin/finance/cash-book → cash balance reflects both entries
  8. /admin/finance/reports/profit-loss → shows income/expense breakdown
  9. /admin/finance/accounting/journal → journal entries present
  10. /admin/finance/accounting/trial-balance → totals balanced

TEST PASS CRITERIA:
  [ ] Income entry created and visible
  [ ] Expense approval workflow works
  [ ] Cash book shows running balance
  [ ] P&L shows correct totals

---

### SCENARIO C — Trainer Workflow
Status: [ ]
Steps:
  1. Login as trainer (trainer@syncfyre.test / Trainer@1234)
  2. /trainer/members → see assigned members list
  3. Click a member → member detail shown
  4. /trainer/workouts/new → create workout for that member
  5. /trainer/workouts → workout appears in list
  6. Click Edit on workout → change exercise name → save → updated in list
  7. /trainer/diet-plans/new → create diet plan for same member
  8. /trainer/progress/new → record measurements for member
  9. Login as the member → /member/workouts → assigned workout visible
  10. /member/diet-plan → assigned plan visible
  11. /member/progress → new measurement visible

TEST PASS CRITERIA:
  [ ] Trainer can create and edit workouts
  [ ] Member sees assigned workout and diet plan
  [ ] Progress record visible to member

---

### SCENARIO D — Appointment Full Cycle
Status: [ ]
Steps:
  1. Login as reception
  2. /reception/appointments/new → book appointment: select member + trainer + date + time
  3. Submit → appointment created with status "pending"
  4. /reception/appointments → see appointment in list (status: pending)
  5. Click "Approve" → status becomes "approved"
  6. Login as trainer → /trainer/appointments → see the approved appointment
  7. Click "Complete" → status becomes "completed"
  8. Login as member → /member/appointments → see session in past sessions

TEST PASS CRITERIA:
  [ ] Appointment created by reception
  [ ] Status transitions work at each portal
  [ ] Member sees their session history

---

### SCENARIO E — Member Self-Service
Status: [ ]
Steps:
  1. Login as member
  2. /member/profile → click "Edit Profile"
  3. Change phone number → save → new phone shows in profile
  4. /member/attendance → visit history visible with entry times
  5. /member/payments → payment history visible
  6. /member/notifications → notification list loads (or empty state)
  7. /member/progress → check-in history with measurements
  8. /member/workouts → assigned workouts visible
  9. /member/diet-plan → current diet plan visible

TEST PASS CRITERIA:
  [ ] Profile edit saves and persists
  [ ] All 8 member nav pages load without error
  [ ] All pages show real data or proper empty states

---

### PHASE 7 FINAL TEST CHECKLIST
  [ ] Scenario A — member enrollment complete flow ✓
  [ ] Scenario B — finance workflow complete flow ✓
  [ ] Scenario C — trainer workflow complete flow ✓
  [ ] Scenario D — appointment cycle complete flow ✓
  [ ] Scenario E — member self-service complete flow ✓
  [ ] All 4 portals: zero 404 errors
  [ ] All 4 portals: zero build errors
  [ ] All 4 portals: data shows correctly on mobile (375px width)
  [ ] Dark mode: toggle → no white-on-white or black-on-black issues
  [ ] npm run typecheck → 0 errors
  [ ] npm run lint → 0 errors


---

## COMPLETE TASK SUMMARY — QUICK REFERENCE
## Use this as your daily checklist

PHASE 1 — Critical Fixes (2 days)
  [ ] 1.1 — Fix branch name in database (SQL in Supabase)
  [ ] 1.2 — Fix reception members/[id] page (broken import)
  [ ] 1.3 — Fix reception memberships page (real data + new subscription form)
  [ ] 1.4 — Create member notifications page
  [ ] 1.5 — Create trainer notifications page
  [ ] 1.6 — Create trainer settings page

PHASE 2 — Admin Module Pages (4 days)
  [ ] 2.1 — Admin trainers page (list + detail)
  [ ] 2.2 — Admin appointments page (list + status management)
  [ ] 2.3 — Admin equipment page (list)
  [ ] 2.4 — Admin notifications page (list + mark read)
  [ ] 2.5 — Admin reports page (hub + 4 sub-reports)
  [ ] 2.6 — Admin staff page (list)

PHASE 3 — Trainer Edit Flows (2 days)
  [ ] 3.1 — Fix trainer dashboard dead code + clickable cards
  [ ] 3.2 — Trainer workout edit + delete
  [ ] 3.3 — Trainer diet plan edit + delete
  [ ] 3.4 — Trainer progress record edit + delete

PHASE 4 — Member Enhancements (1.5 days)
  [ ] 4.1 — Member profile edit form
  [ ] 4.2 — Member payments page + add to nav
  [ ] 4.3 — Appointment status buttons (reception + trainer)

PHASE 5 — Admin Settings (1 day)
  [ ] 5.1 — Settings tabs: Branch Info, Income Categories, Expense Categories

PHASE 6 — Error Handling & Loading (1 day)
  [ ] 6.1 — Error boundaries on all 4 portals
  [ ] 6.2 — Loading skeletons on members, finance, payments pages

PHASE 7 — End-to-End Testing (1.5 days)
  [ ] 7.A — Member enrollment + membership + payment flow
  [ ] 7.B — Finance income/expense/approval/P&L flow
  [ ] 7.C — Trainer workout/diet/progress flow
  [ ] 7.D — Appointment full cycle flow
  [ ] 7.E — Member self-service flow
  [ ] Final: typecheck + lint + mobile + dark mode

---

TOTAL ESTIMATE: ~13 working days solo

DAILY HABIT:
  Morning: pick 2-3 tasks from current phase
  Evening: npm run typecheck, npm run lint, test the pages you built
  Never leave broken TypeScript overnight — it compounds

---

## REUSABLE CODE — DO NOT REBUILD

Services (already exist, just call them):
  getDashboardData(branchId)
  getRecentMembers / getRecentPayments / getRecentAttendance
  listMembersRich(filters)
  getMemberById / getMemberSubscriptions / getMemberPayments
  getTrainerReport({ branchId })
  getMembersReport / getPaymentsReport / getAttendanceReport
  getMonthlyRevenueSummary / getRevenueReport
  listIncome / createIncome / listExpenses / createExpense
  listReceivables / getFinanceDashboardMetrics
  listJournalEntries / getTrialBalance / listChartOfAccounts
  listBankAccounts / listCashBook

Actions (already exist):
  createIncomeAction / createExpenseAction / approveExpenseAction
  createBankAccountAction / postJournalEntryAction
  createMembershipPlanAction / updateMembershipPlanAction
  renewMembership / assignTrainer / deactivateMember

Components (already exist, reuse):
  MetricCard (supports href for click navigation)
  DashboardCharts / FinanceCharts
  MembersRegisterTable / MemberFilters / MemberTableToolbar
  MemberProfileTabs
  AddMemberWizard / MemberEditForm
  RenewMembershipDialog / AssignTrainerDialog / DeleteMemberDialog
  InvoiceForm / MembershipPlanForm
  ResourceCreateForm (posts to /api/[resource])
  ModuleOverview (feature cards with optional records table)

---

## FILE NAMING CONVENTIONS

New server actions go in:   app/actions/[feature]-actions.ts
New pages go in:            app/(portal)/portal/module/page.tsx
New components go in:       components/[module]/component-name.tsx
New services go in:         services/[module].service.ts

Never modify other developer files if working with a team.
Keep each file under 200 lines — split into components if needed.

---
Last updated: August 2026
