# SyncFyre — Solo Developer Plan (Admin-First)
# Developer: Aastha | Updated: August 2026
# Rule: Complete and test each task before starting the next.
# After every session: npm run typecheck && npm run lint → must be 0 errors.

---

## CURRENT STATUS SNAPSHOT

### ✅ Fully working right now
- Login / logout / forgot password / reset password
- Admin dashboard — live KPIs, charts, activity feed
- Admin members — rich list, search, filters, pagination, add wizard, edit, delete, photo upload
- Admin members/[id] — all 8 tabs (profile, membership, payments, attendance, progress, workouts, diet, notifications) — **MemberProfileTabs render-prop bug fixed**
- Admin memberships — plan list, create plan, edit plan
- Admin attendance — log view with entry/exit times
- Admin payments — list, filter, CSV export
- Admin invoices — create new, detail with receipt print
- Admin finance — full 12-KPI dashboard, income, expenses, bank, GST, P&L
- Admin finance accounting — COA, journal, ledger, trial balance
- Auth form — useRouter / useEffect imports fixed

### ❌ Admin module gaps (this plan fixes all of these first)
- /admin/trainers → catch-all placeholder (no real data)
- /admin/appointments → catch-all placeholder (no status actions)
- /admin/staff → catch-all placeholder
- /admin/equipment → catch-all placeholder
- /admin/notifications → catch-all placeholder
- /admin/reports → catch-all placeholder (no UI, service layer ready)
- /admin/settings → face machines only (no branch/categories)
- Finance sub-pages → income/new, expenses/new, bank/new-account missing pages
- Finance P&L report page missing
- Finance accounting sub-pages exist but some are empty folders

### ❌ Other portals (touch only after admin is 100% complete)
- Reception members/[id] broken import
- Reception memberships placeholder
- Member notifications 404
- Member payments 404
- Member profile edit view-only
- Trainer edit workout/diet/progress
- Trainer notifications/settings 404
- Error boundaries missing on all portals
- Loading skeletons missing on most pages

---

## ADMIN MODULE COMPLETION PLAN

---

## PHASE A — Fill the 6 catch-all gaps in admin sidebar
## Time estimate: 3 days
## Goal: every sidebar link in admin shows real data, not a placeholder

---

### TASK A.1 — Admin Trainers Page
**Status: [x]**
**Files to create:**
- `app/(admin)/admin/trainers/page.tsx`
- `app/(admin)/admin/trainers/[id]/page.tsx`

**page.tsx must:**
- Call `getTrainerReport({ branchId })` from `services/report.service.ts`
- Show table: Name, Specializations, Experience, Assigned Members count, Status
- Status filter (active/inactive/all), name search
- "Add Trainer" → `/admin/trainers/new` (catch-all handles the form)
- Each row links to `/admin/trainers/[id]`
- Pagination

**[id]/page.tsx must:**
- Fetch trainer by `supabase.from("trainers").select("*, users(full_name, email, phone)").eq("id", id)`
- Show profile: name, email, phone, bio, specializations, experience, certifications
- List assigned members: `supabase.from("members").select("id, full_name, member_code, status").eq("assigned_trainer_id", id)`
- List upcoming appointments: `supabase.from("appointments").select("*,members(full_name)").eq("provider_staff_id", id).gte("appointment_date", today)`
- Edit button → `/admin/trainers/new` pre-filled (or link to [module]/new)

**TEST:**
- [ ] `/admin/trainers` loads real trainer list (not catch-all placeholder)
- [ ] Search by name filters the list
- [ ] Status filter works
- [ ] Click "Add Trainer" → resource create form opens and submits
- [ ] Click a trainer row → detail page shows profile + assigned members + appointments
- [ ] `npm run typecheck` → 0 errors

---

### TASK A.2 — Admin Appointments Page
**Status: [x]**
**Files to create:**
- `app/(admin)/admin/appointments/page.tsx`
- `app/actions/appointment-actions.ts`

**page.tsx must:**
- Fetch: `supabase.from("appointments").select("*, members(full_name, member_code), staff:provider_staff_id(users(full_name))").order("appointment_date")`
- Branch filter applied
- Columns: Member, Date, Time, Provider, Type, Status, Actions
- Filters: status (pending/approved/completed/cancelled), date range picker
- Status action buttons:
  - pending → "Approve" button
  - approved → "Complete" + "Cancel" buttons
- "Book Appointment" → `/admin/appointments/new`
- Default view: today + future. Toggle to show past.
- Pagination

**appointment-actions.ts must:**
```ts
"use server"
export async function updateAppointmentStatusAction(id: string, status: string) {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const supabase = await createClient();
  await supabase.from("appointments").update({ status }).eq("id", id);
  revalidatePath("/admin/appointments");
  revalidatePath("/reception/appointments");
  revalidatePath("/trainer/appointments");
}
```

**TEST:**
- [ ] `/admin/appointments` loads real appointment list
- [ ] Status filter shows only matching rows
- [ ] Click "Approve" on a pending appointment → row status updates to approved
- [ ] Click "Complete" on approved → updates to completed
- [ ] Click "Cancel" → updates to cancelled
- [ ] "Book Appointment" opens and submits successfully
- [ ] `npm run typecheck` → 0 errors

---

### TASK A.3 — Admin Equipment Page
**Status: [x]**
**File to create:** `app/(admin)/admin/equipment/page.tsx`

**Must:**
- Fetch: `supabase.from("equipment").select("*").order("machine_name")`
- Branch filter applied
- Columns: Machine Name, Category, Serial Number, Purchase Date, Warranty Until, Next Maintenance, Status
- Status badge colors: operational=green, maintenance_due=amber, under_maintenance=blue, out_of_service=red, retired=gray
- Search by machine name, status filter
- "Add Equipment" → `/admin/equipment/new` (catch-all handles form)
- Pagination

**TEST:**
- [ ] `/admin/equipment` loads equipment list (or empty state "No equipment added yet")
- [ ] "Add Equipment" → opens resource create form → submits → new row appears
- [ ] Status badges show correct colors
- [ ] `npm run typecheck` → 0 errors

---

### TASK A.4 — Admin Staff Page
**Status: [x]**
**File to create:** `app/(admin)/admin/staff/page.tsx`

**Must:**
- Fetch: `supabase.from("staff").select("*, users(full_name, email)").order("employee_code")`
- Branch filter applied
- Columns: Name, Employee Code, Designation, Joining Date, Salary, Status
- Search by name, status filter
- "Add Staff" → `/admin/staff/new` (catch-all handles form)
- Pagination

**TEST:**
- [ ] `/admin/staff` loads staff list (or empty state)
- [ ] "Add Staff" form opens and submits
- [ ] New staff appears in list after creation
- [ ] `npm run typecheck` → 0 errors

---

### TASK A.5 — Admin Notifications Page
**Status: [x]**
**File to create:** `app/(admin)/admin/notifications/page.tsx`

**Must:**
- Fetch: `supabase.from("notifications").select("*").eq("branch_id", branchId).order("created_at", {ascending:false}).limit(50)`
- Columns: Title, Message, Type badge, Channels, Scheduled For, Sent At, Read status
- Filter: Unread / All (check `read_at IS NULL`)
- Mark as read button → server action updates `read_at`
- "Create Notification" → `/admin/notifications/new`
- Unread count badge in the list header

**Server action (inline in page or in `app/actions/notification-actions.ts`):**
```ts
async function markReadAction(id: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/notifications");
}
```

**TEST:**
- [ ] `/admin/notifications` loads notification list
- [ ] Unread notifications visually distinct (bold or colored dot)
- [ ] Click "Mark read" → dot disappears, row style changes
- [ ] Filter "Unread" hides read notifications
- [ ] "Create Notification" form opens and creates record
- [ ] `npm run typecheck` → 0 errors

---

### TASK A.6 — Admin Reports Hub + 4 Sub-pages
**Status: [x]**
**Files to create:**
- `app/(admin)/admin/reports/page.tsx` (hub)
- `app/(admin)/admin/reports/members/page.tsx`
- `app/(admin)/admin/reports/payments/page.tsx`
- `app/(admin)/admin/reports/revenue/page.tsx`
- `app/(admin)/admin/reports/attendance/page.tsx`

**Hub page must:**
- 9 cards linking to sub-pages: Members, Payments, Revenue, Attendance, Membership, Trainers, Monthly Joining, Pending Payments, Subscriptions
- Each card: title, description, "View Report" button, "Export CSV" button

**Members report (`/admin/reports/members`) must:**
- Use `getMembersReport({ branchId, page, pageSize, status, search })`
- Table: member_code, full_name, phone, gender, plan, expiry, status, joined_date
- Search + status filter + pagination
- "Export CSV" → `/api/reports?resource=members`

**Payments report (`/admin/reports/payments`) must:**
- Use `getPaymentsReport({ branchId, page, pageSize, status, method, dateFrom, dateTo })`
- Date range pickers, status + method filters
- "Export CSV" → `/api/reports?resource=payments`

**Revenue report (`/admin/reports/revenue`) must:**
- Use `getMonthlyRevenueSummary({ branchId })`
- Monthly table: Month, Transactions, Gross, Refunds, Net Revenue
- Revenue trend chart (reuse `DashboardCharts`)

**Attendance report (`/admin/reports/attendance`) must:**
- Use `getAttendanceReport({ branchId, dateFrom, dateTo, page, pageSize })`
- Date range filter, member search
- "Export CSV" → `/api/reports?resource=attendance`

**TEST:**
- [ ] `/admin/reports` hub shows 9 cards
- [ ] Click Members report → table with real member data loads
- [ ] Search in members report filters rows
- [ ] "Export CSV" downloads a file
- [ ] Click Payments report → payment table with date range filter works
- [ ] Click Revenue report → monthly table and chart show
- [ ] Click Attendance report → attendance log with date filter works
- [ ] `npm run typecheck` → 0 errors

---

### PHASE A FINAL CHECK
**Run before moving to Phase B:**
- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] Every admin sidebar link navigates to a real page (no placeholders)
- [ ] `/admin/trainers` — real data
- [ ] `/admin/appointments` — real data, approve/complete/cancel work
- [ ] `/admin/equipment` — real data or empty state with add working
- [ ] `/admin/staff` — real data or empty state with add working
- [ ] `/admin/notifications` — real data, mark read works
- [ ] `/admin/reports` — hub + all 4 sub-reports load and export

---

## PHASE B — Fix Admin Finance Missing Pages
## Time estimate: 1.5 days
## Goal: every finance nav link works end-to-end

---

### TASK B.1 — Income Create Page
**Status: [x]**
**File:** `app/(admin)/admin/finance/income/new/page.tsx`

**Must:**
- `requireUser(["admin", "manager"])`
- Fetch: income categories, members list (for member selector)
- Form fields: category (select), member (optional select), amount, GST%, date, description, payment method, transaction ref
- Auto-calculate: total = amount + (amount × gst% / 100)
- Submit: `createIncomeAction` from `app/actions/finance-actions.ts`
- On success: redirect to `/admin/finance/income`
- Cancel: back button

**TEST:**
- [ ] `/admin/finance/income` → "Add Income" button links to new page (not 404)
- [ ] Form fields render correctly with category dropdown populated
- [ ] Fill form → submit → redirects to income list
- [ ] New entry appears in income list with correct amount and category
- [ ] `npm run typecheck` → 0 errors

---

### TASK B.2 — Expense Create Page
**Status: [x]**
**File:** `app/(admin)/admin/finance/expenses/new/page.tsx`

**Must:**
- `requireUser(["admin", "manager"])`
- Fetch: expense categories, vendors list
- Form fields: category (select), vendor (optional select), amount, GST%, bill number, date, description, payment method, recurring toggle, attachment note
- Auto-calculate total
- Submit: `createExpenseAction`
- On success: redirect to `/admin/finance/expenses`

**TEST:**
- [ ] `/admin/finance/expenses` → "Add Expense" button links to new page
- [ ] Category and vendor dropdowns populate with real data
- [ ] Submit form → expense created with status "pending"
- [ ] New expense appears in expense list
- [ ] Approve button on expense works (status → approved)
- [ ] `npm run typecheck` → 0 errors

---

### TASK B.3 — Bank Account Create Page
**Status: [x]**
**File:** `app/(admin)/admin/finance/bank/new-account/page.tsx`

**Must:**
- Form fields: account name, bank name, account number, IFSC code, account type (select: savings/current/overdraft/cash), opening balance, is_default toggle
- Submit: `createBankAccountAction`
- On success: redirect to `/admin/finance/bank`

**TEST:**
- [ ] `/admin/finance/bank` → "Add Bank Account" button links to new page
- [ ] Fill form → submit → new account card appears on bank page
- [ ] Current balance equals opening balance for new account
- [ ] `npm run typecheck` → 0 errors

---

### TASK B.4 — Finance P&L Report Page
**Status: [x]**
**File:** `app/(admin)/admin/finance/reports/profit-loss/page.tsx`

**Must:**
- Date range selector (default: current month, options: last 3M / 6M / 1Y / custom)
- Call `getProfitAndLoss(branchId, dateFrom, dateTo)` from `services/finance.service.ts`
- Show two-column breakdown:
  - Income by category (table + bar)
  - Expense by category (table + bar)
- Summary: Total Income, Total Expenses, Net Profit (colored green/red)
- "Export" button → `/api/finance/profit-loss?from=&to=`

**TEST:**
- [ ] `/admin/finance/reports/profit-loss` loads without 404
- [ ] Correct month's data shows by default
- [ ] Change date range → table updates
- [ ] Net profit calculation is correct (income − expenses)
- [ ] `npm run typecheck` → 0 errors

---

### TASK B.5 — Fill Empty Finance Accounting Sub-pages
**Status: [x]**
**Check each folder — create page.tsx if missing:**

`app/(admin)/admin/finance/accounting/chart-of-accounts/page.tsx`
- Call `listChartOfAccounts(branchId)`
- Show tree-style table: account_code, account_name, account_type, opening_balance
- Group by account_type
- "Add Account" → `/admin/finance/accounting/chart-of-accounts/new` (resource form)

`app/(admin)/admin/finance/accounting/journal/page.tsx`
- Call `listJournalEntries({ branchId, page, pageSize })`
- Show: journal_number, date, narration, total_debit, total_credit, status
- "Post" button on draft entries → calls `postJournalEntryAction`

`app/(admin)/admin/finance/accounting/ledger/page.tsx`
- Account selector dropdown (from `listChartOfAccounts`)
- Date range filter
- Call `getLedger({ branchId, accountId, dateFrom, dateTo })`
- Show: date, narration, debit, credit, running balance

`app/(admin)/admin/finance/accounting/trial-balance/page.tsx`
- Call `getTrialBalance(branchId)`
- Show: account_code, account_name, account_type, debit, credit, net
- Footer totals row

**TEST:**
- [ ] All 4 accounting sub-pages load without 404
- [ ] Chart of accounts shows account tree
- [ ] Journal page shows entries, Post button works on draft entry
- [ ] Ledger requires account selection, then shows entries
- [ ] Trial balance shows all accounts with debit/credit totals
- [ ] `npm run typecheck` → 0 errors

---

### PHASE B FINAL CHECK
- [ ] `npm run typecheck` → 0 errors
- [ ] `/admin/finance/income/new` → form works and creates entry
- [ ] `/admin/finance/expenses/new` → form works and creates entry
- [ ] `/admin/finance/bank/new-account` → form works
- [ ] `/admin/finance/reports/profit-loss` → loads with real data
- [ ] All 4 accounting sub-pages load and show data
- [ ] Finance quick-links panel — every link resolves to a real page

---

## PHASE C — Admin Settings Expansion
## Time estimate: 1 day
## Goal: settings page has branch config + category management

---

### TASK C.1 — Expand Admin Settings with Tabs
**Status: [x]**
**File:** `app/(admin)/admin/settings/page.tsx` (update existing)

**Add URL-param based tabs (`?tab=machines|branch|income|expense`):**

**Tab: Face Machines (existing — keep)**

**Tab: Branch Info**
- Show: name, city, address, phone, GSTIN (from `finance_settings` table)
- Edit form → server action `updateBranchAction`
  - Updates `public.branches` name/city/address/phone
  - Updates `public.finance_settings` gstin, fiscal_year_start_month

**Tab: Income Categories**
- Show all income categories (from `listIncomeCategories(branchId)`)
- Add new: name + code form → `upsertIncomeCategory`
- Deactivate: server action sets status='inactive'

**Tab: Expense Categories**
- Same as income categories but for expenses
- `listExpenseCategories`, `upsertExpenseCategory` (add this to finance.service if missing)

**TEST:**
- [ ] `/admin/settings` — 4 tabs visible
- [ ] Branch Info tab shows current branch name
- [ ] Edit branch name → save → name updates everywhere in app
- [ ] Income Categories tab shows 8 system categories
- [ ] Add custom income category → appears in income/new dropdown
- [ ] Add custom expense category → appears in expense/new dropdown
- [ ] `npm run typecheck` → 0 errors

---

### PHASE C FINAL CHECK
- [ ] Settings has 4 working tabs
- [ ] Branch name editable and persists
- [ ] Custom categories usable in income/expense forms

---

## PHASE D — Admin Error Handling + Loading States
## Time estimate: 0.5 day

---

### TASK D.1 — Error Boundaries
**Status: [x]**
**Files to create:**
- `app/(admin)/error.tsx`
- `app/(admin)/admin/finance/error.tsx`
- `app/(admin)/admin/members/error.tsx`

Each file:
```tsx
"use client";
import { Button } from "@/components/ui/button";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-[50vh] place-items-center text-center p-8">
      <div>
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
```

**TEST:**
- [ ] Temporarily add `throw new Error("test")` to members page
- [ ] Page shows error boundary instead of white crash
- [ ] "Try again" reloads correctly
- [ ] Remove the test throw → page works normally

---

### TASK D.2 — Loading Skeletons
**Status: [x]**
**Files to create:**

`app/(admin)/admin/members/loading.tsx`
```tsx
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-10 w-48" />
      <div className="space-y-2">
        {Array.from({length: 8}).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
      </div>
    </div>
  );
}
```

`app/(admin)/admin/finance/loading.tsx`
```tsx
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({length: 8}).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
```

`app/(admin)/admin/payments/loading.tsx`
→ Same skeleton table pattern as members

**TEST:**
- [ ] Open browser DevTools → Network → set to "Slow 3G"
- [ ] Navigate to `/admin/members` → skeleton rows appear before data
- [ ] Navigate to `/admin/finance` → skeleton cards appear before data

---

### PHASE D FINAL CHECK
- [ ] Error boundary shows on intentional crash
- [ ] Loading skeleton shows on members page (slow network)
- [ ] Loading skeleton shows on finance page (slow network)

---

## PHASE E — Admin End-to-End Testing
## Time estimate: 1 day
## Goal: manually walk through every critical admin workflow

---

### SCENARIO 1 — Member Registration + Subscription + Payment
**Status: [ ]**
1. Login as admin → `/admin/members` → "Add Member"
2. Fill wizard: full_name="Test Member", phone="9999999999", branch=MAIN, status=active
3. Submit → redirects to members list → new member visible with MEM-XXXXXX code
4. Click new member → detail page loads with all 8 tabs
5. Membership tab → "Renew Membership" → select 1 Month plan → submit
6. Membership tab shows new subscription with correct dates
7. Payments tab → "Collect Payment" via `/admin/invoices/new`
8. Select new member → plan autofills → submit → payment recorded
9. Payments tab on member detail shows the payment
10. Finance → Income shows auto-created income entry from payment

**Pass criteria:**
- [ ] Member created with correct code
- [ ] Subscription active with correct end date
- [ ] Payment shows in both payments list and member detail
- [ ] Income auto-entry created in finance module

---

### SCENARIO 2 — Finance Cycle
**Status: [ ]**
1. `/admin/finance/income/new` → add manual income (category=Supplements, ₹2000, cash)
2. `/admin/finance/income` → new entry visible
3. `/admin/finance/expenses/new` → add expense (category=Electricity, ₹15000, online)
4. `/admin/finance/expenses` → new expense visible as "pending"
5. Click Approve → status becomes "approved"
6. `/admin/finance/cash-book` → cash entries reflect cash payments
7. `/admin/finance/reports/profit-loss` → income and expense categories visible
8. `/admin/finance/outstanding` → any outstanding balances from seed data visible

**Pass criteria:**
- [ ] Income entry created and categorized correctly
- [ ] Expense approval workflow works
- [ ] P&L report shows correct income vs expense breakdown
- [ ] Outstanding shows members with balance>0 from seed data

---

### SCENARIO 3 — Appointment Lifecycle
**Status: [ ]**
1. `/admin/appointments` → real list visible
2. Click "Book Appointment" → select member + trainer + date
3. Submit → new appointment with status=pending appears in list
4. Click "Approve" → status becomes approved
5. Click "Complete" → status becomes completed
6. Filter by "completed" → only that appointment shows

**Pass criteria:**
- [ ] Appointment created via form
- [ ] Status transitions all work in sequence
- [ ] Filter works correctly after each change

---

### PHASE E FINAL CHECK — ALL ADMIN TASKS COMPLETE
- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] Every admin sidebar link → real page with real data
- [ ] Member create + subscription + payment scenario passes
- [ ] Finance income/expense/approval/P&L scenario passes
- [ ] Appointment approve/complete scenario passes
- [ ] Error boundary shows on crash, loading shows on slow network
- [ ] All finance sub-pages (income/new, expenses/new, bank/new-account, P&L, accounting) work

---

## AFTER ADMIN IS COMPLETE — OTHER PORTALS

Only start Phase F after Phase E final check passes.

---

## PHASE F — Reception Portal Completion
### F.1 Reception members/[id] — fix broken import
### F.2 Reception memberships — real plan list + subscription create
### F.3 Reception appointments — add Approve action button
### F.4 Reception invoices/new — already exists, verify it works

---

## PHASE G — Trainer Portal Edit Flows
### G.1 Fix trainer dashboard dead code (void-ed queries)
### G.2 Workout edit + delete
### G.3 Diet plan edit + delete
### G.4 Progress record edit + delete
### G.5 Trainer notifications page
### G.6 Trainer settings page

---

## PHASE H — Member Portal Enhancements
### H.1 Member profile edit (form, not read-only)
### H.2 Member payments page + nav item
### H.3 Member notifications page + nav item

---

## PHASE I — Final Polish
### I.1 Error boundaries for reception + trainer + member portals
### I.2 Loading skeletons for reception + member pages
### I.3 Full end-to-end test all 5 portals

---

## QUICK REFERENCE — TASK STATUS TRACKER

| Task | Status | Test passed |
|---|---|---|
| A.1 Admin Trainers page | [x] | [ ] |
| A.2 Admin Appointments page + status actions | [x] | [ ] |
| A.3 Admin Equipment page | [x] | [ ] |
| A.4 Admin Staff page | [x] | [ ] |
| A.5 Admin Notifications page | [x] | [ ] |
| A.6 Admin Reports hub + 4 sub-reports | [x] | [ ] |
| B.1 Finance Income create page | [x] | [ ] |
| B.2 Finance Expense create page | [x] | [ ] |
| B.3 Finance Bank account create page | [x] | [ ] |
| B.4 Finance P&L report page | [x] | [ ] |
| B.5 Finance Accounting sub-pages | [x] | [ ] |
| C.1 Settings expand with 4 tabs | [x] | [ ] |
| D.1 Error boundaries (admin) | [x] | [ ] |
| D.2 Loading skeletons (members + finance) | [x] | [ ] |
| E.1 E2E: member + subscription + payment | [ ] | [ ] |
| E.2 E2E: finance cycle | [ ] | [ ] |
| E.3 E2E: appointment lifecycle | [ ] | [ ] |

---

*Start with A.1 — Admin Trainers page. Complete it, run tests, mark done, then move to A.2.*
