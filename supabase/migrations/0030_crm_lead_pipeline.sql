begin;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  full_name text not null,
  phone text,
  email citext,
  source text not null default 'walk_in',
  plan_interest text,
  assigned_to uuid references public.users(id) on delete set null,
  stage text not null default 'new' check (stage in ('new','contacted','follow_up','trial_scheduled','trial_completed','won','lost')),
  follow_up_at timestamptz,
  trial_at timestamptz,
  lost_reason text,
  converted_member_id uuid references public.members(id) on delete set null,
  converted_at timestamptz,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_won_requires_conversion check (stage <> 'won' or converted_member_id is not null)
);

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  activity_type text not null check (activity_type in ('created','note','call','message','follow_up','trial','stage_changed','converted','lost')),
  description text not null,
  previous_stage text,
  next_stage text,
  performed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists leads_tenant_branch_stage_idx on public.leads(tenant_id, branch_id, stage, follow_up_at);
create index if not exists leads_assigned_follow_up_idx on public.leads(assigned_to, follow_up_at) where stage not in ('won', 'lost');
create index if not exists lead_activities_lead_created_idx on public.lead_activities(lead_id, created_at desc);

create trigger set_updated_at before update on public.leads for each row execute function public.set_updated_at();

alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;

create policy "tenant users manage leads" on public.leads for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());
create policy "tenant users manage lead activities" on public.lead_activities for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());

commit;