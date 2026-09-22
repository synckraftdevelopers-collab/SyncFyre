-- 0061_sales_targets.sql
--
-- Sales Targets (CRM) — lets management set a monthly leads/revenue target
-- per salesperson (or a whole-branch target when assigned_to is null) and
-- compare it against actual "won" leads for that month.
--
-- Mirrors the tenant/branch-scoped table conventions from
-- 0025_customization_engine_foundation.sql (communication_templates):
-- composite FK to branches(tenant_id, id), `unique nulls not distinct` on
-- the natural key, RLS scoped to tenant + management/branch, and the shared
-- set_updated_at trigger.

begin;

create table if not exists public.sales_targets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null,
  assigned_to uuid references public.users(id) on delete set null,
  period_month date not null,
  target_leads_count integer,
  target_revenue numeric(12,2),
  notes text,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_targets_branch_fk
    foreign key (tenant_id, branch_id)
    references public.branches (tenant_id, id)
    on delete cascade,
  -- period_month always stores the 1st of the month it represents.
  constraint sales_targets_period_is_month_start
    check (period_month = date_trunc('month', period_month)::date),
  -- At least one of the two targets must be set.
  constraint sales_targets_requires_a_target
    check (target_leads_count is not null or target_revenue is not null),
  constraint sales_targets_leads_count_nonnegative
    check (target_leads_count is null or target_leads_count >= 0),
  constraint sales_targets_revenue_nonnegative
    check (target_revenue is null or target_revenue >= 0),
  -- assigned_to = null means a branch-wide target; nulls not distinct so a
  -- branch can only have one branch-wide target per month, same as a given
  -- salesperson can only have one per-person target per month.
  unique nulls not distinct (tenant_id, branch_id, assigned_to, period_month)
);

create index if not exists sales_targets_tenant_branch_period_idx
  on public.sales_targets (tenant_id, branch_id, period_month);

alter table public.sales_targets enable row level security;

drop trigger if exists set_updated_at on public.sales_targets;
create trigger set_updated_at before update on public.sales_targets
for each row execute function public.set_updated_at();

drop policy if exists sales_targets_read on public.sales_targets;
create policy sales_targets_read on public.sales_targets
for select to authenticated
using (
  public.is_super_admin()
  or (
    tenant_id = public.current_tenant_id()
    and (public.is_management() or branch_id = public.current_branch_id())
  )
);

drop policy if exists sales_targets_write on public.sales_targets;
create policy sales_targets_write on public.sales_targets
for all to authenticated
using (
  public.is_super_admin()
  or (public.is_management() and tenant_id = public.current_tenant_id())
)
with check (
  public.is_super_admin()
  or (public.is_management() and tenant_id = public.current_tenant_id())
);

commit;
