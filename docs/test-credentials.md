# SyncFyre Test Credentials

Use these accounts when testing each portal locally.
Create them in **Supabase -> Authentication -> Users**, then set the role in `public.users`.

---

## How to set up a test account

1. Go to **Supabase Dashboard -> Authentication -> Users -> Add user**
2. Enter the email and password below
3. Open the **SQL Editor** and run:

```sql
UPDATE public.users
SET role_id = (SELECT id FROM public.roles WHERE slug = '<role-slug>')
WHERE email = '<email>';
```

Replace `<role-slug>` and `<email>` with the values from the table below.

---

## Accounts

| Role | Email | Password | Portal URL | role-slug |
|---|---|---|---|---|
| Owner | owner@syncfyre.test | Owner@1234 | /admin/dashboard | owner |
| Reception | reception@syncfyre.test | Reception@1234 | /reception/dashboard | reception |
| Trainer | trainer@syncfyre.test | Trainer@1234 | /trainer/dashboard | trainer |
| Dietician | dietician@syncfyre.test | Dietician@1234 | /trainer/dashboard | dietician |
| Member | member@syncfyre.test | Member@1234 | /member/dashboard | member |

---

## Quick SQL - create all roles at once

Run this after creating all 5 users in Supabase Auth:

```sql
UPDATE public.users SET role_id = (SELECT id FROM public.roles WHERE slug = 'owner')
WHERE email = 'owner@syncfyre.test';

UPDATE public.users SET role_id = (SELECT id FROM public.roles WHERE slug = 'reception')
WHERE email = 'reception@syncfyre.test';

UPDATE public.users SET role_id = (SELECT id FROM public.roles WHERE slug = 'trainer')
WHERE email = 'trainer@syncfyre.test';

UPDATE public.users SET role_id = (SELECT id FROM public.roles WHERE slug = 'dietician')
WHERE email = 'dietician@syncfyre.test';

UPDATE public.users SET role_id = (SELECT id FROM public.roles WHERE slug = 'member')
WHERE email = 'member@syncfyre.test';
```

---

## Portal access matrix

| Portal | URL prefix | Allowed roles |
|---|---|---|
| Owner | /admin | owner, admin, manager |
| Reception | /reception | reception |
| Trainer | /trainer | trainer, dietician, diet-planner, diet_planner |
| Member | /member | member |

Middleware automatically redirects each role to their correct portal.
Accessing another portal redirects back to your own dashboard.

---

## Password rules

Passwords must be at least 8 characters with one uppercase letter and one number.
All test passwords above satisfy this requirement.

---

## Notes

- These credentials are for local or staging testing only. Never use them in production.
- If login fails, confirm the user exists in `public.users` and `auth.users`.
- To reset a password: Supabase Dashboard -> Authentication -> Users -> select user -> Send password reset.
