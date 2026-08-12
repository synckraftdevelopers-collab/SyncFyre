-- Migration: 0006_members_talwalkar_fields
-- Adds health-screening columns from Talwalkar gym records
-- and relaxes phone NOT NULL so legacy members without phones can be stored.
begin;

alter table public.members
  add column if not exists consent_name     text,
  add column if not exists consent_relation text,
  add column if not exists consent_phone    text,
  add column if not exists screening_date   date,
  add column if not exists valid_until      date;

alter table public.members alter column phone drop not null;

commit;
