/** Notification types backed by a real database event or scheduled business reminder. */
export const BUSINESS_NOTIFICATION_TYPES = [
  "membership_expiry_reminder",
  "pending_balance",
] as const;

export type BusinessNotificationType = (typeof BUSINESS_NOTIFICATION_TYPES)[number];

export function isBusinessNotificationType(value: unknown): value is BusinessNotificationType {
  return typeof value === "string" && (BUSINESS_NOTIFICATION_TYPES as readonly string[]).includes(value);
}

