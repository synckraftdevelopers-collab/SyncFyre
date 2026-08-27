create unique index if not exists notifications_metadata_fingerprint_uidx
  on public.notifications ((metadata->>'fingerprint'))
  where metadata ? 'fingerprint';
