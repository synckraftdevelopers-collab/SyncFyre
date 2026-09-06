begin;
create table if not exists public.member_import_batches (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade, branch_id uuid not null references public.branches(id) on delete restrict,
  file_name text not null, total_rows integer not null default 0, imported_rows integer not null default 0, rejected_rows integer not null default 0,
  rejection_details jsonb not null default '[]'::jsonb, imported_by uuid references public.users(id) on delete set null, created_at timestamptz not null default now()
);
create index if not exists member_import_batches_branch_created_idx on public.member_import_batches(tenant_id, branch_id, created_at desc);
alter table public.member_import_batches enable row level security;
create policy "tenant users read member import batches" on public.member_import_batches for select using (tenant_id = public.current_tenant_id());
create policy "tenant users create member import batches" on public.member_import_batches for insert with check (tenant_id = public.current_tenant_id());
commit;