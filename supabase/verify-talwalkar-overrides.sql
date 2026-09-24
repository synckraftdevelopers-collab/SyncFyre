-- Verification: confirm the three Talwalkar tenant_features overrides
SELECT feature_key, enabled, updated_at
FROM public.tenant_features
WHERE tenant_id = '11111111-0001-0000-0000-000000000001'
ORDER BY feature_key;

-- Confirm Talwalkar plan/status unchanged
SELECT id, name, slug, plan, status
FROM public.tenants
WHERE id = '11111111-0001-0000-0000-000000000001';

-- Confirm business data counts unchanged
SELECT
  (SELECT count(*) FROM public.members       WHERE branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8') AS members,
  (SELECT count(*) FROM public.subscriptions WHERE branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8') AS subscriptions,
  (SELECT count(*) FROM public.payments      WHERE branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8') AS payments,
  (SELECT count(*) FROM public.attendance    WHERE branch_id = '6a2a77a6-5f5b-4816-bfe2-590d61437af8') AS attendance;
