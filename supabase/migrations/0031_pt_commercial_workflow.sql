begin;

create table if not exists public.pt_packages (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade, branch_id uuid not null references public.branches(id) on delete restrict,
  name text not null, session_count integer not null check (session_count > 0), price numeric(12,2) not null check (price >= 0), validity_days integer not null default 90 check (validity_days > 0), status public.record_status not null default 'active', created_by uuid references public.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (branch_id, name)
);

create table if not exists public.pt_member_packages (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade, branch_id uuid not null references public.branches(id) on delete restrict, member_id uuid not null references public.members(id) on delete restrict, trainer_id uuid references public.trainers(id) on delete set null, package_id uuid not null references public.pt_packages(id) on delete restrict,
  purchased_sessions integer not null check (purchased_sessions > 0), used_sessions integer not null default 0 check (used_sessions >= 0 and used_sessions <= purchased_sessions), amount numeric(12,2) not null check (amount >= 0), purchased_at timestamptz not null default now(), expires_at date not null, status text not null default 'active' check (status in ('active','completed','expired','cancelled')), created_by uuid references public.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.pt_sessions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade, branch_id uuid not null references public.branches(id) on delete restrict, member_package_id uuid not null references public.pt_member_packages(id) on delete cascade, trainer_id uuid references public.trainers(id) on delete set null, session_at timestamptz not null, status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show')), notes text, completed_by uuid references public.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists pt_member_packages_member_idx on public.pt_member_packages(tenant_id, branch_id, member_id, status);
create index if not exists pt_sessions_package_idx on public.pt_sessions(member_package_id, session_at);
create trigger set_updated_at before update on public.pt_packages for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.pt_member_packages for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.pt_sessions for each row execute function public.set_updated_at();
alter table public.pt_packages enable row level security;
alter table public.pt_member_packages enable row level security;
alter table public.pt_sessions enable row level security;
create policy "tenant users manage pt packages" on public.pt_packages for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());
create policy "tenant users manage pt member packages" on public.pt_member_packages for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());
create policy "tenant users manage pt sessions" on public.pt_sessions for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());
commit;