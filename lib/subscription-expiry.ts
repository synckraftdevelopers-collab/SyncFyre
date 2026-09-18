/**
 * subscription-expiry.ts
 *
 * The single, canonical, date-aware "is this subscription expired right
 * now" check, used by every expired-subscription query in the app:
 *   - app/(admin)/admin/subscriptions/page.tsx (the Expired status filter)
 *   - services/member-extended.service.ts (listMembersRich's sub_status
 *     filter, powering both /admin/members and /reception/members, via
 *     member_register_view)
 *   - app/(admin)/admin/members/page.tsx (the Expired filter badge count)
 *   - services/dashboard.service.ts (the expiredMemberships KPI)
 *
 * Root cause this exists to fix: a subscription's stored status column
 * (subscriptions.status, and member_register_view.subscription_status, which
 * is sourced from it) is only ever written at invoice/payment/renewal time —
 * nothing revisits it just because end_date has since passed. So a
 * subscription can sit at status='active' with end_date weeks in the past
 * and never show up anywhere that filters strictly on status='expired'.
 * See docs/MEMBER_EXPIRY_REALTIME_IMPLEMENTATION.md for the full write-up.
 *
 * This file has no imports (unlike lib/member-expiry.ts, which imports
 * lib/time.ts via the "@/" path alias) so it can be unit-tested directly
 * with this project's plain `node --experimental-strip-types --test` runner
 * — the same pattern already used by lib/membership-dates.ts and
 * lib/finance/*.ts. It is re-exported from lib/member-expiry.ts for callers.
 */

/**
 * Deliberately narrow: only a stored status of 'expired', OR 'active' with a
 * past end date, counts as expired. paused/pending/cancelled are left
 * exactly as they already behave — this is not a redefinition of what
 * "expired" means for every status, only a fix for the specific
 * active-but-date-expired gap the audit found.
 */
export function isExpiredByDate(
  status: string | null | undefined,
  endDate: string | null | undefined,
  todayDateKey: string
): boolean {
  if (status === "expired") return true;
  if (status === "active" && !!endDate && endDate < todayDateKey) return true;
  return false;
}

/**
 * Builds a PostgREST `.or()` filter expression matching isExpiredByDate()'s
 * logic, for direct use with the Supabase query builder, e.g.:
 *   query.or(buildExpiredOrFilter("status", "end_date", todayKey))
 * Column names are parameterized because the same logic applies to both
 * `subscriptions` (status/end_date) and `member_register_view`
 * (subscription_status/subscription_end).
 */
export function buildExpiredOrFilter(
  statusColumn: string,
  endDateColumn: string,
  todayDateKey: string
): string {
  return `${statusColumn}.eq.expired,and(${statusColumn}.eq.active,${endDateColumn}.lt.${todayDateKey})`;
}
