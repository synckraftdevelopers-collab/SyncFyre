-- 0058_member_transfer_log.sql
-- Records every member branch transfer for audit and history purposes.
-- Scoped to tenant via members.tenant_id — RLS on members table already enforces this.

create table if not exists member_transfer_log (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null references tenants(id) on delete cascade,
  member_id     uuid        not null references members(id) on delete cascade,
  from_branch_id uuid       not null references branches(id),
  to_branch_id  uuid        not null references branches(id),
  transferred_by uuid       references users(id),
  reason        text,
  transferred_at timestamptz not null default now()
);

-- Indexes for the most common query patterns
create index if not exists idx_member_transfer_log_member on member_transfer_log(member_id);
create index if not exists idx_member_transfer_log_tenant on member_transfer_log(tenant_id);

-- RLS: tenants can only read their own transfer logs
alter table member_transfer_log enable row level security;

drop policy if exists "tenant_isolation_member_transfer_log" on member_transfer_log;

create policy "tenant_isolation_member_transfer_log"
  on member_transfer_log
  for all
  using (
    tenant_id in (
      select tenant_id from users where id = auth.uid()
    )
  );
