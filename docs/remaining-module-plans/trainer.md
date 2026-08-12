# Trainer Portal — Completion Plan

**Developer:** Dev 2  
**Owned files:** `app/(trainer)/trainer/`, new `services/trainer-portal.service.ts`, `__tests__/trainer/`, `e2e/trainer/`  
**Do not edit:** Reception, Member, Admin, navigation, authentication, or shared API files without a handoff.

## Task T1 — Fix dashboard and assigned member access

**Goal:** Trainer dashboard displays correct live data and never exposes unassigned members.

- [ ] Replace voided/dead dashboard queries with awaited, error-handled queries.
- [ ] Show assigned-member, appointment, workout, diet-plan, and progress counts.
- [ ] Restrict member list/detail queries to current trainer assignments and branch.
- [ ] Add empty and error states.

**Tests**

- [ ] Log in as a trainer with assigned members and compare counts with list data.
- [ ] Log in as a trainer with no assignments; dashboard/list show safe empty states.
- [ ] Assign different members to two trainers; confirm no crossover, including by copied URL.
- [ ] Run `npm run typecheck`.

## Task T2 — Workout edit, archive, and assignment

**Goal:** Trainer owns a complete workout lifecycle for assigned members.

- [ ] Add edit form for exercises, sets, reps, rest, notes, dates, and status.
- [ ] Validate required text and all numeric values.
- [ ] Add archive/delete with confirmation and safe handling of existing assignments.
- [ ] Allow assignment/unassignment only to current trainer's members.

**Tests**


- [ ] Create -> assign -> edit -> archive a workout.
- [ ] Verify assigned member sees the update and unassigned member sees nothing.
- [ ] Submit invalid exercise/numeric input and verify nothing corrupt is saved.
- [ ] Try assigning to another trainer's member; action is denied.
- [ ] Run `npm run typecheck`.

## Task T3 — Progress edit and archive

**Goal:** Trainer can manage measurements for assigned members safely.

- [ ] Add edit and archive/delete actions to progress records.
- [ ] Validate measurement values and dates.
- [ ] Preserve historical records or require confirmation for destructive removal.
- [ ] Show data in descending measurement date order.

**Tests**

- [ ] Create two progress records, edit one, and verify changes in trainer/admin/member views.
- [ ] Archive/delete one record and confirm intended visibility/history behaviour.
- [ ] Try to alter an unassigned member record; action is denied.
- [ ] Run `npm run typecheck`.

## Task T4 — Trainer notifications and settings

**Goal:** Trainer has personal notifications and safe personal settings.

- [ ] Create notifications list with unread/read state and safe deep links.
- [ ] Add settings for personal profile/preferences only.
- [ ] Do not permit role, branch, or other trainer changes.
- [ ] Request a sequential handoff before adding any new navigation entry.

**Tests**

- [ ] Create a test notification, mark it read, refresh, and verify state persists.
- [ ] Update a permitted profile setting and verify persistence.
- [ ] Attempt to change role/branch through form payload; update is rejected.
- [ ] Run `npm run typecheck`.

## Sign-off evidence

| Task | Date | Tester | Environment | Result | PR/evidence/defect |
|---|---|---|---|---|---|
| T1 | | | | | |
| T2 | | | | | |
| T3 | | | | | |
| T4 | | | | | |
