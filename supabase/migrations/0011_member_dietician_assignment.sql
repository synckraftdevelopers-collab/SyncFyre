begin;

alter table public.members
  add column if not exists assigned_dietician_id uuid references public.trainers(id) on delete set null;

create index if not exists members_assigned_dietician_idx
  on public.members (assigned_dietician_id)
  where assigned_dietician_id is not null;

commit;
