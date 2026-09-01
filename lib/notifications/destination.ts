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
  const invoiceId = uuid(metadata.invoice_id) ?? (entityType === "invoice" ? entityId : null);

  if (entityType === "member" && memberId) {
    if (portal === "admin") return `/admin/members/${memberId}`;
    if (portal === "reception") return `/reception/members/${memberId}`;
    if (portal === "trainer") return "/trainer/members";
  }

  if (["subscription", "membership", "membership_created", "membership_renewed", "membership_expired", "membership_expiring_today", "membership_expiry_reminder", "membership_renewal_reminder"].includes(entityType)) {
    if (portal === "admin") return memberId ? `/admin/members/${memberId}?tab=memberships` : "/admin/subscriptions";
    if (portal === "reception") return memberId ? `/reception/members/${memberId}?tab=memberships` : "/reception/memberships";
    if (portal === "member") return "/member/membership";
    if (portal === "trainer") return memberId ? "/trainer/members" : notificationsHref;
  }

  if (["payment", "invoice", "pending_balance", "payment_pending", "payment_received", "payment_failed"].includes(entityType)) {
    if (portal === "admin") return invoiceId ? `/admin/invoices/${invoiceId}` : "/admin/payments";
    if (portal === "reception") return "/reception/payments";
    if (portal === "member") return "/member/notifications";
  }

  if (["attendance", "attendance_recorded"].includes(entityType)) {
    if (portal === "admin") return memberId ? `/admin/members/${memberId}` : "/admin/attendance";
    if (portal === "reception") return memberId ? `/reception/members/${memberId}` : "/reception/attendance";
    if (portal === "trainer") return "/trainer/members";
    if (portal === "member") return "/member/attendance";
  }

  if (["machine", "machine_connected", "machine_disconnected"].includes(entityType)) {
    if (portal === "admin") return "/admin/settings?tab=biometric";
    if (portal === "reception") return "/reception/attendance";
  }

  if (["finance", "expense", "income", "receivable"].includes(entityType) && portal === "admin") return "/admin/finance";

  return notificationsHref;
}
