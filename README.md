# syncfyre Gym Management System

Production-oriented, multi-branch gym SaaS built with Next.js 15, TypeScript, Supabase, Tailwind CSS, TanStack Table, and Recharts.

## Local setup

1. Copy `.env.example` to `.env.local` and provide credentials.
2. Run `supabase/migrations/0001_initial_schema.sql` in the Supabase SQL editor.
3. Create the first Auth user, then set its `public.users.role_id` to the seeded Admin role.
4. Run `npm install` and `npm run dev`.

The public key is safe for browser use. Schema migrations and trusted attendance ingestion require a service-role key or authenticated Supabase CLI session; never expose that key with a `NEXT_PUBLIC_` prefix.
