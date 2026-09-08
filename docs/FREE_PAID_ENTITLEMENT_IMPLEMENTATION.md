# Free / Paid Entitlement Implementation

## What changed

- Reused the existing tenant-level plan source in `tenants.plan`.
- Added a small entitlement helper layer for plan-tier resolution and route matching.
- Locked the implemented phase 2 surfaces for Free tenants:
  - CRM / Leads
  - Finance
  - PT / trainer management
  - Biometric / face attendance
  - Advanced reports / exports
- Kept the existing phase 1 surfaces accessible on Free tenants.
- Added a shared locked-upgrade page at `/admin/upgrade`.

## Architecture Reused

- Canonical plan source: `tenants.plan`
- Existing tenant/user auth and portal context
- Existing `PortalShell`, `PortalSidebar`, and legacy `Sidebar`
- Existing server actions and API routes
- Existing Supabase tables and tenant feature/config system

No new plan table or duplicate entitlement registry was introduced.

## Phase 1 Behavior

- Free tenants continue to access implemented phase 1 workflows.
- The code does not remove or replace the current commercial plan records.
- The admin shell still renders the normal tenant workspace for phase 1 routes.

## Phase 2 Behavior

- Free tenants are blocked from implemented phase 2 routes and writes.
- Paid tenants can access the same implemented phase 2 routes and actions.
- The plan decision is applied in:
  - middleware
  - route-level API handlers
  - server actions
  - biometric ingestion / machine session paths

## Locked Feature UX

- Locked navigation items resolve to `/admin/upgrade`.
- The upgrade page uses the existing card/button design system.
- Locked users see a message that the feature is available on the Paid Plan.
- The page points back to the workspace and to the application settings area.

## Direct URL / API Protection

- `/admin/leads` is blocked for Free tenants.
- `/admin/finance` and its child routes are blocked for Free tenants.
- `/admin/pt` is blocked for Free tenants.
- `/admin/machines` is blocked for Free tenants.
- `/admin/reports/*` and `/api/reports` are blocked for Free tenants.
- `face-machine` API mutations are blocked for Free tenants.
- Biometric ingestion returns a locked outcome instead of processing attendance for Free tenants.
- Machine session creation is denied for Free tenants.

## CRM Route Status

- CRM is implemented.
- Real route: `/admin/leads`
- Free: locked / upgrade experience
- Paid: accessible

## Demo Gym Evidence

- Live Demo Gym tenant validation was not executed from this workspace because there is no connected tenant database session in this run.
- The implementation was validated locally through:
  - `npm run typecheck`
  - `npm run lint` with pre-existing warnings only
  - `npm test`
- The production build was started, but it did not complete within the available runtime window in this environment.

## Validation Results

- `npm run typecheck`: pass
- `npm run lint`: pass with existing warnings only
- `npm test`: pass
- `npm run build`: started, but not completed in this environment

## Remaining Gaps

- Live Demo Gym tenant verification still needs to be executed against the connected Supabase environment.
- The build command did not finish within the time available here, so production build confirmation is still pending.
