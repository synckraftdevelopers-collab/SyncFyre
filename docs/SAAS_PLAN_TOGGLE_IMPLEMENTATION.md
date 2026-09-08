# SaaS Plan Toggle Implementation

## Summary

SuperAdmin plan switching now happens from the `SuperAdmin > Tenants` page through a single toggle per tenant.

- `OFF` maps to `Phase 1 / Free`
- `ON` maps to `Phase 2 / Paid`
- `Phase 3` is not part of the customer plan toggle

The toggle writes to the existing canonical tenant plan field in the database. The entitlement resolver continues to read from the persisted tenant plan, so feature access still comes from the existing architecture.

## Existing Architecture Reused

- Canonical plan storage: `tenants.plan`
- Existing SuperAdmin tenant update action: `updateTenantAction`
- Existing entitlement resolver: `services/entitlements.service.ts`
- Existing commercial plan tier mapping: `lib/entitlements.ts`
- Existing audit trail: `activity_logs`
- Existing SuperAdmin tenants page: `app/(superadmin)/superadmin/tenants/page.tsx`

## What Changed

### Tenants page

- Added a plan toggle to the `Plan` column for each tenant.
- The toggle shows the current state and the customer-facing label:
  - `Phase 1 • Free`
  - `Phase 2 • Paid`
- The toggle submits to the existing SuperAdmin tenant update action.

### Tenant edit dialog

- Removed the `Plan` select from the large edit form.
- The edit form still handles tenant, owner, branch, and trial details.

### Server action

- `updateTenantAction` now supports partial updates.
- When the plan field is present, it normalizes the value to the canonical plan stored in `tenants.plan`.
- When the plan field is absent, it preserves the existing plan.
- The action keeps writing to `activity_logs` for audit visibility.

## Plan Mapping

| UI state | Customer label | Canonical stored plan |
| --- | --- | --- |
| OFF | Phase 1 / Free | `trial` |
| ON | Phase 2 / Paid | `standard` |

The entitlement layer still interprets plan aliases through `getCommercialPlanTier()`.

## Safety Rules

- Talwalkar Gym is protected from plan changes.
- Plan updates are server-side only.
- The tenant page is revalidated after a successful save.

## Result

There is now one clear plan control:

`SuperAdmin Tenants page` -> toggle -> canonical DB plan -> existing entitlement resolver -> locked/unlocked features
