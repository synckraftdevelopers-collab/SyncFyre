# SyncFyre — Non-Admin Completion Plans

These files cover the work remaining outside the Admin portal. Complete tasks in the listed order and do not start the next task until the current task passes its tests.

| Order | Developer | Module | Plan |
|---|---|---|---|
| 1 | Dev 1 | Reception portal | [reception.md](reception.md) |
| 2 | Dev 2 | Trainer portal foundation and workouts | [trainer.md](trainer.md) |
| 3 | Dev 1 | Member portal self-service | [member.md](member.md) |
| 4 | Dev 2 | Diet planner | [diet-planner.md](diet-planner.md) |

## Working rules

- Dev 1 edits only `app/(reception)/`, `app/(member)/`, and their tests.
- Dev 2 edits only `app/(trainer)/`, trainer/diet tests, and their new services.
- Do not edit `middleware.ts`, `lib/auth.ts`, `lib/nav/*`, global CSS, or shared APIs at the same time. Hand off and merge one small change before the other developer starts a shared file.
- Before each pull request: run `npm run typecheck`. Run the module's browser tests against a test branch and test accounts.
- A task is complete only when every test checkbox and the evidence row are filled.
