# Excel Workbook Sheet Analysis
## File: DAILY SALE 2025-026.xlsx
## Analysis Date: 2026-08-05

---

## SHEETS IDENTIFIED

| Sheet Name | Purpose | Data Type | Business Workflow |
|---|---|---|---|
| Sheet1 (Dec 2024) | Daily cash register + December member register | Financial log + Member list | Daily sales reconciliation, opening/closing cash, member enrollments |
| JAN25 | January 2025 daily sales + member register | Financial log + Member list | Same as above |
| B25 | February 2025 daily sales | Financial log | Daily sales only (no member register) |
| MAR25 | March 2025 member register | Member list | New joins + renewals for March |
| APRIL25 | April 2025 member register | Member list | New joins for April |
| May 25 | May 2025 member register | Member list | New joins for May with contact numbers |
| june 25 | June 2025 member register | Member list | New joins for June |
| AUG 25 | August 2025 member register + PT sessions | Member list + PT | New joins + PT trainer assignments |
| sep | September 2025 member register | Member list | New joins for September |
| oct25 | October 2025 member register (dual column layout) | Member list | New joins for October |
| nov 26 | November 2025 member register | Member list | New joins for November |
| dec 25 | December 2025 member register | Member list | New joins for December |
| jan 26 | January 2026 member register | Member list | New joins for January 2026 |
| feb 26 | February 2026 member register | Member list | New joins for February 2026 |
| march 26 | March 2026 member register | Member list | New joins for March 2026 |
| april 26 | April 2026 member register | Member list | New joins for April 2026 |
| may26 | May 2026 member register | Member list | New joins for May 2026 |
| june26 | June 2026 member register | Member list | New joins for June 2026 |
| july26 | July 2026 member register | Member list | New joins for July 2026 |

---

## SHEET STRUCTURE ANALYSIS

### Member Register Sheets (APRIL25 onwards)
Columns: S.NO | NAME | PAC (Package) | Join Date | Expiry Date | PT Name | Balance | Paid | Contact Number

### December 2024 / January 2025 Sheets (Dual purpose)
Top section: Date | Amount | Member Name | Package | UPI Amount | Payment Method
Summary section: TOTAL SALE | CASH SALE | C CARD SALE | DEPOSIT | EXPENSES | M.T.D | NO. OF DAYS | AVG SALE | OPENING | CASH IN HAND
Expense section: Individual expense line items with amounts and descriptions
Bottom section: July 25 member register with S.NO | NAME | PAC | Join Date | Expiry Date | PT Name | Balance | Paid

---

## BUSINESS RULES IDENTIFIED FROM EXCEL

### Package Codes → Duration Mapping
| Excel Code | Duration | Plan Type |
|---|---|---|
| 1m / 1M | 1 month | Standard |
| 1 m | 1 month | Standard |
| 3m / 3M | 3 months | Standard |
| 6m / 6M | 6 months | Standard |
| 12m / 12M | 12 months (1 year) | Standard |
| 1y | 12 months | Standard |
| 1mpt / 1m p.t / 1m P.T | 1 month | Personal Training |
| 3mpt / 3m p.t | 3 months | Personal Training |
| 6mpt / 6m p.t | 6 months | Personal Training |
| 10mpt | 10 months | Personal Training |
| 12mpt | 12 months | Personal Training |
| 1m alt pt / 1M APT | 1 month | Alternative PT |
| 1m d pt / 1M D PT | 1 month | Double PT |
| cp | Couple | Couple plan (2 members) |
| 1day / 1 day | 1 day | Day pass |
| 1 w / 1week | 7 days | Weekly |
| 15 days | 15 days | Fortnightly |
| 10 days | 10 days | 10-day pass |
| Locker | Locker add-on | Add-on service |
| BAL / BAL PAID | Balance payment | Partial payment settlement |
| RENEW / RNEW | Renewal | Subscription renewal |
| UPGRADE | Upgrade | Plan upgrade |
| TRANSFER | Transfer | Member transfer |
| FREZING | Freeze | Membership hold |

### Trainers Identified
| Trainer Name Variants | Normalized |
|---|---|
| YASH / yash | Yash |
| HARSHAL / harshal / harshal sir | Harshal |
| RUPESH / rupesh / rupesh sir | Rupesh |
| SUNNY / sunny | Sunny |
| YOGESH / yogesh sir / yogesh | Yogesh |
| ASHISH / ashish | Ashish |
| PRIYANKA / priyanka | Priyanka |
| VAISHALI / vaishali mam | Vaishali |
| KAPIL / kapil | Kapil |
| A (abbreviation) | Unknown/Ashish |
| S (abbreviation) | Unknown/Sunny |
| H (abbreviation) | Unknown/Harshal |
| R (abbreviation) | Unknown/Rupesh |
| Y (abbreviation) | Unknown/Yash |

### PT Fee Structure (extracted from data)
| PT Duration | Fee |
|---|---|
| 1 month PT | ₹2800 - ₹4000 |
| 3 month PT | ₹8400 - ₹12000 |
| 6 month PT | ₹16000 - ₹22000 |
| 10 session PT | ₹2000 - ₹5000 |
| 10 month PT | ₹30000 - ₹60000 |

### Membership Price Points (extracted)
| Plan | Price Range |
|---|---|
| 1 month | ₹1000 - ₹5000 |
| 3 months | ₹5000 - ₹8000 |
| 6 months | ₹8000 - ₹13000 |
| 12 months | ₹11000 - ₹18000 |
| Couple 12m | ₹20000 - ₹30000 |
