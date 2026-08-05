# Excel → Database Column Mapping
## File: DAILY SALE 2025-026.xlsx

---

## TABLE 1: MEMBER REGISTER MAPPING

| Excel Column | DB Table | DB Column | Transformation | Validation Rules |
|---|---|---|---|---|
| S.NO | — | — | Row counter only, discard | — |
| NAME | members | full_name | Trim, title-case, remove extra spaces | NOT NULL, min 2 chars |
| PAC (Package) | subscriptions → membership_plans | plan_id | Parse plan code → lookup plan_id | Must match known plan |
| Join Date | members | created_at + subscriptions.start_date | Parse date formats: DD/MM/YY, D-Mon-YY, M/D/YY | Valid date, not future |
| Expiry Date | subscriptions | end_date | Parse date or derive from start_date + duration | Must be >= start_date |
| PT..T NAME / P.T | trainer_assignments | trainer_id | Normalize trainer name → lookup trainer_id | NULL allowed |
| PT amount | payments | amount (for PT portion) | Extract numeric value from notes | >0 if present |
| BALANCE | invoices | total_amount - amount_paid | Remaining balance = plan price - paid | >=0 |
| PAID | payments | amount | Numeric amount paid | >0 |
| Contact Number | members | phone | Strip spaces, validate 10 digits | 7-15 chars |

---

## TABLE 2: DAILY SALES / CASH REGISTER MAPPING

| Excel Column | DB Table | DB Column | Transformation | Validation Rules |
|---|---|---|---|---|
| Date | payments | paid_at (date) | Parse date DD-Mon / numeric | Valid date |
| Amount | payments | amount | Numeric | > 0 |
| Member Name | members | full_name (lookup) | Match to existing member | Warn if not found |
| Package | subscriptions | — | Determines subscription type | |
| UPI Amount | payments | amount | If > 0 → payment_method = 'upi' | >= 0 |
| Payment Method | payments | method | Map: CASH→cash, UPI KOTAK→upi, CARD→card, CHEQUE→card | Required |
| TOTAL SALE | — | (summary, discard) | Cross-check only | |
| CASH SALE | — | (summary, discard) | Cross-check only | |
| C CARD SALE | — | (summary, discard) | Cross-check only | |
| DEPOSIT | — | (summary, discard) | Bank deposit record, discard | |
| EXPENSES | — | (summary, discard) | No expenses table in schema | |
| M.T.D | — | (summary, discard) | Month-to-date total | |

---

## TABLE 3: EXPENSE LINE ITEMS MAPPING

| Excel Column | DB Table | DB Column | Transformation | Validation Rules |
|---|---|---|---|---|
| Amount | — | NO EXPENSES TABLE | Cannot import — no expenses table in schema | — |
| Description | — | NO EXPENSES TABLE | Log as activity_logs note only | — |
| Vendor/Recipient | — | NO EXPENSES TABLE | Cannot import | — |

**Decision: Expense data CANNOT be imported into the current schema.**
**Recommendation: Log expense totals in `settings` table as JSON, or skip.**

---

## TABLE 4: SALARY PAYMENTS MAPPING (from Dec 24 sheet)

| Name | Amount | DB Table | Note |
|---|---|---|---|
| DOLLY MA'AM | ₹5500 | — | Staff salary — no payroll table |
| RUPESH SHIRBHATE SIR | ₹8700 | — | Trainer salary |
| ASHISH DAHAT SIR | ₹33300 | — | Trainer salary |
| HARSHAL YAWALE SIR | ₹25800 | — | Trainer salary |
| etc. | — | — | Cannot import — staff.salary stores rate, not disbursements |

**Decision: Salary disbursements CANNOT be imported — no payroll table.**

---

## TABLE 5: MEMBERSHIP PLAN NORMALIZATION

| Excel Variant | Normalized Plan Name | Duration Months | Type | Suggested Price |
|---|---|---|---|---|
| 1m, 1M, 1 M | 1 Month Standard | 1 | standard | 3000 |
| 3m, 3M | 3 Month Standard | 3 | standard | 7000 |
| 6m, 6M | 6 Month Standard | 6 | standard | 10000 |
| 12m, 12M, 1y, 1Y | 12 Month Standard | 12 | standard | 15000 |
| 1mpt, 1m p.t, 1M P.T, 1m APT | 1 Month Personal Training | 1 | personal_training | 7000 |
| 1m alt pt, 1M APT, 1m A PT | 1 Month Alternate PT | 1 | alternate_pt | 4000 |
| 1m d pt, 1M D PT | 1 Month Double PT | 1 | double_pt | 7000 |
| 3mpt, 3m p.t, 3M P.T | 3 Month Personal Training | 3 | personal_training | 18000 |
| 6mpt, 6m p.t | 6 Month Personal Training | 6 | personal_training | 22000 |
| 10m pt, 10mpt | 10 Month Personal Training | 10 | personal_training | 30000 |
| 12mpt | 12 Month Personal Training | 12 | personal_training | 38000 |
| cp, C.P | Couple Plan 1 Month | 1 | couple | 5000 |
| 12m cp, 12M CP | Couple Plan 12 Month | 12 | couple | 25000 |
| 6m cp | Couple Plan 6 Month | 6 | couple | 18000 |
| 3m cp | Couple Plan 3 Month | 3 | couple | 12000 |
| 1 day, 1day | Day Pass | 0 (1 day) | day_pass | 500 |
| 1 w, 1week | Weekly Pass | 0 (7 days) | weekly | 2000 |
| 15 days | Fortnightly Pass | 0 (15 days) | fortnightly | 2500 |
| 10 days | 10-Day Pass | 0 (10 days) | ten_day | 2000 |
| Locker | Locker Rental | 1 | addon | 1000 |

---

## TABLE 6: PAYMENT METHOD MAPPING

| Excel Value | DB Enum | Notes |
|---|---|---|
| CASH | cash | Standard |
| UPI KOTAK | upi | Kotak Bank UPI |
| CARD | card | Credit/Debit card |
| CHEQUE NO XXXXXX | card | Cheque → map to card with cheque number as transaction_reference |
| UPI | upi | Generic UPI |
| KOTAK | upi | Kotak UPI shorthand |
| ONLINE | online | Generic online |
| 0 (zero amount) | — | Cash payment recorded separately or missing |

---

## DATE FORMAT PATTERNS FOUND IN EXCEL

| Pattern | Example | Parse Format |
|---|---|---|
| DD-Mon-YY | 13-Dec | DD-MMM (year from sheet context) |
| D-Mon-25 | 7/1/25 | M/D/YY |
| DD/MM/YYYY | 7/11/25 | M/D/YY |
| Month/Day/Year | 3/4/25 | M/D/YY |
| Day-Mon-Year | 7-Oct-25 | D-MMM-YY |
| Month name | 1-Apr-25 | D-MMM-YY |
| Ambiguous | 31.1.026 | DD.MM.YYYY (typo in year) |
| 31-Jan-00 | 31-Jan-26 | Likely year typo → 2026 |
