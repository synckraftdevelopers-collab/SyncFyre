-- ============================================================
-- demo-whatsapp-seed.sql
-- WhatsApp demo templates for Demo Gym ONLY.
--
-- Demo Gym:   tenant_id = 22222222-0002-0000-0000-000000000002
-- Demo Branch: branch_id = aaaaaaaa-0000-0000-0000-000000000001
-- Talwalkar:  tenant_id = 11111111-0001-0000-0000-000000000001 (NEVER TOUCHED)
--
-- RUN IN: Supabase SQL Editor (anon/authenticated context — RLS enforced)
-- OR:     service_role context for reliability in dev
--
-- SAFETY: This script aborts if the Demo tenant ID equals Talwalkar's.
--         These are SyncFyre internal demo/simulation templates only.
--         No real WhatsApp messages are sent.
-- ============================================================

-- ── 1. Safety guard ─────────────────────────────────────────
do $$
begin
  if '22222222-0002-0000-0000-000000000002'::uuid
      = '11111111-0001-0000-0000-000000000001'::uuid
  then
    raise exception 'STOP: Demo tenant ID equals Talwalkar. Aborting to protect production data.';
  end if;
  raise notice 'Safety check passed. Inserting WhatsApp templates for Demo Gym only.';
end $$;

-- ── 2. Insert 5 WhatsApp demo templates ─────────────────────
-- Uses ON CONFLICT DO UPDATE so the script is idempotent (safe to re-run).
-- Unique key: (tenant_id, branch_id, template_key, channel)

insert into public.communication_templates
  (tenant_id, branch_id, template_key, channel, name, content, variables, is_active)
values

-- Template 1: Membership Expiry Reminder
(
  '22222222-0002-0000-0000-000000000002',
  null,                              -- tenant-level (applies to all branches)
  'membership_expiry_reminder',
  'whatsapp',
  'Membership Expiry Reminder',
  'Hi {{member_name}}, your gym membership at {{gym_name}} expires on {{expiry_date}}. Please renew your membership to continue your fitness journey without interruption. Contact us to renew today!',
  ARRAY['member_name', 'gym_name', 'expiry_date'],
  true
),

-- Template 2: Pending Payment Reminder
(
  '22222222-0002-0000-0000-000000000002',
  null,
  'pending_payment_reminder',
  'whatsapp',
  'Pending Payment Reminder',
  'Hi {{member_name}}, you have a pending gym payment of ₹{{amount}} at {{gym_name}}. Kindly complete your payment at the earliest to avoid any interruption in your membership. Thank you!',
  ARRAY['member_name', 'amount', 'gym_name'],
  true
),

-- Template 3: Membership Renewal Reminder
(
  '22222222-0002-0000-0000-000000000002',
  null,
  'membership_renewal_reminder',
  'whatsapp',
  'Membership Renewal Reminder',
  'Hi {{member_name}}, your membership at {{gym_name}} is ready for renewal! Renew today and continue your workout without any interruption. We are here to support your fitness goals.',
  ARRAY['member_name', 'gym_name'],
  true
),

-- Template 4: Welcome New Member
(
  '22222222-0002-0000-0000-000000000002',
  null,
  'welcome_new_member',
  'whatsapp',
  'Welcome New Member',
  'Welcome to {{gym_name}}, {{member_name}}! 🎉 We are thrilled to have you as a member. Let us work together to achieve your fitness goals. See you at the gym!',
  ARRAY['gym_name', 'member_name'],
  true
),

-- Template 5: Birthday / Engagement Message
(
  '22222222-0002-0000-0000-000000000002',
  null,
  'birthday_message',
  'whatsapp',
  'Birthday Greeting',
  'Happy Birthday, {{member_name}}! 🎂 Wishing you a happy, healthy, and successful year ahead. The entire {{gym_name}} team celebrates with you today. Keep up the great work!',
  ARRAY['member_name', 'gym_name'],
  true
)

on conflict (tenant_id, branch_id, template_key, channel)
  -- branch_id is null here; the unique constraint uses NULLS NOT DISTINCT
  do update set
    name       = excluded.name,
    content    = excluded.content,
    variables  = excluded.variables,
    is_active  = true,
    updated_at = now();

-- ── 3. Verify ────────────────────────────────────────────────
select
  template_key,
  name,
  channel,
  is_active,
  array_length(variables, 1) as variable_count,
  left(content, 60) || '…' as content_preview
from public.communication_templates
where tenant_id = '22222222-0002-0000-0000-000000000002'
  and channel   = 'whatsapp'
order by template_key;

-- ── 4. Confirm Talwalkar is untouched ────────────────────────
select
  count(*) as talwalkar_whatsapp_templates
from public.communication_templates
where tenant_id = '11111111-0001-0000-0000-000000000001'
  and channel   = 'whatsapp';
-- Expected: 0 (Talwalkar has no WhatsApp templates and must stay that way)
