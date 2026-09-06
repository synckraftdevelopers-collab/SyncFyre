begin;

create table if not exists public.member_form_configurations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  field_key text not null,
  enabled boolean not null default true,
  required boolean not null default false,
  display_order integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_form_configurations_field_key_check check (field_key ~ '^[a-z0-9_]{2,80}$'),
  unique (tenant_id, field_key)
);

create index if not exists member_form_configurations_tenant_order_idx
  on public.member_form_configurations (tenant_id, display_order, field_key);

alter table public.member_form_configurations enable row level security;

drop trigger if exists set_updated_at on public.member_form_configurations;
create trigger set_updated_at before update on public.member_form_configurations
for each row execute function public.set_updated_at();

drop policy if exists member_form_configurations_read on public.member_form_configurations;
create policy member_form_configurations_read on public.member_form_configurations
for select to authenticated
using (public.is_super_admin() or tenant_id = public.current_tenant_id());

drop policy if exists member_form_configurations_write on public.member_form_configurations;
create policy member_form_configurations_write on public.member_form_configurations
for all to authenticated
using (public.is_super_admin() or ((public.app_role() in ('owner','admin','manager')) and tenant_id = public.current_tenant_id()))
with check (public.is_super_admin() or ((public.app_role() in ('owner','admin','manager')) and tenant_id = public.current_tenant_id()));

commit;
