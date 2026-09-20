-- 0056_membership_plan_change.sql
-- 13-prompt sprint, Prompt 4: Membership Plan Change (no proration).
--
-- Adds 'plan_changed' to subscription_history.action's check constraint so
-- both the ended old subscription's history row and the newly-sold
-- subscription's creation history row can be tagged consistently, instead
-- of reading as an unrelated cancel + create pair.
--
-- Also closes a pre-existing gap: update_subscription_with_history() (the
-- RPC behind updateSubscriptionWithHistory, see 0003_workflow_integrity.sql)
-- has an `else 'updated'` fallback for when no more specific action
-- applies, but 'updated' was never added to this constraint — any call that
-- fell into that branch would fail with a constraint violation. Added here
-- regardless of whether this feature exercises that branch.
--
-- Previous constraint (from 0001_initial_schema.sql):
--   CHECK (action = ANY (ARRAY['created','renewed','extended','paused','resumed','cancelled','expired']))

alter table public.subscription_history
  drop constraint if exists subscription_history_action_check;

alter table public.subscription_history
  add constraint subscription_history_action_check
  check (action = ANY (ARRAY[
    'created'::text,
    'renewed'::text,
    'extended'::text,
    'paused'::text,
    'resumed'::text,
    'cancelled'::text,
    'expired'::text,
    'plan_changed'::text,
    'updated'::text
  ]));
