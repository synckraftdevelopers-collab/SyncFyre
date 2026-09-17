begin;

-- A membership plan can now be marked as a "couple" plan. When staff sell a
-- couple plan they pick two members; both get their own subscription row on
-- the same plan with the same start date, so the existing
-- set_subscription_dates() trigger (0022) derives an identical end_date for
-- both automatically.
alter table public.membership_plans
  add column if not exists plan_type text not null default 'individual'
    check (plan_type in ('individual', 'couple'));

comment on column public.membership_plans.plan_type is
  'individual: one member per subscription. couple: the sale flow requires selecting two members, who each get a subscription on this plan with a matching start/end date.';

-- Points a couple-plan subscription at its partner's subscription row so the
-- pair can be displayed and reasoned about together. Null for individual
-- plans and for couple subscriptions created before this migration.
alter table public.subscriptions
  add column if not exists linked_subscription_id uuid references public.subscriptions(id) on delete set null;

comment on column public.subscriptions.linked_subscription_id is
  'For a couple-plan sale, points at the partner member''s subscription created alongside this one. Null for individual plans.';

create index if not exists subscriptions_linked_subscription_id_idx
  on public.subscriptions (linked_subscription_id);

commit;
