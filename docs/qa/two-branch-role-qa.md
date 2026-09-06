# Two-Branch Role QA Setup

Use this runbook only against the dedicated QA Supabase project. Do not run it against production.

## 1. Create Auth users

Create these users in Supabase Authentication with unique, password-manager-generated passwords:

| User | Role | Branch |
|---|---|---|
| `qa.admin@syncfyre.test` | Admin | QA Branch A |
| `qa.reception.a@syncfyre.test` | Reception | QA Branch A |
| `qa.reception.b@syncfyre.test` | Reception | QA Branch B |
| `qa.trainer.a@syncfyre.test` | Trainer | QA Branch A |
| `qa.trainer.b@syncfyre.test` | Trainer | QA Branch B |

The app's user-profile trigger must have created a corresponding `public.users` row for every Auth user before proceeding.

## 2. Assign branches and roles

Open [two-branch-role-qa.sql](two-branch-role-qa.sql), replace `replace-with-qa-tenant-slug` with the existing QA tenant slug, and run it in the QA project's SQL editor.

The script creates or updates the `QA-A` and `QA-B` branches, assigns each profile its intended role and branch, and stops if an expected Auth profile is missing.

## 3. Confirm setup

Run the following read-only check in the QA SQL editor. It must return five active rows, with the indicated branch and role assignments.

```sql
select u.email, r.slug as role, b.code as branch, t.slug as tenant
from public.users u
join public.roles r on r.id = u.role_id
left join public.branches b on b.id = u.branch_id
join public.tenants t on t.id = u.tenant_id
where u.email in (
  'qa.admin@syncfyre.test',
  'qa.reception.a@syncfyre.test',
  'qa.reception.b@syncfyre.test',
  'qa.trainer.a@syncfyre.test',
  'qa.trainer.b@syncfyre.test'
)
order by u.email;
```

## 4. Use this matrix for P0 isolation QA

- Branch A users must not open, alter, or export Branch B records.
- Branch B users must not open, alter, or export Branch A records.
- Reception users must remain in the reception portal.
- Trainer users must see only their assigned members.
- Admin retains visibility only within the QA tenant.