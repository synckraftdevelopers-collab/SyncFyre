$token = $env:SUPABASE_ACCESS_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
    throw "Set SUPABASE_ACCESS_TOKEN before running this script."
}
$url = "https://api.supabase.com/v1/projects/siycjpmsujcxkvdsfcvq/database/query"
$h = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

$sql = @"
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
  unique (tenant_id, field_key)
);

create index if not exists mfc_tenant_order_idx
  on public.member_form_configurations (tenant_id, display_order, field_key);

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at' and tgrelid = 'public.member_form_configurations'::regclass
  ) then
    create trigger set_updated_at before update on public.member_form_configurations
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.member_form_configurations enable row level security;

drop policy if exists mfc_read on public.member_form_configurations;
create policy mfc_read on public.member_form_configurations
for select to authenticated
using (tenant_id = (select tenant_id from public.users where id = auth.uid()));

drop policy if exists mfc_write on public.member_form_configurations;
create policy mfc_write on public.member_form_configurations
for all to authenticated
using (
  tenant_id = (select tenant_id from public.users where id = auth.uid())
  and (select r.slug from public.users u join public.roles r on r.id = u.role_id where u.id = auth.uid()) in ('owner','admin','manager')
)
with check (
  tenant_id = (select tenant_id from public.users where id = auth.uid())
  and (select r.slug from public.users u join public.roles r on r.id = u.role_id where u.id = auth.uid()) in ('owner','admin','manager')
);
"@

$b = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json @{ query = $sql }))
$r = Invoke-RestMethod -Uri $url -Method POST -Headers $h -Body $b
Write-Host "Result:"
$r | ConvertTo-Json -Depth 4

# Verify
$vb = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json @{ query = "select count(*) as exists from information_schema.tables where table_schema='public' and table_name='member_form_configurations'" }))
$vr = Invoke-RestMethod -Uri $url -Method POST -Headers $h -Body $vb
Write-Host "Table exists check:"
$vr | ConvertTo-Json -Depth 3
