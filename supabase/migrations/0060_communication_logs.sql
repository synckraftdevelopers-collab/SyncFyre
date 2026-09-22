-- 0060_communication_logs.sql
--
-- Backs the ad-hoc "quick send WhatsApp" flow (P2-R1) and its Communication
-- History page. This app never sends WhatsApp messages itself — every send
-- is a staff member opening a pre-filled wa.me deep link in their own
-- WhatsApp app. This table only logs that a staff member did so (and with
-- what content), for the Communication History screen at
-- /admin/communications. It is deliberately separate from
-- notification_logs, which is 1:1 with the automated notifications
-- business-event table and isn't a fit for staff-initiated ad-hoc sends.
--
-- Mirrors the tenant/branch-scoped table pattern already used by
-- communication_templates (see 0025_customization_engine_foundation.sql):
-- same composite branch FK, same RLS shape (management-or-own-branch read,
-- any-staff-in-tenant write).

begin;

create table if not exists public.communication_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid,
  member_id uuid references public.members(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  channel text not null check (channel in ('whatsapp', 'sms')),
  template_key text,
  message_preview text not null,
  recipient_phone text,
  sent_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint communication_logs_branch_fk
    foreign key (tenant_id, branch_id)
    references public.branches (tenant_id, id)
    on delete cascade
);

create index if not exists communication_logs_tenant_branch_created_idx
  on public.communication_logs (tenant_id, branch_id, created_at desc);

alter table public.communication_logs enable row level security;

drop policy if exists communication_logs_read on public.communication_logs;
create policy communication_logs_read on public.communication_logs
for select to authenticated
using (
  public.is_super_admin()
  or (
    tenant_id = public.current_tenant_id()
    and (branch_id is null or public.is_management() or branch_id = public.current_branch_id())
  )
);

-- Any staff member (not just management) can log a send — a reception
-- desk quick-sending a WhatsApp reminder from the member 360 view should
-- be able to write its own log row, same as member_custom_field_values_write.
drop policy if exists communication_logs_write on public.communication_logs;
create policy communication_logs_write on public.communication_logs
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
