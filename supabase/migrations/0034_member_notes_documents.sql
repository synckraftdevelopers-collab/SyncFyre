begin;

create table if not exists public.member_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.member_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete cascade,
  file_name text not null check (char_length(trim(file_name)) between 1 and 255),
  storage_path text not null unique,
  content_type text not null,
  file_size_bytes integer not null check (file_size_bytes > 0 and file_size_bytes <= 10485760),
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists member_notes_member_created_idx on public.member_notes(tenant_id, member_id, created_at desc);
create index if not exists member_documents_member_created_idx on public.member_documents(tenant_id, member_id, created_at desc);

alter table public.member_notes enable row level security;
alter table public.member_documents enable row level security;

create policy "tenant users read member notes" on public.member_notes for select using (tenant_id = public.current_tenant_id());
create policy "tenant users create member notes" on public.member_notes for insert with check (tenant_id = public.current_tenant_id());
create policy "tenant users read member documents" on public.member_documents for select using (tenant_id = public.current_tenant_id());
create policy "tenant users create member documents" on public.member_documents for insert with check (tenant_id = public.current_tenant_id());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-documents', 'member-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "tenant users read member document objects" on storage.objects for select using (
  bucket_id = 'member-documents' and (storage.foldername(name))[1] = public.current_tenant_id()::text
);
create policy "tenant users add member document objects" on storage.objects for insert with check (
  bucket_id = 'member-documents' and (storage.foldername(name))[1] = public.current_tenant_id()::text
);

commit;