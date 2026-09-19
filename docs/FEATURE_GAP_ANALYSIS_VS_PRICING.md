# SyncFyre — Feature Gap Analysis vs Final Pricing Document

**Date:** September 17, 2026  
**Source:** Final Intern Product, Pricing & Website Handoff  
**Method:** Codebase static audit + existing internal analysis  

**Legend:**
- ✅ Built — route, service, UI, and action exist
- ⚠️ Partial — foundation exists, significant gaps remain  
- ❌ Missing — not found in codebase

---

## ESSENTIAL — ₹9,999/year

### Member Management

| Feature | Status | Notes |
|---|---|---|
| Member profiles & IDs | ✅ Built | Full profile, photo, emergency contact, fitness goal |
| Active / Expired / Inactive status | ✅ Built | Filter-based, subscription-driven |
| Membership, payment & attendance history per member | ✅ Built | Detail tabs with all three |
| Search by name, phone, member ID | ✅ Built | `member-filters.tsx` |
| Notes & documents | ✅ Built | `member-notes-actions.ts`, `member-documents-and-notes.tsx` |
| Excel/CSV import | ✅ Built | `member-excel-import-actions.ts`, `member-excel-import-dialog.tsx` |
| Basic export | ✅ Built | `/api/members/export` |

**Missing from Essential — Member Management:** Nothing significant. ✅

---

### Membership Management

| Feature | Status | Notes |
|---|---|---|
| Configurable plans (monthly, quarterly, annual, custom duration) | ✅ Built | `membership-plan-form.tsx`, `membership-plan.service.ts` |
| Start/end dates, auto-calculation | ✅ Built | `lib/membership-dates.ts` |
| Amount, discount, final payable amount | ✅ Built | Subscription schema: price, discount_amount, gst_amount, total_amount |
| Activation, renewal, expiry tracking | ✅ Built | `/admin/renewals`, `subscription_history` table |
| Renewal history | ✅ Built | `updateSubscriptionWithHistory()`, history view |
| Couple plans | ✅ Built | `linked_subscription_id`, couple plan type |

**Missing from Essential — Membership Management:** Nothing significant. ✅

---

### Billing & Payments

| Feature | Status | Notes |
|---|---|---|
| Total / Paid / Pending amounts | ✅ Built | Invoice + payment model |
| Pending / Partially Paid / Paid statuses | ✅ Built | Invoice status enum |
| Cash, UPI, Card, Bank Transfer | ✅ Built | 5 payment methods including Check (migration 0029) |
| Payment history | ✅ Built | Per-member payment list |
| Receipts | ✅ Built | `/admin/invoices/[id]` |
| Basic invoice generation | ✅ Built | `invoice-form.tsx`, `/admin/invoices/new` |
| **Refunds** | ⚠️ Partial | Schema has `refund_amount`, `refunded` status; **no refund action UI found** |

**Gap:** Refund workflow (UI + action) is not implemented.

---

### Attendance & Expiry

| Feature | Status | Notes |
|---|---|---|
| Manual check-in / check-out | ✅ Built | `check-in-member-button.tsx`, reception portal |
| Today's attendance | ✅ Built | Dashboard + attendance page |
| Member attendance history | ✅ Built | Member detail tabs |
| Date/member filters | ✅ Built | `attendance-management-client.tsx` |
| 0–7 day expiry segment | ✅ Built | `expiring-plans-card.tsx` |
| 8–30 day expiry segment | ✅ Built | Same |
| Expired-member filtering | ✅ Built | `?sub_status=expired` filter |

**Missing from Essential — Attendance & Expiry:** Nothing significant. ✅

---

### Dashboard, Staff & Reports

| Feature | Status | Notes |
|---|---|---|
| Daily KPIs | ✅ Built | `services/dashboard.service.ts` — members, attendance, collection, expiry |
| Actionable cards & quick actions | ✅ Built | Dashboard quick actions grid |
| Owner, Admin/Manager, Receptionist, Trainer roles | ✅ Built | Portal layouts, `lib/auth.ts` |
| Trainer profiles & assignment | ✅ Built | `/admin/trainers/`, `assign-trainer-dialog.tsx` |
| Member, membership, payment, outstanding, attendance, revenue, expiry reports | ✅ Built | `/admin/reports/` with 9 report types |
| **New Members KPI (separate card)** | ⚠️ Partial | Members count exists; no dedicated "new members this month" KPI card |

**Gap:** Explicit "New Members" KPI is embedded in reports but not surfaced as a dedicated dashboard card.

---

### Responsive Web

✅ Built — Mobile bottom nav, table/card view toggle, responsive across all portals. PWA manifest present.

---

## ESSENTIAL PLAN — GAP SUMMARY

| Gap | Severity |
|---|---|
| No refund workflow UI | Medium |
| No dedicated "New Members" dashboard KPI | Low |

**Essential Plan Readiness: 95% — minor gaps only**

---

---

## GROWTH — ₹15,999/year

### CRM & Sales

| Feature | Status | Notes |
|---|---|---|
| Lead creation, assignment & pipeline | ✅ Built | `services/lead.service.ts`, `/admin/leads/`, 7-stage pipeline |
| Follow-up date/time & overdue detection | ✅ Built | `follow_up_at` field, overdue count in UI |
| Trial scheduling / conversion | ⚠️ Partial | `trial_at` field exists in DB; **no dedicated trial scheduling UI flow** — just a date field |
| Lost reasons | ✅ Built | Validated lost reason on stage change |
| Salesperson ownership | ⚠️ Partial | `assigned_to` FK on leads; no assignment UI visible in the lead form |
| Conversion / source reports | ❌ Missing | **No dedicated CRM/sales report page** |
| Lead activity logging | ✅ Built | `lead_activities` table, `recordLeadActivity()` |

**Gaps — CRM:**
- No dedicated trial scheduling UI (just a date input)
- No salesperson assignment UI in lead creation form
- No sales/conversion/source report page

---

### WhatsApp & Communication

| Feature | Status | Notes |
|---|---|---|
| WhatsApp actions from member, lead, payment, expiry screens | ✅ Built | `member-communication-menu.tsx`, deep-links from all relevant screens |
| Renewal, expiry, trial, payment templates | ✅ Built | `lib/config/defaults.ts` has WhatsApp message templates |
| Inactive member messages | ✅ Built | Template exists |
| **WhatsApp Business API delivery** | ❌ Missing | **Provider env vars exist but no real API is connected — messages only open WhatsApp with pre-filled text (deep-links), not sent programmatically** |
| Communication history / delivery status | ❌ Missing | No per-member WhatsApp delivery log |

**Gaps — WhatsApp:**
- No real Business API integration (deep-link only)
- No delivery confirmation or history

---

### Advanced Membership Operations

| Feature | Status | Notes |
|---|---|---|
| Freeze / Hold membership | ❌ Missing | `paused` enum value exists in subscription status but **no freeze action, no hold_until date field, no UI** |
| Extension | ⚠️ Partial | `updateSubscriptionWithHistory` supports `extended` action type; **no dedicated "Extend Membership" UI** |
| Upgrade / membership change | ❌ Missing | **No plan-change workflow** — can only cancel old and create new |
| Modification history | ✅ Built | `subscription_history` table, history view on subscription detail |
| Grace period | ❌ Missing | **No grace period logic or field anywhere** |
| Installments / partial-payment continuation | ❌ Missing | `allow_partial_payments` config toggle exists; **no installment schedule, no step-based payment plan** |
| Role-based discount authorization | ❌ Missing | Discount field exists; **no approval gate or role restriction on who can apply discounts** |

**Gaps — Advanced Membership Operations: SIGNIFICANT**
- Freeze/Hold completely missing
- Upgrade/change missing
- Grace period missing
- Installments missing
- Role-based discount authorization missing

---

### Finance & Accounts

| Feature | Status | Notes |
|---|---|---|
| Income & expenses with categories | ✅ Built | `services/finance.service.ts`, income/expense routes |
| Vendors & payment methods | ✅ Built | Vendor table, expense-vendor FK |
| Attachments on expenses | ✅ Built | `expense_attachments` table |
| Outstanding receivables | ✅ Built | `getOutstandingReceivablesSummary()`, `/admin/finance/outstanding` |
| Cash Book | ✅ Built | `listCashBook()`, `/admin/finance/cash-book` |
| Bank accounts & transactions view | ✅ Built | `listBankTransactions()`, `/admin/finance/bank` |
| GST tracking | ✅ Built | `finance-gst.service.ts`, `/admin/finance/gst` |
| Profit & Loss | ✅ Built | `/admin/finance/reports/profit-loss` |
| Daily / monthly collection analysis | ✅ Built | Finance dashboard with trend charts |
| **Balance Sheet** | ❌ Missing | **Not found in routes or service** |
| **Bank reconciliation** | ❌ Missing | Bank accounts exist; **no reconciliation workflow** |

**Note on Chart of Accounts / Journal / Ledger / Trial Balance:**
These are **built** (`listChartOfAccounts()`, `postJournalEntry()`, `getLedger()`, trial-balance route) but **wrongly gated as Phase 3** (`advanced_accounting`) in `lib/entitlements/registry.ts`. Per the pricing document these are Growth features. This is a **known commercial mismatch** that must be fixed by moving `advanced_accounting` from `phase_3` to `phase_2` in the entitlements registry.

**Gaps — Finance:**
- Balance Sheet missing
- Bank reconciliation missing
- Chart of Accounts/Journal/Ledger/Trial Balance built but wrongly phase-gated as Scale (must fix entitlement registry)

---

### PT & Trainer Management

| Feature | Status | Notes |
|---|---|---|
| PT packages & sessions | ✅ Built | `pt-actions.ts`, `trainer.service.ts`, `/admin/pt/` |
| Dates, trainer/member assignment | ✅ Built | PT package start/end, assignments |
| Session booking & completion | ✅ Built | `complete_pt_session` RPC, session credits |
| Remaining sessions balance | ✅ Built | PT credits table, remaining sessions shown |
| **PT payment / revenue tracking** | ⚠️ Partial | Payment fields on PT records; **no dedicated PT payment screen** |
| **PT revenue report** | ❌ Missing | **No trainer revenue report page** |
| Trainer schedule & attendance | ⚠️ Partial | Appointments exist; **no formal schedule/availability calendar** |
| **Trainer performance report** | ❌ Missing | **No performance metrics or report page** |
| Trainer notes | ✅ Built | Notes field on trainer profiles |

**Gaps — PT & Trainer:**
- No PT revenue report
- No trainer performance report
- No formal PT payment screen

---

### Biometric / Face Attendance

| Feature | Status | Notes |
|---|---|---|
| eSSL / supported biometric integration | ✅ Built | `/iclock/` routes, `biometric.service.ts`, ADMS + JSON protocols |
| Device mapping & authorization | ✅ Built | `biometric-mapping.service.ts`, terminal credentials |
| Automatic sync & real-device validation | ✅ Built | Full pipeline with duplicate prevention |
| Retry / error handling | ✅ Built | Exception resolution, `resolveAttendanceException()` |
| Duplicate prevention | ✅ Built | Exact + window duplicate detection |
| Authorized sync logs | ✅ Built | `attendance_sync_logs` table with full audit trail |

**Missing — Biometric:** Nothing significant at code level. ✅ (Hardware QA pending)

---

### Smart Alerts & Advanced Reports

| Feature | Status | Notes |
|---|---|---|
| Expiry alerts | ✅ Built | DB notification triggers, cron automation |
| Payment due alerts | ✅ Built | Payment notification triggers |
| Follow-up alerts | ⚠️ Partial | Follow-up date exists; **no automated reminder sending for CRM follow-ups** |
| Trial alerts | ⚠️ Partial | Template exists; **no automated trial notification trigger** |
| **Inactivity alerts** | ❌ Missing | **No automated inactivity detection or notification trigger found** |
| **Low PT session alerts** | ❌ Missing | **No PT session threshold alert** |
| Revenue / expense / profit trends | ✅ Built | `getFinanceRevenueTrend()`, `/admin/reports/revenue` |
| Payment-mode distribution | ✅ Built | Finance payment mode chart |
| Plan revenue analysis | ✅ Built | `subscription_report_view` |
| Outstanding ageing | ✅ Built | `getReceivableAging()` — 0–30, 31–60, 61–90, 90+ buckets |
| Category analysis | ✅ Built | Income/expense by category |
| **Trainer revenue report** | ❌ Missing | **No trainer/PT revenue report** |
| **PDF export** | ❌ Missing | **CSV export exists; no PDF generation for invoices or reports** |
| Excel/CSV export for reports | ⚠️ Partial | Member export done; report exports partially wired |

**Gaps — Smart Alerts:**
- Inactivity alerts missing
- Low PT session alerts missing
- CRM follow-up automated reminders missing
- Trial notification automation missing

**Gaps — Advanced Reports:**
- Trainer revenue report missing
- PDF export missing

---

### Growth Permissions

| Feature | Status | Notes |
|---|---|---|
| Owner, Admin/Manager, Receptionist, Trainer, Dietician roles | ✅ Built | Portal layouts, role gates |
| Sales Executive role | ❌ Missing | No distinct Sales Executive role in the schema |
| Accountant/Finance role | ❌ Missing | No distinct Accountant role; finance accessible to all staff |
| Controlled access for sensitive finance actions | ⚠️ Partial | `requireUser(["admin","manager"])` used; no fine-grained finance permissions |
| Auditable sensitive actions | ⚠️ Partial | `logActivity()` exists; not consistently applied to all finance/discount actions |
| Branch-scoped role visibility | ✅ Built | RLS + branch filters throughout |

---

## GROWTH PLAN — GAP SUMMARY

| Gap | Severity | Area |
|---|---|---|
| Advanced Membership: Freeze/Hold completely missing | High | Advanced Membership |
| Advanced Membership: Upgrade/change plan missing | High | Advanced Membership |
| Advanced Membership: Grace period missing | High | Advanced Membership |
| Advanced Membership: Installments/partial payment schedule missing | High | Advanced Membership |
| Advanced Membership: Role-based discount authorization missing | High | Advanced Membership |
| Chart of Accounts/Journal/Ledger/Trial Balance wrongly gated as Scale | High | Accounting (entitlement bug) |
| Balance Sheet missing | Medium | Finance |
| Bank reconciliation missing | Medium | Finance |
| WhatsApp Business API — deep-link only, no real delivery | High | WhatsApp |
| Communication delivery history missing | Medium | WhatsApp |
| CRM: Sales/conversion report page missing | Medium | CRM |
| CRM: Trial scheduling UI missing | Low | CRM |
| PT revenue report missing | Medium | PT |
| Trainer performance report missing | Medium | PT |
| Inactivity alerts missing | Medium | Smart Alerts |
| Low PT session alerts missing | Medium | Smart Alerts |
| PDF export missing | Medium | Reports |
| Sales Executive role not implemented | Low | Permissions |
| Accountant role not implemented | Low | Permissions |

**Growth Plan Readiness: ~65% — significant gaps in Advanced Membership and WhatsApp delivery**

---

---

## SCALE — ₹29,999/year

### Multi-Branch Management

| Feature | Status | Notes |
|---|---|---|
| Multiple branches per account | ✅ Built | `branch.service.ts`, `/admin/branches`, branch creation with plan gate |
| Central / HQ dashboard across branches | ❌ Missing | **No consolidated cross-branch dashboard** — dashboard always scoped to current user's branch |
| Branch-specific staff & data | ✅ Built | RLS + branch filters throughout |
| **Member transfer between branches** | ❌ Missing | **No transfer action anywhere** |
| **Cross-branch access rules** | ❌ Missing | No cross-branch user access model |
| **Consolidated reporting across branches** | ❌ Missing | All reports are per-branch |
| **Branch comparison report** | ❌ Missing | No multi-branch comparison |

**Gaps — Multi-Branch:** Core isolation built; all aggregate/transfer/comparison features missing.

---

### Enterprise Roles & Approvals

| Feature | Status | Notes |
|---|---|---|
| Audit logs (tenant-accessible) | ⚠️ Partial | `/admin/audit-logs` page built in this sprint; reads `activity_logs` table |
| Super Admin, Owner, Branch Manager etc. roles | ⚠️ Partial | Basic roles done; custom role creation not implemented |
| **Action permissions / granular controls** | ❌ Missing | No per-action permission matrix |
| **Financial/salary/discount/refund/deletion approvals** | ❌ Missing | No approval workflow engine |
| **Export controls** | ❌ Missing | No approval for data exports |
| Approval workflows | ❌ Missing | No approval queue, no approver assignment |

---

### Advanced Accounting

| Feature | Status | Notes |
|---|---|---|
| Chart of Accounts | ✅ Built (wrong phase gate) | Gated as Scale; should be Growth per pricing |
| Journal entries | ✅ Built (wrong phase gate) | Same |
| Ledger | ✅ Built (wrong phase gate) | Same |
| Trial Balance | ✅ Built (wrong phase gate) | Same |
| **P&L Statement (formal accounting)** | ⚠️ Partial | Finance P&L exists; formal accounting-grade P&L unclear |
| **Balance Sheet** | ❌ Missing | Not found |
| Receivable ageing | ✅ Built | `getReceivableAging()` |
| **Cash/bank reconciliation** | ❌ Missing | Not found |
| GST reporting | ✅ Built | `/admin/finance/gst` |
| **Branch / consolidated views** | ❌ Missing | No consolidated accounting view |

**Note:** The pricing document places CoA/Journal/Ledger/Trial Balance/P&L in **Growth**, but the codebase gates them as Scale. This is the most impactful entitlement bug in the product.

---

### Advanced Automation Engine

| Feature | Status | Notes |
|---|---|---|
| Trigger → Condition → Action engine | ❌ Missing | `workflow.service.ts` is a subscription helper only |
| Renewal / dues / failed-payment / inactivity templates | ❌ Missing | Some notification triggers exist as DB functions; no general automation UI |
| Multi-step automations | ❌ Missing | |
| Run tracking / pause / enable controls | ❌ Missing | |
| Execution logs | ❌ Missing | |

---

### Retention & Revenue Intelligence

| Feature | Status | Notes |
|---|---|---|
| Churn risk scoring (Healthy/At Risk/High Risk) | ✅ Built | `getRetentionIntelligence()` in `report.service.ts` — risk 0–100 |
| Retention dashboard | ✅ Built | `/admin/retention/page.tsx` |
| **Revenue Action Center** | ❌ Missing | No Revenue Action Center — no renewal opportunities list, no PT renewal queue |
| Reactivation opportunities | ❌ Missing | No expired-member reactivation prioritization |

---

### Advanced CRM & Sales Analytics

| Feature | Status | Notes |
|---|---|---|
| Lead scoring | ❌ Missing | |
| Hot leads identification | ❌ Missing | |
| Sales targets | ❌ Missing | |
| Response time tracking | ❌ Missing | |
| Salesperson conversion analytics | ❌ Missing | Basic conversion rate via `getAdvancedCrmAnalytics()` — pipeline velocity, avg days |
| Funnel analysis | ⚠️ Partial | `getAdvancedCrmAnalytics()` built this sprint — stage breakdown + conversion rates |
| Source ROI | ❌ Missing | |
| Lost-reason analytics | ❌ Missing | Lost reason stored but no report |
| Lead reactivation | ❌ Missing | |

**Note:** `getAdvancedCrmAction()` provides basic funnel analytics (conversion rate, avg days to convert, pipeline velocity by stage). Advanced scoring, targets, and source ROI are missing.

---

### AI Business Intelligence

| Feature | Status | Notes |
|---|---|---|
| Natural-language questions over SyncFyre data | ❌ Missing | No LLM integration, no AI framework |
| Grounded in current system data | ❌ Missing | |
| Respects tenant/branch/role permissions | ❌ Missing (N/A) | |

---

### APIs, Webhooks & Member Self-Service

| Feature | Status | Notes |
|---|---|---|
| **REST API (public, key-based)** | ❌ Missing | Internal API routes exist; no public API key management, no documented external API |
| **Webhooks** (member/membership/payment/attendance/CRM events) | ❌ Missing | `sendViaWebhook()` for notifications is outbound notification only; no general webhook subscription |
| Member portal — profile | ✅ Built | `/member/profile` |
| Member portal — attendance view | ✅ Built | `/member/attendance` |
| Member portal — membership/plan view | ✅ Built | `/member/membership` (read-only) |
| Member portal — workouts, diet, progress, PT details | ✅ Built | `/member/workouts`, `/member/diet-plan`, `/member/progress` |
| Member portal — notifications | ✅ Built | `/member/notifications` |
| Member portal — appointments | ✅ Built | `/member/appointments` |
| **Member portal — self-service renewal** | ❌ Missing | Member sees "contact reception"; **cannot renew from portal** |
| **Member portal — online payments** | ❌ Missing | No payment gateway integration |
| **Member portal — receipts/payment history accessible** | ⚠️ Partial | No receipts in member portal |
| **Member portal — PT session booking** | ❌ Missing | |
| **Member portal — offers/referrals** | ❌ Missing | |
| **Member portal — support** | ❌ Missing | |
| **QR code / class booking** | ❌ Missing | |

---

## SCALE PLAN — GAP SUMMARY

| Gap | Severity | Area |
|---|---|---|
| Cross-branch consolidated dashboard missing | High | Multi-Branch |
| Member transfer between branches missing | High | Multi-Branch |
| Branch comparison / consolidated reports missing | High | Multi-Branch |
| Approval workflow engine completely missing | High | Enterprise RBAC |
| Granular action permissions missing | High | Enterprise RBAC |
| Balance Sheet missing | Medium | Advanced Accounting |
| Bank reconciliation missing | Medium | Advanced Accounting |
| Full Automation Engine completely missing | High | Automation |
| Revenue Action Center missing | High | Retention Intelligence |
| Lead scoring / hot leads / sales targets missing | High | Advanced CRM |
| Source ROI / lost-reason analytics missing | Medium | Advanced CRM |
| AI / natural language completely missing | High | AI |
| Public REST API (key-based) missing | High | APIs |
| Webhook subscription system missing | High | APIs |
| Member self-service renewal/payment missing | High | Member Self-Service |
| Member PT booking missing | Medium | Member Self-Service |

**Scale Plan Readiness: ~35% — only churn scoring + basic CRM analytics + audit logs + branches are built**

---

---

## MASTER GAP SUMMARY

### Critical Fixes Required (Blocking Commercial Sales)

| # | Issue | Impact | Effort |
|---|---|---|---|
| 1 | `advanced_accounting` / `accounting` wrongly gated as Phase 3 — Growth users cannot access CoA/Journal/Ledger they pay for | Blocks all Growth customers from accounting | 30min code change |
| 2 | Freeze/Hold membership not implemented | Missing core Growth feature | Medium |
| 3 | WhatsApp Business API — deep-link only, no real delivery | Growth feature not functional as advertised | High |
| 4 | Installment plans not implemented | Missing Growth feature | Medium |
| 5 | Upgrade/plan change workflow missing | Missing Growth feature | Medium |

### Important Gaps by Plan

**Essential (P1):**
- Refund UI missing

**Growth (P2):**
- Advanced Membership: Freeze/Hold, Upgrade, Grace Period, Installments, Role-based discounts — all missing
- WhatsApp actual delivery (real Business API)
- CRM sales report, trial scheduling UI, salesperson assignment UI
- PT revenue + trainer performance reports  
- Balance Sheet, bank reconciliation
- Inactivity alerts, PT session alerts, PDF exports
- Accounting gating bug (built, wrongly locked to Scale)

**Scale (P3):**
- Multi-branch consolidated dashboard, member transfer, consolidated reports
- Enterprise approval workflows, granular permissions
- Full automation engine
- Revenue Action Center
- AI / natural language
- Public REST API + webhooks
- Member self-service renewal, payment, PT booking

---

## WHAT IS WELL-BUILT ✅

- Core member/membership/payment/attendance/staff lifecycle — solid
- Finance module (income/expenses/GST/P&L/outstanding/cash book/bank views) — solid
- CRM lead pipeline — solid
- Biometric eSSL integration — solid
- PT session tracking — solid
- Dashboard + reports — solid
- Multi-tenant/branch isolation — solid
- Notification triggers (expiry, payment) — solid
- Churn scoring / retention intelligence — built this sprint
- Revenue intelligence + Advanced CRM analytics — built this sprint
- Audit log viewer for tenants — built this sprint
- Multi-branch admin UI — built this sprint
