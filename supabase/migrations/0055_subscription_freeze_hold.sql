-- 0055_subscription_freeze_hold.sql
-- 13-prompt sprint, Prompt 2: Subscription Freeze/Hold.
--
-- Adds lightweight freeze metadata to subscriptions. A freeze reuses the
-- existing 'paused' value of the subscription_status enum and the existing
-- 'paused' / 'resumed' actions already allowed by
-- subscription_history_action_check — this migration deliberately does NOT
-- touch that enum, that check constraint, or the update_subscription_with_history
-- RPC. It only adds two nullable columns that record *why* and *until when*
-- a paused subscription is on hold, set/cleared directly by
-- app/actions/subscription-actions.ts (freezeSubscriptionAction /
-- updateSubscriptionStatusAction).

alter table public.subscriptions
  add column if not exists held_until date,
  add column if not exists hold_reason text;

comment on column public.subscriptions.held_until is
  'Freeze/hold: date the hold ends and the membership should resume. NULL when not on hold.';
comment on column public.subscriptions.hold_reason is
  'Freeze/hold: reason given for the hold (e.g. travel, injury). NULL when not on hold.';
