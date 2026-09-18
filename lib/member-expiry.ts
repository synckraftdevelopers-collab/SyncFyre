import { getLocalDateKey } from "@/lib/time";

export const EXPIRY_QUICK_FILTERS = [
  { days: 0, label: "Today" },
  { days: 2, label: "Within 2 days" },
  { days: 8, label: "Within 8 days" },
  { days: 15, label: "Within 15 days" },
  { days: 60, label: "Within 60 days" },
  { days: 365, label: "Within 1 year" },
] as const;

/** Date-only ranges for subscriptions, evaluated in the gym timezone. */
export function getExpiryDateRange(days: number, timeZone: string, now = new Date()) {
  const from = getLocalDateKey(now, timeZone);
  const through = new Date(`${from}T00:00:00.000Z`);
  through.setUTCDate(through.getUTCDate() + days);
  return { from, to: through.toISOString().slice(0, 10) };
}

export function getExpiringWithinDays(value?: string) {
  if (value === undefined) return undefined;
  const days = Number(value);
  return Number.isInteger(days) && days >= 0 && days <= 3650 ? days : undefined;
}

// Real-time "is this expired right now" check + the PostgREST filter builder
// built on it. Kept in a separate, dependency-free module
// (lib/subscription-expiry.ts) so it can be unit-tested directly with this
// project's plain `node --test` runner, the same way lib/membership-dates.ts
// and lib/finance/*.ts already are — re-exported here so every existing
// caller of lib/member-expiry.ts keeps working unchanged.
export { isExpiredByDate, buildExpiredOrFilter } from "./subscription-expiry";
