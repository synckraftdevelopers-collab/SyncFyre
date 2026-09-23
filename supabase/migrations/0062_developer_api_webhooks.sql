-- 0062_developer_api_webhooks.sql
--
-- Developer surface (P3-12): tenant-scoped API keys and webhook endpoints so
-- an integration can call into (or receive events from) a gym's data.
-- Gated by lib/entitlements/registry.ts's "api_webhooks" key (Scale/phase_3
-- only) via hasCurrentFeature() in every server action and the
-- /admin/developer page — this migration only creates the tables and their
-- RLS, it does not itself enforce the plan gate.
--
-- Mirrors the tenant/branch-scoped table conventions already used by
-- communication_logs (0060_communication_logs.sql): composite FK to
-- branches(tenant_id, id) that stays enforceable with a null branch_id (a
-- tenant-wide key/webhook), and the shared set_updated_at trigger for the
-- mutable table.
--
-- Role check: unlike sales_targets/communication_logs (which use
-- is_management(), i.e. admin-or-manager), API keys and webhooks are
-- integration/security-sensitive and restricted to owner+admin only, matching
-- this feature's requireUser(["owner","admin"]) gate in the server actions.
-- is_management() does NOT cover 'owner' (see 0059_fix_trainer_delete_rls.sql
-- for that known gap) and DOES include 'manager', neither of which is what
-- we want here, so policies below check app_role() in ('owner','admin')
-- directly instead of calling is_management().
--
-- Secrets: only a SHA-256 hash of each generated secret is ever stored
-- (key_hash / secret_hash). The raw secret is generated in the server
-- action, returned to the caller exactly once in the action's response, and
-- never written to any table or log.

begin;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default '{}',
  created_by uuid references public.users(id) on delete set null,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint api_keys_key_hash_unique unique (key_hash),
  constraint api_keys_branch_fk
    foreign key (tenant_id, branch_id)
    references public.branches (tenant_id, id)
    on delete cascade
);

create index if not exists api_keys_tenant_branch_idx
  on public.api_keys (tenant_id, branch_id);

alter table public.api_keys enable row level security;

drop policy if exists api_keys_read on public.api_keys;
create policy api_keys_read on public.api_keys
for select to authenticated
using (
  public.is_super_admin()
  or (public.app_role() in ('owner', 'admin') and tenant_id = public.current_tenant_id())
);

drop policy if exists api_keys_write on public.api_keys;
create policy api_keys_write on public.api_keys
for all to authenticated
using (
  public.is_super_admin()
  or (public.app_role() in ('owner', 'admin') and tenant_id = public.current_tenant_id())
)
with check (
  public.is_super_admin()
  or (public.app_role() in ('owner', 'admin') and tenant_id = public.current_tenant_id())
);

create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid,
  url text not null,
  events text[] not null default '{}',
  secret_hash text not null,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint webhook_endpoints_branch_fk
    foreign key (tenant_id, branch_id)
    references public.branches (tenant_id, id)
    on delete cascade
);

create index if not exists webhook_endpoints_tenant_branch_idx
  on public.webhook_endpoints (tenant_id, branch_id);

alter table public.webhook_endpoints enable row level security;

drop trigger if exists set_updated_at on public.webhook_endpoints;
create trigger set_updated_at before update on public.webhook_endpoints
for each row execute function public.set_updated_at();

drop policy if exists webhook_endpoints_read on public.webhook_endpoints;
create policy webhook_endpoints_read on public.webhook_endpoints
for select to authenticated
using (
  public.is_super_admin()
  or (public.app_role() in ('owner', 'admin') and tenant_id = public.current_tenant_id())
);

drop policy if exists webhook_endpoints_write on public.webhook_endpoints;
create policy webhook_endpoints_write on public.webhook_endpoints
for all to authenticated
using (
  public.is_super_admin()
  or (public.app_role() in ('owner', 'admin') and tenant_id = public.current_tenant_id())
)
with check (
  public.is_super_admin()
  or (public.app_role() in ('owner', 'admin') and tenant_id = public.current_tenant_id())
);

commit;
