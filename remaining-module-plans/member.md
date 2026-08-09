# Member Portal — Completion Plan

**Developer:** Dev 1  
**Owned files:** `app/(member)/member/`, `services/member-portal.service.ts`, `__tests__/member/`, `e2e/member/`  
**Do not edit:** Reception, Trainer, Admin, navigation, authentication, or shared API files without a handoff.

## Task M1 — Editable member profile

**Goal:** Members can maintain safe personal data without gaining access to staff-controlled fields.

- [ ] Replace read-only profile with edit form for phone, address, emergency contact, and approved profile photo.
- [ ] Validate phone, email, image type, and image size.
- [ ] Keep branch, role, membership, status, trainer, and financial data read-only.
- [ ] Store images with member-scoped access controls.

**Tests**

- [ ] Update each permitted field, refresh, and confirm persistence.
- [ ] Upload a valid image and an invalid/oversized image.
- [ ] Modify forbidden fields in the request payload; server rejects them.
- [ ] Log in as a second member and try copied profile URL; only own profile is visible.
- [ ] Run `npm run typecheck`.

## Task M2 — Membership and payments self-service

**Goal:** Member sees accurate membership, invoices, payments, and receipts.

- [ ] Show plan, start/end date, status, expiry countdown, and renewal request state.
- [ ] Add payment history and receipt view/download page.
- [ ] Add the Payments navigation item only after page tests pass and navigation change is handed off sequentially.
- [ ] Add clear empty/error state when no membership/payment exists.

**Tests**

- [ ] Give test member a paid plan and verify all membership details.
- [ ] Create partial payment and verify balance/history display.
- [ ] Open receipt and verify it belongs to signed-in member only.
- [ ] Test expired membership and no-membership empty states.
- [ ] Run `npm run typecheck`.

## Task M3 — Appointment self-service verification

**Goal:** Member can request and safely cancel/reschedule their own appointments.

- [ ] Show only current member appointments and permissible slots.
- [ ] Enforce cutoff time and transition rules for cancel/reschedule.
- [ ] Show clear pending/approved/completed/cancelled state.

**Tests**

- [ ] Request appointment and confirm it reaches reception/trainer portal.
- [ ] Cancel/reschedule within allowed time and verify all portals update.
- [ ] Attempt to access/update another member appointment; action is denied.
- [ ] Run `npm run typecheck`.

## Task M4 — Assigned content and attendance verification

**Goal:** Member sees only their own workout, diet plan, progress, and attendance records.

- [ ] Verify appropriate empty states for missing assignments.
- [ ] Verify history/date display and responsiveness on mobile.
- [ ] Do not expose trainer notes or records belonging to another member.

**Tests**

- [ ] Assign workout/diet/progress as trainer and verify display for target member.
- [ ] Check attendance after a test check-in/check-out.
- [ ] Use a second member account to prove every page is isolated.
- [ ] Run `npm run typecheck`.

## Sign-off evidence

| Task | Date | Tester | Environment | Result | PR/evidence/defect |
|---|---|---|---|---|---|
| M1 | | | | | |
| M2 | | | | | |
| M3 | | | | | |
| M4 | | | | | |
