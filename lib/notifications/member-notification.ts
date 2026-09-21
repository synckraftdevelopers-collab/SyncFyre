import { differenceInCalendarDays, format, parseISO } from "date-fns";

export type NotificationMetadata = Record<string, unknown> | null;

export type MemberNotificationLike = {
  id: string;
  type: string;
  title: string;
  message: string;
  member_id: string | null;
  metadata: NotificationMetadata;
  members?: { full_name: string | null; phone: string | null; member_code: string | null } | null;
  branches?: { name: string | null } | null;
};

type ShareResult = "shared" | "copied";

const INDIAN_CURRENCY = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function readString(metadata: NotificationMetadata, key: string) {
  if (!metadata || typeof metadata !== "object") return null;
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(metadata: NotificationMetadata, key: string) {
  if (!metadata || typeof metadata !== "object") return null;
  const value = metadata[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getGreetingName(memberName: string) {
  const firstName = memberName.trim().split(/\s+/)[0]?.trim();
  return firstName || memberName || "Member";
}

export function getNotificationExpiryDate(notification: MemberNotificationLike) {
  return readString(notification.metadata, "expiry_date");
}

export function getNotificationPendingBalance(notification: MemberNotificationLike) {
  return readNumber(notification.metadata, "outstanding_balance")
    ?? readNumber(notification.metadata, "pending_amount")
    ?? readNumber(notification.metadata, "balance_amount")
    ?? null;
}

export function getNotificationGymName(notification: MemberNotificationLike) {
  return readString(notification.metadata, "gym_name")
    ?? notification.branches?.name
    ?? "SyncFyre Gym";
}

export function getNotificationMemberName(notification: MemberNotificationLike) {
  return notification.members?.full_name?.trim()
    || readString(notification.metadata, "member_name")
    || "Member";
}

export function getNotificationMemberCode(notification: MemberNotificationLike) {
  return notification.members?.member_code?.trim()
    || readString(notification.metadata, "member_code");
}

export function getNotificationDaysRemaining(notification: MemberNotificationLike, now = new Date()) {
  const expiryDate = getNotificationExpiryDate(notification);
  if (!expiryDate) return null;
  try {
    return differenceInCalendarDays(parseISO(expiryDate), now);
  } catch {
    return null;
  }
}

export function getNotificationDisplayDetail(notification: MemberNotificationLike) {
  if (isExpiryNotification(notification)) {
    const expiryDate = getNotificationExpiryDate(notification);
    if (notification.type === "membership_expired") {
      if (!expiryDate) return null;
      let formattedExpiry = expiryDate;
      try { formattedExpiry = format(parseISO(expiryDate), "dd MMM yyyy"); } catch {}
      return `Expired on: ${formattedExpiry}`;
    }
    const daysRemaining = getNotificationDaysRemaining(notification);
    if (!expiryDate || daysRemaining == null) return null;
    let formattedExpiry = expiryDate;
    try { formattedExpiry = format(parseISO(expiryDate), "dd MMM yyyy"); } catch {}
    if (daysRemaining === 0) return `Expiry: ${formattedExpiry} | Expires today`;
    const dayLabel = daysRemaining === 1 ? "1 day remaining" : `${daysRemaining} days remaining`;
    return `Expiry: ${formattedExpiry} | ${dayLabel}`;
  }

  if (isPendingBalanceNotification(notification)) {
    const pendingBalance = getNotificationPendingBalance(notification);
    if (pendingBalance == null) return null;
    return `Pending: ${INDIAN_CURRENCY.format(pendingBalance)}`;
  }

  return null;
}

export function isExpiryNotification(notification: MemberNotificationLike) {
  return (
    notification.type === "membership_expiry_reminder" ||
    notification.type === "membership_expiring_today" ||
    notification.type === "membership_expired"
  );
}

export function isPendingBalanceNotification(notification: MemberNotificationLike) {
  return notification.type === "pending_balance" || notification.type === "payment_pending";
}

export function shouldDisplayNotification(notification: MemberNotificationLike) {
  // membership_expiry_reminder: only show while days remaining is 1–10
  if (notification.type === "membership_expiry_reminder") {
    const daysRemaining = getNotificationDaysRemaining(notification);
    return daysRemaining != null && daysRemaining >= 1 && daysRemaining <= 10;
  }

  // membership_expiring_today: always show (it IS today)
  if (notification.type === "membership_expiring_today") return true;

  // membership_expired: always show
  if (notification.type === "membership_expired") return true;

  // pending_balance / payment_pending: only if balance > 0
  if (notification.type === "pending_balance" || notification.type === "payment_pending") {
    return (getNotificationPendingBalance(notification) ?? 1) > 0;
  }

  // attendance_recorded: always show (rate-limited by DB idempotency key)
  // member_created, membership_created, membership_renewed: always show
  // payment_received, payment_failed: always show
  // machine_connected, machine_disconnected: always show
  // tenant_registered: always show (super_admin only)
  return true;
}

export function getNotificationCategoryLabel(notification: MemberNotificationLike) {
  if (isExpiryNotification(notification)) {
    if (notification.type === "membership_expired") return "Membership Expired";
    if (notification.type === "membership_expiring_today") return "Expiring Today";
    return "Membership Expiry";
  }
  if (isPendingBalanceNotification(notification)) return "Pending Balance";
  if (notification.type === "payment_received") return "Payment Received";
  if (notification.type === "payment_failed") return "Payment Failed";
  if (notification.type === "member_created") return "New Member";
  if (notification.type === "membership_created" || notification.type === "membership_renewed") return "Membership";
  if (notification.type === "attendance_recorded") return "Attendance";
  if (notification.type === "member_inactivity_alert") return "Inactive Member";
  if (notification.type === "pt_sessions_low") return "Low PT Sessions";
  if (notification.type === "machine_connected" || notification.type === "machine_disconnected") return "Device";
  return null;
}

export function buildNotificationShareMessage(notification: MemberNotificationLike) {
  const memberName = getNotificationMemberName(notification);
  const greetingName = getGreetingName(memberName);
  const memberCode = getNotificationMemberCode(notification);
  const gymName = getNotificationGymName(notification);

  if (isExpiryNotification(notification)) {
    const expiryDate = getNotificationExpiryDate(notification);
    const daysRemaining = getNotificationDaysRemaining(notification);
    let formattedExpiry = expiryDate ?? "Unknown";
    if (expiryDate) {
      try {
        formattedExpiry = format(parseISO(expiryDate), "dd MMM yyyy");
      } catch {}
    }
    const dayLabel = daysRemaining === 1 ? "1 day" : `${daysRemaining ?? 0} days`;

    return [
      `Hello ${greetingName},`,
      "",
      "Your gym membership is expiring soon.",
      "",
      `Member Code: ${memberCode ?? "-"}`,
      `Expiry Date: ${formattedExpiry}`,
      `Days Remaining: ${dayLabel}`,
      "",
      "Please renew your membership to continue your access.",
      "",
      "Regards,",
      gymName,
    ].join("\n");
  }

  if (isPendingBalanceNotification(notification)) {
    const pendingBalance = getNotificationPendingBalance(notification) ?? 0;
    return [
      `Hello ${greetingName},`,
      "",
      "You have a pending balance for your gym membership.",
      "",
      `Member Code: ${memberCode ?? "-"}`,
      `Pending Balance: ${INDIAN_CURRENCY.format(pendingBalance)}`,
      "",
      "Please clear the pending amount at your earliest convenience.",
      "",
      "Regards,",
      gymName,
    ].join("\n");
  }

  return notification.message;
}

export async function shareNotificationMessage(title: string, message: string): Promise<ShareResult> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    await navigator.share({ title, text: message });
    return "shared";
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(message);
    return "copied";
  }

  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.value = message;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  return "copied";
}
