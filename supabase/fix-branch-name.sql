-- ============================================================
-- Fix branch name: SyncTyre → SyncFyre
-- Run this once in the Supabase SQL editor to rename the branch
-- ============================================================

UPDATE public.branches
SET name = REPLACE(name, 'SyncTyre', 'SyncFyre')
WHERE name ILIKE '%SyncTyre%';

-- Also fix any bank account names, income categories, or settings
-- that may have been seeded with the old name

UPDATE public.bank_accounts
SET account_name = REPLACE(account_name, 'SyncTyre', 'SyncFyre')
WHERE account_name ILIKE '%SyncTyre%';

UPDATE public.income
SET description = REPLACE(description, 'SyncTyre', 'SyncFyre')
WHERE description ILIKE '%SyncTyre%';

-- Confirm what was changed
SELECT 'branches' AS table_name, id, name AS updated_value
FROM public.branches
WHERE name ILIKE '%SyncFyre%'
UNION ALL
SELECT 'bank_accounts', id, account_name
FROM public.bank_accounts
WHERE account_name ILIKE '%SyncFyre%';
