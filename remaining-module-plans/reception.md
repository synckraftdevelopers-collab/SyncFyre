# Reception Portal — Completion Plan

**Developer:** Dev 1  
**Owned files:** `app/(reception)/reception/`, new `services/reception.service.ts`, `__tests__/reception/`, `e2e/reception/`  
**Do not edit:** Trainer, Member, Admin, navigation, authentication, or shared API files without a handoff.

## Task R1 — Repair member detail page

**Goal:** Reception can open a member detail page without broken imports or runtime errors.

- [ ] Inspect and fix the member-detail dependency/import issue.
- [ ] Load profile, current membership, recent payments, and attendance for the selected member.
- [ ] Show a usable empty state when a member has no payments/attendance.
- [ ] Return a safe not-found/unauthorised result for invalid or other-branch member IDs.

**Tests**

- [ ] Open an existing member from the reception list.
- [ ] Open a member with no history.
- [ ] Open a random UUID and confirm no runtime error/data leak.
- [ ] Log in as a second branch and try the first branch member URL; access is denied.
- [ ] Run `npm run typecheck`.

## Task R2 — Membership sale and renewal

**Goal:** Reception can use real plans to create and renew memberships safely.

- [ ] Replace any placeholder plan data with branch-scoped active membership plans.
- [ ] Select member, plan, dates, discount, payment method, paid amount, and reference.
- [ ] Validate amount, dates, and plan status on the server.
- [ ] Create the subscription, invoice, payment, and receipt consistently; show a recoverable error if save fails.
- [ ] Add renewal flow that preserves membership history and calculates the new expiry correctly.

**Tests**

- [ ] Create a paid membership and verify it appears in admin memberships and the member portal.
- [ ] Create a partial-payment membership and verify the balance in Payments/Finance.
- [ ] Renew the same member and verify dates/history.
- [ ] Try invalid amount, inactive plan, and invalid date; no partial records are saved.
- [ ] Try to sell a Branch A plan to a Branch B member; action is denied.
- [ ] Run `npm run typecheck`.

## Task R3 — Appointment desk actions

**Goal:** Reception can manage appointment lifecycle without bypassing trainer/member permissions.

- [ ] List appointments with member, trainer, date, and status filters.
- [ ] Add permitted Approve, Cancel, and status-refresh actions.
- [ ] Require a cancellation reason where the database supports it.
- [ ] Prevent invalid state transitions and trainer conflicts.

**Tests**

- [ ] Create -> approve -> complete an appointment with a test member/trainer.
- [ ] Create -> cancel another appointment and verify the reason/history.
- [ ] Confirm trainer and member portals show the same status after refresh.
- [ ] Try an invalid transition and cross-branch appointment URL; both fail safely.
- [ ] Run `npm run typecheck`.

## Task R4 — Invoices and payments verification

**Goal:** Reception invoice creation and payment handling are reliable.

- [ ] Verify/create invoice form validation, tax calculation, member link, and payment reference.
- [ ] Verify receipt route and list refresh after payment.
- [ ] Add clear validation/error feedback for failed save.

**Tests**

- [ ] Create invoice -> record payment -> open receipt.
- [ ] Verify full and partial payment balances after refresh.
- [ ] Confirm an unauthorised reception account cannot access another branch invoice.
- [ ] Run `npm run typecheck`.

## Sign-off evidence

| Task | Date | Tester | Environment | Result | PR/evidence/defect |
|---|---|---|---|---|---|
| R1 | | | | | |
| R2 | | | | | |
| R3 | | | | | |
| R4 | | | | | |
