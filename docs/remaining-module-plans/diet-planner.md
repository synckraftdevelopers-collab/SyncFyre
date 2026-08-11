# Diet Planner — Completion Plan

**Developer:** Dev 2  
**Start after:** Trainer plan Task T1 is complete, so there is no concurrent edit inside `app/(trainer)/trainer/`.  
**Owned files:** `app/(trainer)/trainer/diet-plans/`, diet-plan-specific tests and service functions.  
**Status:** List/create flow exists; complete edit, archive/delete, assignment history, and member verification.

## Task D1 — Plan creation and validation

**Goal:** Trainers can create accurate diet plans for their assigned members.

- [ ] Support plan name, meals, food items, quantity, calories/macros, notes, start/end dates, and member assignment.
- [ ] Validate numeric quantities and macros; require valid dates and a permitted member.
- [ ] Allow reusable templates only if they are scoped to the trainer/branch.

**Tests**

- [ ] Create a complete plan and confirm it appears in trainer and admin lists.
- [ ] Submit blank, negative, and non-numeric macro/quantity values; save is rejected.
- [ ] Try assigning another trainer's member and an inactive member; action is denied/rejected.
- [ ] Run `npm run typecheck`.

## Task D2 — Edit, assignment history, archive/delete

**Goal:** Trainers can safely maintain diet plans over time.

- [ ] Add edit form with server-side validation.
- [ ] Add assignment/unassignment and preserve assignment history where required.
- [ ] Add archive/delete confirmation; never leave a broken member assignment.
- [ ] Make active/archived status clear in the trainer list.

**Tests**

- [ ] Create -> assign -> edit -> archive a plan and reload after every step.
- [ ] Confirm archive removes the plan from active member view but preserves expected history.
- [ ] Confirm delete/archiving does not affect another member's plan.
- [ ] Run `npm run typecheck`.

## Task D3 — Member presentation and access protection

**Goal:** Member receives a readable, current diet plan and nothing else.

- [ ] Show active plan, meal sections, quantities, macro totals, notes, and effective dates.
- [ ] Show a helpful empty state if no plan is assigned.
- [ ] Make mobile reading practical without horizontal content loss.
- [ ] Restrict records to assigned member, trainer, and authorised admin/reception roles.

**Tests**

- [ ] Log in as assigned member and verify every meal/macro value matches trainer plan.
- [ ] Log in as different member and test copied plan URL; data is not exposed.
- [ ] Verify desktop and 360 px view.
- [ ] Run `npm run typecheck`.

## Sign-off evidence

| Task | Date | Tester | Environment | Result | PR/evidence/defect |
|---|---|---|---|---|---|
| D1 | | | | | |
| D2 | | | | | |
| D3 | | | | | |
