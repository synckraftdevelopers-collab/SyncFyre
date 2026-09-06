# SyncFyre Demo + Phase 2 Task Split

> Planning-only document based on read-only repository inspection (2026-09-07). It authorizes no code, database, configuration, Demo Gym, or Talwalkar change.

## 1. Executive Summary

SyncFyre is a Next.js + Supabase multi-tenant gym SaaS with tenant-, branch-, and role-aware paths. The repository already contains substantial Phase 2 implementation. The main delivery risk is completing and proving the membership/payment transaction boundary, then provisioning a protected, synthetic Demo Gym.

Recommended split: **Astha** owns UI, presentation, browser acceptance, mobile/PWA and Demo E2E. **Partner** owns subscription/payment lifecycle, future database contracts, Demo safety/fixtures, RLS and security testing. This gives the shared transaction boundary one owner. Never create tenant-name conditions or customer forks; use generic feature/settings/form-configuration infrastructure.

## 2. Current Verified State

- Baseline migrations are 0001–0039 and locked. No historical migration may be edited.
- Existing tests cover membership dates, GST, and payment balances.
- Member Phase 1/2 is implemented: wizard, configurable fields, edit/actions and trainer assignment. It is locked unless a regression is proved.
- Reuse: `lib/auth.ts`, `lib/portals.ts`, `middleware.ts`; member services/actions; plan actions/components; `services/workflow.service.ts`; payment/finance services; notification services/migrations 0023/0024/0028; dashboard/config/biometric services.
- The worktree already contained changes in member import, onboarding, middleware and migrations. Commit or park them with their author before new work; never overwrite or revert blindly.

## 3. Demo Gym Status

Demo Gym is tenant `052375ac`; it has one active Main Branch and an Owner account, but no operational demo data. It is not demo-safe: `tenant_type=customer`, `is_demo=false`, `is_protected=false`, purpose unset, status `trial`. Missing: role accounts, lifecycle members, plans/subscriptions, invoices/payments, attendance, trainers/staff, notifications, documents/diet/workouts/progress, customisation, and mock device/mappings.

`supabase/demo-seed.sql` is not an approved Demo solution: it predates tenant-scoped setup, contains fixed IDs and identifies real gym source data. Talwalkar is entirely out of scope and must never be queried, seeded, reset, configured, or used as a fixture source.

## 4. Remaining Demo Tasks

| ID | Objective / owner | Files/modules | Dependencies | Testing | Risk |
|---|---|---|---|---|---|
| D-01 | Protected-demo guard/SuperAdmin authorization — Partner | SuperAdmin/config/auth only if needed; new migration only if approved | Worktree + security review | Wrong tenant/user denied | High |
| D-02 | Deterministic, idempotent, audited synthetic fixture runner — Partner | New `scripts/demo/**` or `supabase/demo/**` | D-01, approved scenarios | Full-ID assertion, allow-list, dry-run, rerun, refusal | Critical |
| D-03 | Generic Demo role provisioning — Partner | Existing SuperAdmin user/tenant actions and D-02 | D-01/D-02 | Owner/Admin/Reception/Trainer/Staff/Member scope | Medium |
| D-04 | Synthetic scenario catalogue — Astha | Planning/fixture spec only | D-02 design | Every E2E step maps to non-client data | Low |
| D-05 | Configuration + mock biometric scenario — Partner | Config/biometric services/routes and D-02 | D-01–D-03 | No real device; idempotent mapping/attendance | High |
| D-06 | Demo E2E journey — Astha | New `e2e/demo/**` | D-02–D-05, P2 transaction gate | Owner→Reception sale→Trainer→Member→Finance→mock attendance; mobile/PWA | Medium |

All fixture data must be synthetic and Demo-only: lifecycle members; plans; paid/partial/pending/overdue invoices; attendance; assignments; business notifications; documents/diet/workouts/progress; templates/custom fields; mock mapping.

## 5. Phase 2 Status

PASS = implemented evidence only; regression/manual/integration validation is still required.

| ID | Status / remaining work | Owner | Files/modules | Dependencies / tests | Risk |
|---|---|---|---|---|---|
| P2-01 | PASS: deactivate/soft delete exists; prove roles/branch/inactive/no hard delete | Astha | member dialog/pages/actions/services | member, tenant, branch tests | M |
| P2-02 | PARTIAL: photo UI/action exists; verify storage policy, MIME/size, object isolation/orphans | Astha | photo component, member action, storage policy | storage/RLS tests | M |
| P2-03 | PASS: URL pagination/count/range exists; test filters and reception scope | Astha | admin members page/table/filter | pagination/branch tests | L |
| P2-04 | PASS: plan CRUD/list/toggle exists; test role/tenant/branch | Astha | memberships routes/components/actions | P2-05 CRUD auth | M |
| P2-05 | PARTIAL: history-aware reception creation exists; prove duplicate/price/atomic sale rules | Partner | reception action, workflow service, DB functions | P2-04/P2-12 rollback tests | H |
| P2-06 | PARTIAL: subscriptions page exists; verify list/filter/pagination/reception parity | Astha | admin/reception subscription pages | frozen P2-05 read contract | M |
| P2-07 | PASS: renewal action/RPC exists; prove dates/price/history/notifications | Partner | renewal dialog/actions/services/workflow | P2-05 history tests | H |
| P2-08 | PASS: pause action/RPC exists; test role/status/history | Partner | subscription action/workflow | P2-05 | M |
| P2-09 | PASS: cancel action/RPC exists; test authorization/history | Partner | subscription action/workflow | P2-05 | M |
| P2-10 | PARTIAL: expiry/reminder migrations exist; prove scheduled status/timezone/idempotency | Partner | expiry lib, notifications, cron | P2-05 clock tests | H |
| P2-11 | PARTIAL: history is written; complete history UI/filter evidence missing | Astha | detail/subscription/renewal pages | P2-05/P2-07–10 | M |
| P2-12 | PARTIAL/critical: no single proven member→plan→GST/discount→subscription→invoice→payment→receipt boundary | Partner | workflow/payment/finance/reception actions; approved RPC/migration only | P2-04/05/15 atomic rollback/auth/GST | Critical |
| P2-13 | PASS: payment list/detail/pagination exist; verify filters, invoice, role/branch isolation | Astha | payments/invoice pages; payment read contract | P2-12 UI/auth tests | M |
| P2-14 | PASS: outstanding UI/helpers exist; verify reconciliation/branch scope | Astha | outstanding/pending client; finance read model | P2-12/P2-15 | M |
| P2-15 | PARTIAL: balance model/tests exist; prove atomic partial payment/invoice/receivable/GST/ledger/notification | Partner | payment/finance/workflow; approved RPC/migration only | P2-12 balance/concurrency | Critical |
| P2-16 | PARTIAL: refund statuses/amount appear; no dedicated action/auth/audit contract evidenced | Partner | payment/finance; approved RPC/migration likely | P2-12/15 refund limits/audit/GST | H |
| P2-17 | PARTIAL: invoice detail/print exists; prove receipt identity/data/print contract | Astha | admin/reception invoice, print button | P2-12/15 mobile/tenant print test | M |
| P2-18 | PARTIAL: fixed recent-window charts exist; add live date filters | Astha | dashboard pages/charts/service | P2-12 date/tenant/branch tests | M |
| P2-19 | PASS: sign-out/account actions exist; verify portal redirects/mobile/password-email safeguards | Astha | portal header, account/auth actions | role tests | H |

Potential future DB work is limited to P2-12/P2-15/P2-16 and D-01/D-02/D-05 after approval. Partner owns every approved forward-only migration.

## 6. Testing / QA Tasks

| ID | Task | Owner | Evidence |
|---|---|---|---|
| QA-01 | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` | Astha | Wave 0/every merge output or CI link |
| QA-02 | Unit: lifecycle, money/GST/date, refund limits | Partner | Tests with core work |
| QA-03 | Integration: rollback, partial pay, lifecycle/expiry, notifications | Partner | Synthetic tenant only |
| QA-04 | Role, tenant, branch, authenticated RLS allow/deny | Partner | Matrix; service-role does not prove RLS |
| QA-05 | UI acceptance: members→account controls | Astha | Browser checklist/screenshots |
| QA-06 | Demo E2E | Astha | After D-02–D-05 |
| QA-07 | Mobile/PWA/offline/performance | Astha | Release candidate evidence |
| QA-08 | Talwalkar safety verification | Joint; Partner reports | Allow-list/target/audit review, no Talwalkar access |

## 7. Security Tasks

- Tenant isolation: direct out-of-tenant IDs must fail on safe synthetic tenants.
- Branch isolation: Reception/trainer/member cannot read or mutate other-branch records.
- RLS: inspect effective policies and run authenticated allow/deny checks.
- Role authorization: route guards and server/API actions independently deny forbidden roles.
- Storage: tenant/member-scoped keys, private policy, MIME/size validation, no cross-tenant object access.
- Payments: server totals; no negative, overpaid, refund-overpaid, or concurrent mutation; retain audit records.
- Demo/Talwalkar: fixture commands assert the full Demo ID and allow-list, log actor/target/version/result, and reject all production tenants.

## 8. Developer A — Astha Task Board

1. Wave 0: QA-01 and worktree ownership reconciliation.
2. Wave 1: P2-01/02/03 regression, then P2-04.
3. Wave 2: P2-06 and P2-11 against Partner’s frozen read contract.
4. Wave 3: P2-13/14/17 after P2-12/P2-15 handoff.
5. Wave 4: P2-18/19.
6. Wave 5: D-04/D-06 and QA-05/06/07.

## 9. Developer B — Partner Task Board

1. Wave 0: claim DB/transaction files, QA-02 conventions, reconcile worktree ownership.
2. Wave 1: P2-05, P2-07–10.
3. Wave 2: P2-12; sole owner of `workflow.service.ts`, transaction logic, approved migration/RPC.
4. Wave 3: P2-15/16 and versioned payment/receipt read-contract handoff.
5. Wave 4: D-01/02/03/05.
6. Wave 5: QA-03/04/08 and core-only defect fixes.

## 10. Parallel Work Matrix

| Task | Astha | Partner | Can Parallel? | Dependency |
|---|---|---|---|---|
| Wave 0 | QA/worktree | contract ownership | No | Existing worktree resolved |
| P2-01–04 / P2-05,07–10 | Member/plan | lifecycle proof | Yes | No edits to Partner workflow/actions |
| P2-06/P2-11 | UI/read model | publish contract | Limited | P2-05 shape frozen |
| P2-12/P2-15/P2-16 | review/stubs only | transaction core | No final integration | lifecycle gate |
| P2-13/14/17 | finance UI | contract support | Yes after handoff | P2-12/P2-15 frozen |
| P2-18/19 / Demo safety | dashboard/account | guard/fixture/device | Yes | transaction correctness |
| D-04/D-06 | scenarios/E2E | fixture support | Sequential execution | D-02–D-05 |

## 11. File Ownership Matrix

| File/Directory | Owner | Other developer allowed? | Reason |
|---|---|---|---|
| `services/workflow.service.ts` | Partner | No; handoff only | Transaction/history boundary |
| `services/payment.service.ts`, `services/finance.service.ts` | Partner | Read-only unless handoff | Financial reconciliation |
| Reception membership/subscription actions | Partner | No | Lifecycle authorization |
| New migrations and Demo scripts | Partner | Astha review only | Database/fixture safety |
| Member routes/components | Astha | Only approved regression handoff | Member Phase locked |
| Membership/subscription UI | Astha | Contract review only | Presentation consumer |
| Payment/outstanding/invoice receipt UI | Astha | No | Keeps service conflict-free |
| Dashboard service/components | Astha | No | Date filters |
| Portal header/account UI | Astha | One-at-a-time handoff | Shared cross-portal UI |
| `middleware.ts`, `lib/auth.ts`, `lib/portals.ts`, `lib/nav/**` | Astha steward | Pre-agreed small change only | Shared authorization/navigation |
| Transaction/security tests | Partner | Astha via PR/review | Core contracts |
| Demo/UI/mobile E2E | Astha | Partner reviews fixture needs | Browser acceptance |
| CI/package files | Partner initially | No concurrent edit | Shared tooling |

## 12. Merge Conflict Prevention Rules

- One owner per shared file; no convenience edits.
- No unrelated refactor, formatting sweep, package change, historical migration edit, blind revert/reset, or force-push.
- Pull/rebase before integration; resolve owned-file conflicts with the owner.
- Commit small logical units: contract/migration, service, UI, tests.
- Run relevant checks and attach output before handoff.
- Shared-file handoff must state interface, owner, consumer, tests and merge order.
- Freeze transaction read/write contract before final payment/receipt UI integration.

## 13. Database Change Rules

Partner owns future database changes. Never edit 0001–0039; create only a unique forward-only migration after remote-baseline check. Each approved migration needs RLS review, rollback/compatibility note, safe test validation, typecheck/lint/build. Demo fixture commands require full Demo ID assertion, allow-list, idempotency, audit metadata and fail-closed behavior. Reset is never default and would require explicit SuperAdmin authorization. Talwalkar is never a seed/reset/test target or fixture source.

## 14. Execution Order

### Wave 0 — Freeze/evidence
Astha runs QA-01; Partner claims transaction/DB files; both reconcile existing worktree. **Gate:** ownership and baseline checks documented.

### Wave 1 — Parallel lifecycle proof
Astha P2-01–04; Partner P2-05/P2-07–10/QA-02. **Gate:** role/tenant/branch/date/history checks pass.

### Wave 2 — Transaction boundary
Partner P2-12 then P2-15/16. Astha P2-06/11 only against frozen contract. **Gate:** atomic rollback, reconciliation and notification tests pass.

### Wave 3 — Presentation
Astha P2-13/14/17/18/19; Partner QA-03/04 and core defects. **Gate:** UI/mobile/authorization acceptance.

### Wave 4 — Secure Demo enablement
Partner D-01/02/03/05; Astha D-04 and prepares D-06. **Wait:** no fixture run until transaction/security gate. **Gate:** wrong-target refusal/idempotency/no real-device interaction.

### Wave 5 — Acceptance
Astha D-06/QA-05/06/07; Partner QA-03/04/08. **Gate:** final acceptance.

## 15. Testing Gate After Each Wave

Run typecheck, lint, unit tests and production build; add relevant unit/integration tests; test authorized and forbidden roles; test tenant/branch scope on safe synthetic tenants; regression-test membership/payment/notifications when touched; attach PR evidence and owner sign-off before consumer work.

## 16. Final Demo Acceptance

Demo Gym is READY only when it is explicitly protected/demo-designated with SuperAdmin-controlled maintenance; has all walkthrough roles; contains deterministic non-client scenarios for every audit gap; completes desktop/mobile/PWA journey without hardware; and has an audited fixture that refuses non-Demo targets including Talwalkar.

## 17. Final Phase 2 Acceptance

P2-01–19 have evidence or formal product descoping. Sales, partial payment, refund, lifecycle, invoice, receipt, receivable, GST/ledger and notification outputs reconcile; failed sales create no partial rows; role/tenant/branch/RLS/storage tests pass; date filters are correct; CI is green.

## 18. Final Production Gate

Approved pipeline only; reviewed migrations/environments; RLS/role/storage/payment/audit/PWA-mobile checks; list/chart/report performance; reviewed Demo/Talwalkar safety evidence; generic feature tiers only.

## 19. Handoff Protocol

1. Owner publishes scope, changed files, migration impact, interface/version, tests and limitations.
2. Consumer reviews interface before dependent edits.
3. Contract/database merges first; UI consumer rebases and integrates owned files.
4. The file owner fixes cross-ownership defects.
5. PR/release evidence is required; verbal handoff is not acceptance.

## 20. Final Task Checklist

- [ ] Wave 0 ownership/baseline complete.
- [ ] P2-01–04 evidence complete.
- [ ] P2-05/P2-07–10 lifecycle evidence complete.
- [ ] P2-12 atomic sale; P2-15 partial payment; P2-16 refund accepted.
- [ ] P2-06/11/13/14/17 UI accepted.
- [ ] P2-18/19 accepted.
- [ ] QA-01–08 evidence complete.
- [ ] D-01–05 secure Demo enablement complete.
- [ ] D-06 desktop/mobile/PWA journey passes.
- [ ] Talwalkar safety sign-off confirms no access or mutation.
