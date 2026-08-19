alter table public.face_machine_settings
  add column if not exists provider text not null default 'generic'
    check (provider in ('generic', 'essl')),
  add column if not exists manufacturer text,
  add column if not exists model text,
  add column if not exists serial_number text,
  add column if not exists device_identifier text,
  add column if not exists connection_mode text not null default 'push'
    check (connection_mode in ('push', 'pull', 'adms', 'unknown')),
  add column if not exists last_seen_at timestamptz,
  add column if not exists allowed_ip inet;

alter table public.attendance_sync_logs
  add column if not exists provider text not null default 'generic'
    check (provider in ('generic', 'essl')),
  add column if not exists verification_method text not null default 'unknown'
    check (verification_method in ('face', 'fingerprint', 'card', 'password', 'unknown')),
  add column if not exists processing_result text not null default 'PROCESSING_ERROR'
    check (
      processing_result in (
        'SUCCESS',
        'MEMBER_NOT_FOUND',
        'MEMBER_INACTIVE',
        'MEMBERSHIP_EXPIRED',
        'MEMBERSHIP_FROZEN',
        'WRONG_BRANCH',
        'DUPLICATE_EVENT',
        'DEVICE_NOT_REGISTERED',
        'INVALID_PAYLOAD',
        'PROCESSING_ERROR'
      )
    ),
  add column if not exists request_metadata jsonb not null default '{}'::jsonb,
  add column if not exists normalized_payload jsonb,
  add column if not exists event_received_at timestamptz not null default now(),
  add column if not exists duplicate_of_id uuid references public.attendance_sync_logs(id) on delete set null,
  add column if not exists member_id uuid references public.members(id) on delete set null;

create index if not exists face_machine_provider_idx
  on public.face_machine_settings (branch_id, provider, status);

create index if not exists face_machine_serial_idx
  on public.face_machine_settings (serial_number)
  where serial_number is not null;

create index if not exists attendance_sync_logs_processing_result_idx
  on public.attendance_sync_logs (branch_id, processing_result, event_at desc);

create index if not exists attendance_sync_logs_duplicate_lookup_idx
  on public.attendance_sync_logs (device_id, machine_user_id, event_type, event_at desc);

update public.members
set machine_user_id = member_code
where machine_user_id is null or btrim(machine_user_id) = '';

update public.face_machine_settings
set provider = 'generic'
where provider is null;

update public.attendance_sync_logs
set provider = 'generic'
where provider is null;
