-- A generated secret is shown once during provisioning; only its digest is retained.
alter table public.face_machine_settings
  add column if not exists terminal_secret_hash text,
  add column if not exists terminal_secret_created_at timestamptz;

create index if not exists face_machine_terminal_secret_idx
  on public.face_machine_settings (device_id)
  where terminal_secret_hash is not null;
