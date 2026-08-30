export type NotificationPortal = "admin" | "reception" | "trainer" | "member";

type NotificationDestinationInput = {
  type?: string | null;
  memberId?: string | null;
  metadata?: Record<string, unknown> | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuid(value: unknown) {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

export function notificationDestination(input: NotificationDestinationInput, portal: NotificationPortal, notificationsHref: string) {
  const metadata = input.metadata ?? {};
  const entityType = typeof metadata.entity_type === "string" ? metadata.entity_type : input.type ?? "";
  const entityId = uuid(metadata.entity_id);
  const memberId = uuid(input.memberId) ?? (entityType === "member" ? entityId : null);

  if (entityType === "member" && memberId) {
    if (portal === "admin") return `/admin/members/${memberId}`;
    if (portal === "reception") return `/reception/members/${memberId}`;
  }

  if (["subscription", "membership", "membership_created", "membership_renewed", "membership_expired", "membership_expiring_today", "membership_expiry_reminder", "membership_renewal_reminder"].includes(entityType)) {
    if (portal === "admin") return memberId ? `/admin/members/${memberId}?tab=memberships` : "/admin/subscriptions";
    if (portal === "reception" && memberId) return `/reception/members/${memberId}?tab=memberships`;
  }

  if (["payment", "invoice", "pending_balance", "payment_pending", "payment_received", "payment_failed"].includes(entityType)) {
    if (portal === "admin") return "/admin/payments";
    if (portal === "reception") return "/reception/payments";
  }

  if (["machine", "attendance", "machine_connected", "machine_disconnected"].includes(entityType)) {
    if (portal === "admin") return "/admin/settings?tab=biometric";
    if (portal === "reception") return "/reception/attendance";
    if (portal === "member") return "/member/attendance";
  }

  if (["finance", "expense", "income", "invoice", "receivable"].includes(entityType) && portal === "admin") return "/admin/finance";

  return notificationsHref;
}
