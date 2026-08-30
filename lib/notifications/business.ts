/** Notification types backed by a real database event or scheduled business reminder. */
export const BUSINESS_NOTIFICATION_TYPES = [
  "member_created",
  "membership_created",
  "membership_renewed",
  "membership_expired",
  "membership_expiring_today",
  "membership_expiry_reminder",
  "membership_renewal_reminder",
  "pending_balance",
  "payment_pending",
  "payment_received",
  "payment_failed",
  "machine_connected",
  "machine_disconnected",
  "attendance_recorded",
  "tenant_registered",
] as const;

export type BusinessNotificationType = (typeof BUSINESS_NOTIFICATION_TYPES)[number];

export function isBusinessNotificationType(value: unknown): value is BusinessNotificationType {
  return typeof value === "string" && (BUSINESS_NOTIFICATION_TYPES as readonly string[]).includes(value);
}

