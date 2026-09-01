begin;

do $$ begin
  create type public.config_data_type as enum ('string','number','boolean','json','string_array');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.config_scope as enum ('tenant','tenant_branch');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.comm_template_channel as enum ('whatsapp','sms','email');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_custom_field_type as enum ('text','number','date','dropdown','checkbox','radio','textarea');
exception when duplicate_object then null; end $$;

create unique index if not exists branches_tenant_id_id_uidx
  on public.branches (tenant_id, id);

create unique index if not exists members_tenant_id_id_uidx
  on public.members (tenant_id, id);

create table if not exists public.tenant_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  setting_key text not null,
  setting_value jsonb not null,
  data_type public.config_data_type not null,
  scope public.config_scope not null default 'tenant',
  is_overridable boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_settings_key_check check (setting_key ~ '^[a-z0-9._-]{2,120}$'),
  unique (tenant_id, setting_key)
);

create table if not exists public.branch_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  branch_id uuid not null,
  setting_key text not null,
  setting_value jsonb not null,
  data_type public.config_data_type not null,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branch_settings_key_check check (setting_key ~ '^[a-z0-9._-]{2,120}$'),
  constraint branch_settings_branch_fk
    foreign key (tenant_id, branch_id)
    references public.branches (tenant_id, id)
    on delete cascade,
  unique (tenant_id, branch_id, setting_key)
);

create table if not exists public.tenant_features (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_features_key_check check (feature_key ~ '^[a-z0-9._-]{2,80}$'),
  unique (tenant_id, feature_key)
);

create table if not exists public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid,
  template_key text not null,
  channel public.comm_template_channel not null,
  name text not null,
  content text not null,
  variables text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_templates_key_check check (template_key ~ '^[a-z0-9._-]{2,80}$'),
  constraint communication_templates_branch_fk
    foreign key (tenant_id, branch_id)
    references public.branches (tenant_id, id)
    on delete cascade,
  unique nulls not distinct (tenant_id, branch_id, template_key, channel)
);

create table if not exists public.member_custom_fields (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  field_key text not null,
  field_name text not null,
  field_type public.member_custom_field_type not null,
  options jsonb not null default '[]'::jsonb,
  is_required boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_custom_fields_key_check check (field_key ~ '^[a-z0-9_]{2,80}$'),
  unique (tenant_id, field_key)
);

create unique index if not exists member_custom_fields_tenant_id_id_uidx
  on public.member_custom_fields (tenant_id, id);

create table if not exists public.member_custom_field_values (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  member_id uuid not null,
  field_id uuid not null,
  value jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_custom_field_values_member_fk
    foreign key (tenant_id, member_id)
    references public.members (tenant_id, id)
    on delete cascade,
  constraint member_custom_field_values_field_fk
    foreign key (tenant_id, field_id)
    references public.member_custom_fields (tenant_id, id)
    on delete cascade,
  unique (tenant_id, member_id, field_id)
);

create index if not exists tenant_settings_tenant_key_idx
  on public.tenant_settings (tenant_id, setting_key);

create index if not exists branch_settings_tenant_branch_key_idx
  on public.branch_settings (tenant_id, branch_id, setting_key);

create index if not exists tenant_features_tenant_feature_idx
  on public.tenant_features (tenant_id, feature_key);

create index if not exists communication_templates_lookup_idx
  on public.communication_templates (tenant_id, branch_id, template_key, channel)
  where is_active = true;

create index if not exists member_custom_fields_tenant_order_idx
  on public.member_custom_fields (tenant_id, is_active, display_order, created_at);

create index if not exists member_custom_field_values_lookup_idx
  on public.member_custom_field_values (tenant_id, member_id, field_id);

alter table public.tenant_settings enable row level security;
alter table public.branch_settings enable row level security;
alter table public.tenant_features enable row level security;
alter table public.communication_templates enable row level security;
alter table public.member_custom_fields enable row level security;
alter table public.member_custom_field_values enable row level security;

drop trigger if exists set_updated_at on public.tenant_settings;
create trigger set_updated_at before update on public.tenant_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.branch_settings;
create trigger set_updated_at before update on public.branch_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.tenant_features;
create trigger set_updated_at before update on public.tenant_features
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.communication_templates;
create trigger set_updated_at before update on public.communication_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.member_custom_fields;
create trigger set_updated_at before update on public.member_custom_fields
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.member_custom_field_values;
create trigger set_updated_at before update on public.member_custom_field_values
for each row execute function public.set_updated_at();

drop policy if exists tenant_settings_read on public.tenant_settings;
create policy tenant_settings_read on public.tenant_settings
for select to authenticated
using (public.is_super_admin() or tenant_id = public.current_tenant_id());

drop policy if exists tenant_settings_write on public.tenant_settings;
create policy tenant_settings_write on public.tenant_settings
for all to authenticated
using (public.is_super_admin() or (public.is_management() and tenant_id = public.current_tenant_id()))
with check (public.is_super_admin() or (public.is_management() and tenant_id = public.current_tenant_id()));

drop policy if exists branch_settings_read on public.branch_settings;
create policy branch_settings_read on public.branch_settings
for select to authenticated
using (
  public.is_super_admin()
  or (tenant_id = public.current_tenant_id() and (public.is_management() or branch_id = public.current_branch_id()))
);

drop policy if exists branch_settings_write on public.branch_settings;
create policy branch_settings_write on public.branch_settings
for all to authenticated
using (public.is_super_admin() or (public.is_management() and tenant_id = public.current_tenant_id()))
with check (public.is_super_admin() or (public.is_management() and tenant_id = public.current_tenant_id()));

drop policy if exists tenant_features_read on public.tenant_features;
create policy tenant_features_read on public.tenant_features
for select to authenticated
using (public.is_super_admin() or tenant_id = public.current_tenant_id());

drop policy if exists tenant_features_write on public.tenant_features;
create policy tenant_features_write on public.tenant_features
for all to authenticated
using (public.is_super_admin() or (public.is_management() and tenant_id = public.current_tenant_id()))
with check (public.is_super_admin() or (public.is_management() and tenant_id = public.current_tenant_id()));

drop policy if exists communication_templates_read on public.communication_templates;
create policy communication_templates_read on public.communication_templates
for select to authenticated
using (
  public.is_super_admin()
  or (
    tenant_id = public.current_tenant_id()
    and (branch_id is null or public.is_management() or branch_id = public.current_branch_id())
  )
);

drop policy if exists communication_templates_write on public.communication_templates;
create policy communication_templates_write on public.communication_templates
for all to authenticated
using (public.is_super_admin() or (public.is_management() and tenant_id = public.current_tenant_id()))
with check (public.is_super_admin() or (public.is_management() and tenant_id = public.current_tenant_id()));

drop policy if exists member_custom_fields_read on public.member_custom_fields;
create policy member_custom_fields_read on public.member_custom_fields
for select to authenticated
using (public.is_super_admin() or tenant_id = public.current_tenant_id());

drop policy if exists member_custom_fields_write on public.member_custom_fields;
create policy member_custom_fields_write on public.member_custom_fields
for all to authenticated
using (public.is_super_admin() or (public.is_management() and tenant_id = public.current_tenant_id()))
with check (public.is_super_admin() or (public.is_management() and tenant_id = public.current_tenant_id()));

drop policy if exists member_custom_field_values_read on public.member_custom_field_values;
create policy member_custom_field_values_read on public.member_custom_field_values
for select to authenticated
using (
  public.is_super_admin()
  or tenant_id = public.current_tenant_id()
  or member_id in (select id from public.members where user_id = auth.uid())
);

drop policy if exists member_custom_field_values_write on public.member_custom_field_values;
create policy member_custom_field_values_write on public.member_custom_field_values
for all to authenticated
using (
  public.is_super_admin()
  or (public.is_staff_user() and tenant_id = public.current_tenant_id())
)
with check (
  public.is_super_admin()
  or (public.is_staff_user() and tenant_id = public.current_tenant_id())
);

commit;
