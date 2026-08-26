alter table public.members
  add column if not exists age integer check (age >= 0 and age <= 130),
  add column if not exists candidate_consent_name text,
  add column if not exists relationship_to_candidate text,
  add column if not exists screening_date date,
  add column if not exists screening_valid_until date,
  add constraint members_screening_validity_check check (screening_valid_until is null or screening_date is null or screening_valid_until >= screening_date);
