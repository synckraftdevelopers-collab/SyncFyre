# SyncFyre Phase 1 Remediation Task Board

**Source:** `docs/PHASE_1_EXACT_READINESS_AUDIT.md` and the supplied Phase 1 specification (3.1–3.10 plus the Module Matrix).  
**Mode:** Planning and reconciliation only. No fixes are implemented by this document.

## 1. Executive Summary

The exact audit concludes that SyncFyre Phase 1 is **NOT READY**. The product has broad implementation coverage, but no module qualifies as fully PASS because functional QA, role/action/data authorization QA, tenant/branch isolation QA, financial reconciliation, and responsive/device verification are incomplete. This board converts every PARTIAL, MISSING, BLOCKED, and NOT_VERIFIED finding into an actionable task while preserving existing services, actions, queries, RLS and financial sources of truth.

Talwalkar and Demo Gym are out of scope for mutation. All future tests require synthetic QA tenants/branches or an approved, protected Demo-only fixture; no production-like customer data may be used.

## 2. Current Phase 1 Readiness

| Module | Current status | Primary reason it is not PASS |
|---|---|---|
| 3.1 Dashboard | PARTIAL | KPI/card destinations and live reconciliation unverified. |
| 3.2 Members | PARTIAL | End-to-end field/history, duplicate, storage, scope and export QA incomplete. |
| 3.3 Memberships | PARTIAL | Cadence/custom duration, lifecycle, dates, immutable history and derived status not fully verified. |
| 3.4 Payments/Pending | PARTIAL | Balance/status/mode/receipt/overpayment and source reconciliation incomplete. |
| 3.5 Expiry | PARTIAL | Boundary buckets, non-overlap and navigation unverified. |
| 3.6 Attendance | PARTIAL | Check-out, idempotency, device recovery and report linkage incomplete. |
| 3.7 Staff/Roles | PARTIAL | Complete UI/route/action/API/data role matrix not executed. |
| 3.8 Trainer | PARTIAL | Assignment, branch/tenant validation and assigned-member workflow unverified. |
| 3.9 Reports | PARTIAL | Live totals, filters and UI/export parity not reconciled. |
| 3.10 Import/Export/Responsive | PARTIAL | CSV/error/rollback/scope and desktop/tablet/mobile interaction QA incomplete. |

## 3. Audit Findings Summary

- **Implemented but verification required:** many queries, pages, actions, forms, filters, report services, import paths and responsive components.
- **Partial implementation plus verification:** payment lifecycle/overpayment behavior, expiry semantics, membership calculations/status, attendance idempotency, duplicate handling, document/photo storage and trainer assignment validation.
- **Missing or not evidenced:** proof that every dashboard card is clickable to the correct filtered list, complete tablet/device acceptance, governed live reconciliation, and complete sensitive-role denial coverage.
- **Blocked:** live readiness claims where a safe complete QA fixture or source reconciliation is unavailable. Do not fabricate PASS.
- **Global constraints:** reuse existing implementation; one financial source; tenant/branch predicates and RLS; permission-aware/audited mutations; no silent financial-history overwrite; live report data with identical UI/export filters.

## 4. Exact Gap → Task Mapping

| Source | Gap from audit | Task |
|---|---|---|
| 3.1 | KPI reconciliation, card destinations and alert completeness unverified | P1-FIX-01, P1-FIX-02, P1-FIX-03 |
| 3.2 | Field/profile/history, search/filter, duplicate, storage and scope QA incomplete | P1-FIX-04 through P1-FIX-08 |
| 3.3 | Cadences/custom duration, lifecycle, dates/history/status not fully proven | P1-FIX-09, P1-FIX-10, P1-FIX-11 |
| 3.4 | Balance/status/modes, receipts, overpayment and financial chain not reconciled | P1-FIX-12 through P1-FIX-15 |
| 3.5 | Exact 0/1/7/8/30/31/expired boundaries and navigation unverified | P1-FIX-16 |
| 3.6 | Manual check-out, duplicate/idempotency and reporting/device linkage incomplete | P1-FIX-17, P1-FIX-18 |
| 3.7 | Complete role enforcement at all layers not executed | P1-FIX-19, P1-FIX-20 |
| 3.8 | Assignment and tenant/branch validation workflow unverified | P1-FIX-21 |
| 3.9 | Reports and exports lack source-total/filter parity proof | P1-FIX-22, P1-FIX-23 |
| 3.10 | Import errors/rollback, export scope and device interaction incomplete | P1-FIX-24 through P1-FIX-26 |
| Cross-cutting | Tenant/branch isolation and financial reconciliation gates incomplete | P1-FIX-27, P1-FIX-28 |
| Cross-cutting | Final regression and release gate absent | P1-FIX-29, P1-FIX-30 |

## 5. Task Board

Status labels are planning labels, not claims that work is complete. `Verification-only` means no production code change should be assumed until the test demonstrates a concrete defect.

| ID | Module | Gap classification | Labels | Owner | Dependencies | Acceptance criteria / proof |
|---|---|---|---|---|---|---|
| P1-FIX-01 | 3.1 Dashboard | Verification-only | [FRONTEND] [QA] [REPORTING] [TENANT_ISOLATION] [BRANCH_ISOLATION] | Astha | QA fixture; existing dashboard services | Each KPI (members, active, expired, new, today attendance, collection, pending, expiring) displays correct live scoped value; test fixture rows and expected values are recorded. |
| P1-FIX-02 | 3.1 Dashboard | Verification-only | [FRONTEND] [QA] | Astha | P1-FIX-01 | Every summary card and quick action opens the specified filtered record/action; browser assertions cover Add Member, Collect Payment, Renew, Check In and Search. |
| P1-FIX-03 | 3.1 Dashboard | Partially implemented — small fix + verification | [FRONTEND] [BACKEND] [QA] [SHARED] | SHARED | P1-FIX-01; notification source review | Recent activity and important alerts are complete, scoped and actionable; no duplicate/stale summary source; regression test covers empty/error states. |
| P1-FIX-04 | 3.2 Members | Verification-only | [FRONTEND] [QA] | Astha | QA fixture | Create/edit test proves Member ID, photo, mobile, email, address, DOB, gender, emergency details, joining/current status and notes persist without data loss, including configured optional/hidden fields. |
| P1-FIX-05 | 3.2 Members | Verification-only | [FRONTEND] [QA] [TENANT_ISOLATION] [BRANCH_ISOLATION] | SHARED | P1-FIX-04; QA tenants/branches | Member profile shows membership, payment and attendance histories; cross-tenant and cross-branch reads/edits are denied; branch ownership remains unchanged. |
| P1-FIX-06 | 3.2 Members | Verification-only | [FRONTEND] [QA] | Astha | P1-FIX-04 | Name, phone and member-ID searches plus active, expired, inactive and supported status filters return only expected rows, including no-result/error states. |
| P1-FIX-07 | 3.2 Members | Partially implemented — small fix + verification | [BACKEND] [SECURITY] [PERMISSIONS] [TENANT_ISOLATION] [BRANCH_ISOLATION] | Partner | P1-FIX-05; existing member actions/RLS | Duplicate policy is explicit and enforced for create/edit/import under concurrency; tenant/branch predicates and RLS deny out-of-scope mutation; audit is retained. |
| P1-FIX-08 | 3.2 Members | Partially implemented — small fix + verification | [FRONTEND] [BACKEND] [IMPORT_EXPORT] [PERMISSIONS] [QA] | SHARED | P1-FIX-07 | Export is allowed only to permitted roles/scope; photo and basic-document storage validates type/scope and does not leak another tenant; denial tests pass. |
| P1-FIX-09 | 3.3 Memberships | Verification-only | [FRONTEND] [BACKEND] [FINANCE] [QA] | SHARED | Existing `plan.service.ts`, `lib/membership-plan-calculations.ts`; QA fixture | Monthly, quarterly, half-yearly, annual and custom durations produce expected start/end dates, amount, discount and final payable with documented rounding/timezone rules. |
| P1-FIX-10 | 3.3 Memberships | Partially implemented — small fix + verification | [BACKEND] [FINANCE] [SECURITY] [PERMISSIONS] [QA] | Partner | P1-FIX-09 | Activation and renewal preserve posted history, prevent unintended overlap, create/associate required invoice/payment records, enforce role/tenant/branch authorization and are auditable. |
| P1-FIX-11 | 3.3 Memberships | Partially implemented — small fix + verification | [BACKEND] [QA] [REPORTING] | Partner | P1-FIX-09, P1-FIX-10 | Expiry/status is derived consistently from end dates/business rules; old plans remain immutable in history; expired list and member status agree across UI, services and reports. |
| P1-FIX-12 | 3.4 Payments | Partially implemented — small fix + verification | [BACKEND] [FINANCE] [QA] [REPORTING] | Partner | P1-FIX-10; existing invoice/payment/balance services | One financial source calculates `pending = total - paid`; Pending/Partially Paid/Paid transitions and zero/rounding cases reconcile across invoice, payment, pending UI and reports. |
| P1-FIX-13 | 3.4 Payments | Verification-only | [FRONTEND] [BACKEND] [FINANCE] [QA] | SHARED | P1-FIX-12 | Cash, UPI, Card and Bank Transfer records are accepted/validated; individual transactions remain preserved and are visible in history. |
| P1-FIX-14 | 3.4 Payments | Partially implemented — small fix + verification | [BACKEND] [FINANCE] [SECURITY] [PERMISSIONS] [QA] | Partner | P1-FIX-12 | Overpayment is rejected unless an explicit approved adjustment/credit workflow exists; no posted transaction is silently overwritten; concurrent collection is safe and audited. |
| P1-FIX-15 | 3.4 Payments | Partially implemented — small fix + verification | [FRONTEND] [FINANCE] [REPORTING] [QA] | Astha | P1-FIX-12, P1-FIX-14 | Receipt/basic invoice renders Member, ID, plan, totals, paid, pending, status, expiry and branch consistently; print/download/error states pass and match source rows. |
| P1-FIX-16 | 3.5 Expiry | Verification-only | [FRONTEND] [BACKEND] [QA] [REPORTING] | SHARED | P1-FIX-11; fixed-date QA fixture | Exact boundary tests for 0, 1, 7, 8, 30, 31 and expired produce non-overlapping 0–7 and 8–30 buckets; expiry cards navigate to correctly filtered lists and reports. |
| P1-FIX-17 | 3.6 Attendance | Partially implemented — small fix + verification | [FRONTEND] [BACKEND] [QA] [TENANT_ISOLATION] [BRANCH_ISOLATION] | SHARED | QA fixture; existing attendance services/actions | Manual check-in and check-out work; duplicate/retry submissions are idempotent; member history, today view and date/member search are correctly scoped and linked. |
| P1-FIX-18 | 3.6 Attendance | Verification-only | [BACKEND] [REPORTING] [QA] | Partner | P1-FIX-17 | Attendance totals reconcile with reports/dashboard; device/sync paths are tested only with a controlled fixture, and no biometric/device success is claimed without confirmation. |
| P1-FIX-19 | 3.7 Roles | Verification-only | [FRONTEND] [PERMISSIONS] [QA] | Astha | Role matrix definition; QA tenants | Owner, Admin/Manager, Receptionist and Trainer see only intended UI/routes; direct URL tests cover allowed and denied portal pages. |
| P1-FIX-20 | 3.7 Roles | Verification-only | [BACKEND] [SECURITY] [PERMISSIONS] [RLS] [TENANT_ISOLATION] [BRANCH_ISOLATION] | Partner | P1-FIX-19; existing `requireUser`, actions, APIs and policies | Direct server-action/API/service calls enforce the same role, tenant and branch rules; finance/destructive operations and trainer restrictions are denied for unauthorized roles; RLS tests pass. |
| P1-FIX-21 | 3.8 Trainer | Partially implemented — small fix + verification | [BACKEND] [FRONTEND] [SECURITY] [TENANT_ISOLATION] [BRANCH_ISOLATION] [QA] | SHARED | P1-FIX-20; `trainer.service.ts`, `member-extended.service.ts` | Trainer profile/list and assigned-member view work; assignment validates active eligible trainer, same tenant and same branch, rejects cross-scope IDs and preserves audit. |
| P1-FIX-22 | 3.9 Reports | Verification-only | [BACKEND] [REPORTING] [QA] | Partner | P1-FIX-12, P1-FIX-16, P1-FIX-18; QA fixture | Member, membership, payment, pending, attendance, revenue and expiry reports return live rows and totals matching source queries for date/plan/status filters. |
| P1-FIX-23 | 3.9 Reports | Partially implemented — small fix + verification | [FRONTEND] [BACKEND] [REPORTING] [IMPORT_EXPORT] [QA] | SHARED | P1-FIX-22 | UI and export use identical validated filters, tenant/branch scope, columns and totals; no manually maintained/hardcoded summary data; large/empty/error exports behave predictably. |
| P1-FIX-24 | 3.10 Import | Partially implemented — small fix + verification | [FRONTEND] [BACKEND] [IMPORT_EXPORT] [QA] | SHARED | P1-FIX-07; existing import actions/validators | Excel and CSV imports validate columns and rows, show readable row-level errors, reject duplicates per policy, and record batch outcomes without partial silent corruption. |
| P1-FIX-25 | 3.10 Import/Export | Verification-only | [BACKEND] [SECURITY] [IMPORT_EXPORT] [PERMISSIONS] [TENANT_ISOLATION] [BRANCH_ISOLATION] [QA] | Partner | P1-FIX-24 | Import rollback/partial-failure behavior and export permission/scope are tested with synthetic tenants/branches; no out-of-scope row can be imported/exported. |
| P1-FIX-26 | 3.10 Responsive | Verification-only | [FRONTEND] [RESPONSIVE] [QA] | Astha | P1-FIX-02, P1-FIX-15, P1-FIX-24 | Desktop, tablet and mobile browser tests prove critical actions, tables/forms, pending-payment card behavior, error states and navigation remain usable. |
| P1-FIX-27 | Cross-cutting isolation | Verification-only | [SECURITY] [RLS] [TENANT_ISOLATION] [BRANCH_ISOLATION] [QA] | Partner | QA tenants/branches; no customer data | Matrix proves tenant A cannot read/write tenant B and branch-scoped roles cannot cross branches through UI, route, action, API, service or RLS. |
| P1-FIX-28 | Cross-cutting reconciliation | Verification-only | [FINANCE] [REPORTING] [QA] | SHARED | P1-FIX-12, P1-FIX-22; safe fixture | Member/membership → invoice → payment → pending → receipt → report chain reconciles for full, partial, zero and edge cases; posted history is append-only. |
| P1-FIX-29 | Cross-cutting regression | Verification-only | [QA] [SHARED] | SHARED | P1-FIX-01–28 | Existing test suite plus focused Phase 1 suite passes; auth, entitlement, notifications, imports and dashboard regressions are recorded. |
| P1-FIX-30 | Release gate | Blocked until prerequisites pass | [QA] [SHARED] | SHARED | P1-FIX-29; all module gates | Sign-off checklist is completed only when every specification bullet is PASS and role/permission, tenant/branch, financial and responsive gates are evidenced. |

## 6. Developer A — Astha Tasks

Astha owns presentation and browser-facing work without changing shared backend contracts without coordination:

- P1-FIX-01, P1-FIX-02: dashboard KPI/card/action browser verification and minimal UI fixes.
- P1-FIX-04, P1-FIX-06: member form, search/filter and profile/history browser verification.
- P1-FIX-15: receipt/invoice presentation and error/print states.
- P1-FIX-19: role visibility and direct-route browser matrix.
- P1-FIX-26: desktop/tablet/mobile interaction QA.
- Support P1-FIX-03, P1-FIX-08, P1-FIX-09, P1-FIX-13, P1-FIX-21, P1-FIX-23, P1-FIX-24 and P1-FIX-28 where UI evidence is needed.

Likely areas: `app/(admin)/**`, `app/(reception)/**`, `components/dashboard*`, `components/members/**`, `components/payments/**`, `components/memberships/**`, `components/reports/**`, `components/attendance/**`, `components/superadmin/**` only if existing Phase 1 UI is involved, and browser/e2e test directories. Do not edit shared services concurrently with Partner; agree interfaces first.

## 7. Developer B — Partner Tasks

Partner owns backend correctness, authorization, RLS and reconciliation:

- P1-FIX-07, P1-FIX-10, P1-FIX-11, P1-FIX-12, P1-FIX-14: member/membership/payment integrity and audit.
- P1-FIX-18, P1-FIX-20, P1-FIX-22, P1-FIX-25, P1-FIX-27: backend/report/security/scope verification.
- Support P1-FIX-03, P1-FIX-08, P1-FIX-09, P1-FIX-13, P1-FIX-17, P1-FIX-21, P1-FIX-23, P1-FIX-24 and P1-FIX-28.

Likely areas: `services/**`, `app/actions/**`, `app/api/**`, `lib/auth.ts`, `lib/supabase/**`, `supabase/migrations/**` only if a separately approved fix is later required, and backend/integration tests. No migration or schema change is implied by this planning board.

## 8. Shared Tasks

Shared ownership is required for cross-layer contracts and acceptance: P1-FIX-03, P1-FIX-05, P1-FIX-08, P1-FIX-09, P1-FIX-13, P1-FIX-17, P1-FIX-21, P1-FIX-23, P1-FIX-24, P1-FIX-28, P1-FIX-29 and P1-FIX-30. One developer must be designated as the change owner before editing; the other supplies tests/review. Shared tasks must not have both developers editing the same file concurrently.

## 9. Verification-Only Tasks

The following are explicitly QA/reconciliation first and do not imply implementation: P1-FIX-01, P1-FIX-02, P1-FIX-04, P1-FIX-05, P1-FIX-06, P1-FIX-09, P1-FIX-13, P1-FIX-16, P1-FIX-18, P1-FIX-19, P1-FIX-22, P1-FIX-25, P1-FIX-26, P1-FIX-27, P1-FIX-28 and P1-FIX-29. If a test fails, create a narrowly scoped fix against the existing implementation; do not rebuild a module.

## 10. Backend / Security / RLS Tasks

Partner’s backend gate must use existing auth, tenant context, `requireUser`, actions/APIs/services and Supabase RLS. Required evidence:

- Direct route, API, server-action and service/mutation calls are tested, not just sidebar visibility.
- Effective authorization requires role permission **and** tenant/branch scope; existing SaaS entitlement checks remain additive and are not replaced.
- RLS denies cross-tenant and unauthorized branch access even if a request parameter is manipulated.
- Sensitive membership/financial mutations are audited and cannot overwrite posted history.
- Storage paths for photos/documents/import artifacts are tenant/branch scoped.
- No Talwalkar or Demo Gym mutation is used as a test fixture.

## 11. Frontend Tasks

Use existing pages/components and feature-gate/route behavior. Do not duplicate dashboards, member tables, report pages or import dialogs. Locked SaaS features remain governed by the existing entitlement foundation; this board only verifies Phase 1 UX and does not add entitlement architecture.

## 12. Finance / Reconciliation Tasks

The single source chain is: membership sale/subscription → invoice → individual payment transaction(s) → calculated pending balance/status → receipt → reports/dashboard. P1-FIX-12, P1-FIX-14, P1-FIX-15 and P1-FIX-28 must prove arithmetic, rounding, statuses, overpayment policy, append-only history, audit and UI/report parity. No second calculation system may be introduced.

## 13. Reports Tasks

P1-FIX-22 and P1-FIX-23 cover all required reports and filters: members, memberships, payments, pending/outstanding, attendance, revenue and expired/upcoming. Every UI filter must map to the same query/filter contract used by export. Totals must be recomputed from live source rows in a controlled fixture, including branch and date boundaries.

## 14. Import / Export Tasks

P1-FIX-24 and P1-FIX-25 cover Excel/CSV parsing, required/unknown columns, row-level readable errors, duplicates, partial failures/rollback, batch audit, role-aware export and tenant/branch scope. Existing import actions and export route are to be reused; no new import subsystem is planned.

## 15. Responsive / Mobile Tasks

P1-FIX-26 must exercise—not merely inspect CSS—desktop, tablet and mobile widths. Test dashboard quick actions, member forms/search, payment/pending cards, membership renewal, attendance check-in, report filters, import errors and navigation. Record browser/device and any accessibility/usability failure.

## 16. Role / Permission QA

Create a repeatable matrix for Owner, Admin/Manager, Receptionist and Trainer at UI, direct route, server action, API and data/RLS layers. Explicitly test finance and destructive operations, trainer assigned-member limits, branch restrictions, export permissions and manipulated IDs/branch parameters. A sidebar-hidden feature is not a denial proof.

## 17. Tenant / Branch Isolation QA

Use at least two synthetic tenants and two branches per tenant. Verify reads, writes, exports, histories, reports, trainer assignment, attendance, imports and payments cannot cross tenant or branch scope. Never use Talwalkar or mutate the protected Demo tenant for this fixture.

## 18. Dependency Graph

```text
Safe synthetic QA fixture + test harness
                 ↓
Existing auth / tenant context / RLS review (P1-FIX-20, P1-FIX-27)
                 ↓
Membership and payment source/reconciliation (P1-FIX-09–15, P1-FIX-28)
                 ↓
Dashboard, expiry, attendance and trainer verification (P1-FIX-01–03, 16–18, 21)
                 ↓
Reports and import/export parity (P1-FIX-22–25)
                 ↓
Frontend role/navigation/responsive verification (P1-FIX-02, 04, 06, 15, 19, 26)
                 ↓
Regression and final Phase 1 gate (P1-FIX-29, P1-FIX-30)
```

The fixture, auth/scope rules and financial source contract must precede meaningful reconciliation. Dashboard/report/browser tasks can proceed in parallel once their source contracts and test data are stable.

## 19. Parallel Execution Matrix

| Task group | Astha | Partner | Can run in parallel? | Dependency / conflict prevention |
|---|---|---|---|---|
| P1-FIX-01/02 dashboard UI and navigation | Primary | Review | Yes | Use existing service contract; Astha owns dashboard files. |
| P1-FIX-07/10–14 backend integrity | Review UI | Primary | Yes with dashboard UI | Partner owns service/action/API files; publish response contracts before UI edits. |
| P1-FIX-04/06 member UX | Primary | Scope review | Yes | Astha owns member components/pages; Partner owns scope/duplicate checks. |
| P1-FIX-16 expiry tests | Shared | Shared | Yes after membership date contract | One test owner; no concurrent service edits. |
| P1-FIX-17/18 attendance | UI test | Backend test | Yes | Partition components/pages vs services/actions/APIs. |
| P1-FIX-19/20 role matrix | Browser | API/RLS | Yes | Separate e2e/browser and backend/RLS test directories. |
| P1-FIX-22/23 reports | UI/export display | Query/source parity | Yes | Shared filter contract; no two edits to same report service. |
| P1-FIX-24/25 import/export | Import UX | parser/scope/rollback | Yes | Separate dialog/components from actions/API/security tests. |
| P1-FIX-26 responsive | Primary | Review regressions | Yes after stable routes | Astha owns browser/device scripts and responsive components. |
| P1-FIX-27/28 isolation/reconciliation | Fixture review | Primary | Partly | Backend test harness and data snapshots owned by Partner; Astha consumes expected outputs. |
| P1-FIX-29/30 release gate | Shared | Shared | No, final gate | Requires all prior tasks and one sign-off checklist. |

## 20. File Ownership / Conflict Prevention

| Area | Existing files likely involved | Primary owner | Conflict rule |
|---|---|---|---|
| Dashboard | `services/dashboard.service.ts`; admin/reception dashboard pages; `components/dashboard*` | Astha for UI, Partner for query correctness | Do not edit service and page contract simultaneously without review. |
| Members | `services/member.service.ts`, `services/member-extended.service.ts`; member actions; `components/members/**` | Partner services/actions; Astha components | Separate backend scope changes from form/table changes. |
| Memberships | `services/plan.service.ts`, `subscription.service.ts`, `workflow.service.ts`; membership actions/components | Partner backend; Astha UI | `lib/membership-plan-calculations.ts` is shared; one owner per change. |
| Payments | `services/payment.service.ts`, `finance.service.ts`, `lib/finance/payment-balance.ts`; payment/invoice components | Partner financial logic; Astha presentation | No duplicate balance calculation; contract review required. |
| Attendance | `services/attendance.service.ts`; attendance actions/APIs; `components/attendance/**` | Partner backend; Astha UI | Partition by directory. |
| Roles/RLS | `lib/auth.ts`, `middleware.ts`, `app/actions/**`, `app/api/**`, Supabase policies | Partner backend; Astha browser tests | No broad middleware rewrite; add tests around existing checks. |
| Trainer | `services/trainer.service.ts`, `trainer-portal.service.ts`, member assignment actions; trainer components/pages | Partner validation; Astha views | One developer edits each layer. |
| Reports | `services/report.service.ts`, `reports-analytics.service.ts`, report API/pages/components | Partner query contract; Astha display/export UI | Shared filter schema must be reviewed before edits. |
| Import/export | member import actions/validators/dialogs; `app/api/members/export/route.ts` | Partner parser/scope; Astha dialog/errors | No duplicate importer/export route. |
| Tests/docs | `tests/**`, `docs/**` | Task-specific owner; shared release report | Tests may be parallel by directory; this board is the only file created for planning. |

No task authorizes schema or migration edits. If a real defect later requires one, it must be separately approved, use a new migration only, preserve RLS/data, and be reviewed by both developers.

## 21. Execution Waves

### Wave 0 — Fixture, contracts and safeguards

Prepare synthetic tenants/branches and read-only snapshots; define role matrix, date/timezone rules, financial source contract and test data. Execute P1-FIX-20 (design/test harness), P1-FIX-27 and the prerequisite portions of P1-FIX-28. Do not touch Demo or Talwalkar.

### Wave 1 — Core membership/payment correctness

Execute P1-FIX-09 through P1-FIX-15 and complete the backend portions of P1-FIX-10/11/14. This wave establishes trustworthy dates, history, balances, statuses, receipts and audit behavior.

### Wave 2 — Operational workflows

Execute P1-FIX-01–03, P1-FIX-04–08, P1-FIX-16–18 and P1-FIX-21 against the stable source contracts. Run functional and scope tests for dashboard, members, expiry, attendance and trainer workflows.

### Wave 3 — Reports and import/export

Execute P1-FIX-22–25. Prove live totals, identical UI/export filters, import validation/errors/rollback and permission-aware scope.

### Wave 4 — Role and responsive acceptance

Complete P1-FIX-19, P1-FIX-26 and any remaining cross-layer role/RLS evidence. Exercise desktop/tablet/mobile critical actions.

### Wave 5 — Regression and release gate

Execute P1-FIX-29, then P1-FIX-30 only after every requirement is PASS. Record evidence, fixtures, browser/device versions, query snapshots and sign-offs.

## 22. Definition of Done

A task is DONE only when its specified behavior works against a safe fixture and the evidence includes, as applicable:

- functional UI and error-state behavior;
- direct route, server-action and API authorization;
- correct tenant and branch scope with RLS proof;
- role/permission proof for Owner, Admin/Manager, Receptionist and Trainer;
- financial arithmetic and source reconciliation;
- immutable posted history and audit trail for sensitive changes;
- responsive desktop/tablet/mobile interaction;
- live report data and UI/export filter parity;
- automated regression coverage and reproducible test output.

A page, route, component, table, service or passing typecheck alone does not satisfy DoD.

## 23. Phase 1 Final Acceptance Gate

- [ ] 3.1 Dashboard PASS
- [ ] 3.2 Members PASS
- [ ] 3.3 Memberships PASS
- [ ] 3.4 Payments/Pending PASS
- [ ] 3.5 Expiry PASS
- [ ] 3.6 Attendance PASS
- [ ] 3.7 Staff/Roles PASS
- [ ] 3.8 Trainer PASS
- [ ] 3.9 Reports PASS
- [ ] 3.10 Import/Export/Responsive PASS
- [ ] Functional QA PASS
- [ ] Role/permission QA PASS
- [ ] Tenant isolation PASS
- [ ] Branch isolation PASS
- [ ] Financial reconciliation PASS
- [ ] Regression PASS
- [ ] Mobile/tablet/desktop QA PASS
- [ ] No silent overwrite of posted financial history
- [ ] No unconfirmed external provider/device success claimed
- [ ] Entitlement remains one generic Plan → Phase → Feature system

Only after every box is evidenced may the product be declared **PHASE 1 = READY FOR SAAS PLAN 1**.

## 24. Recommended Next Step

Start **Wave 0** with a safe synthetic QA fixture, role/scope matrix and financial/date contracts. Do not begin broad UI polishing or Phase 2 work until Wave 0 establishes reproducible tenant/branch, authorization and reconciliation evidence. Do not mutate Demo Gym or Talwalkar.

## Counts for Handoff

- Total tasks: **30**
- Astha-primary tasks: **7**
- Partner-primary tasks: **9**
- Shared-primary tasks: **14**
- Verification-only tasks: **16**
- Blocked tasks: **1** (P1-FIX-30, dependent release gate)
- Missing implementations: **0 whole modules evidenced missing**; exact acceptance behaviors remain unverified/partial and are represented in the board.
- Partial-fix tasks: **12**
