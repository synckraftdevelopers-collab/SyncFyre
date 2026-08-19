/**
 * member-messages.ts
 * Single source of truth for pre-built membership communication messages.
 * Used by Share menus on cards, rows, and the membership filter popover.
 */

export type MemberMessageInput = {
  memberName: string;
  gymName: string;
  planName?: string | null;
  subscriptionStatus?: string | null;
  expiryDate?: string | null;
  dueAmount?: number | null;
  daysRemaining?: number | null;
};

export type PaymentReminderInput = {
  memberName: string;
  gymName: string;
  totalAmount: number;
  paymentCompleted: number;
  pendingAmount: number;
};

/** Format a date string to readable "DD MMM YYYY" */
function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

/** Format a number as Indian currency without ₹ symbol (for messages) */
function fmtAmt(n: number): string {
  return n.toLocaleString("en-IN");
}

/**
 * Generate the appropriate pre-built message based on membership status.
 * Returns a plain multiline string suitable for SMS, WhatsApp, and preview.
 */
export function generateMembershipMessage(input: MemberMessageInput): string {
  const {
    memberName,
    gymName,
    planName,
    subscriptionStatus,
    expiryDate,
    dueAmount,
    daysRemaining,
  } = input;

  const plan = planName ?? "membership";
  const expiry = fmtDate(expiryDate);
  const gym = gymName || "SyncFyre Gym";
  const due = dueAmount ?? 0;
  const days = daysRemaining ?? 999;

  // Overdue — both expired AND has balance
  if (due > 0 && days < 0) {
    return `Hello ${memberName},

Your ${plan} at ${gym} has expired and you have a pending balance of ₹${fmtAmt(due)}.

Expiry Date: ${expiry}
Pending Amount: ₹${fmtAmt(due)}

Please visit us at the earliest to clear your dues and renew your membership.

Thank you,
${gym}`;
  }

  // Expired (no balance due)
  if (subscriptionStatus === "expired" || days < 0) {
    return `Hello ${memberName},

Your ${plan} at ${gym} has expired.

Membership Plan: ${plan}
Expiry Date: ${expiry}

Please contact us or visit the reception to renew your membership and continue your training.

Thank you,
${gym}`;
  }

  // Pending payment
  if (subscriptionStatus === "pending" || due > 0) {
    return `Hello ${memberName},

Your membership payment is currently pending at ${gym}.

Membership Plan: ${plan}${expiryDate ? `\nExpiry Date: ${expiry}` : ""}${due > 0 ? `\nPending Amount: ₹${fmtAmt(due)}` : ""}

Please complete your payment to activate or continue your membership.

Thank you,
${gym}`;
  }

  // Expiring soon (within 7 days)
  if (days >= 0 && days <= 7) {
    return `Hello ${memberName},

Your ${plan} at ${gym} is expiring soon.

Membership Plan: ${plan}
Expiry Date: ${expiry} (${days} day${days === 1 ? "" : "s"} remaining)

Renew now to avoid a gap in your membership and continue your fitness journey.

Thank you,
${gym}`;
  }

  // Paused
  if (subscriptionStatus === "paused") {
    return `Hello ${memberName},

Your ${plan} at ${gym} is currently paused.

Membership Plan: ${plan}${expiryDate ? `\nExpiry Date: ${expiry}` : ""}

Please contact us if you would like to resume your membership.

Thank you,
${gym}`;
  }

  // Cancelled
  if (subscriptionStatus === "cancelled") {
    return `Hello ${memberName},

Your ${plan} at ${gym} is currently cancelled.

Membership Plan: ${plan}

Please contact us if you would like more information or wish to rejoin.

Thank you,
${gym}`;
  }

  // Active — general / reminder
  return `Hello ${memberName},

Your ${plan} at ${gym} is currently active.

Membership Plan: ${plan}${expiryDate ? `\nExpiry Date: ${expiry}` : ""}

Thank you for being a valued member of ${gym}. Keep up the great work!

Thank you,
${gym}`;
}

/** A factual payment reminder used wherever an outstanding invoice is shown. */
export function generatePaymentReminderMessage(input: PaymentReminderInput): string {
  const gym = input.gymName || "SyncFyre Gym";
  return `Hello ${input.memberName},

This is a payment reminder from ${gym}.

Your membership payment details are:
Total Amount: \u20B9${fmtAmt(input.totalAmount)}
Payment Completed: \u20B9${fmtAmt(input.paymentCompleted)}
Pending Amount: \u20B9${fmtAmt(input.pendingAmount)}

Please complete the pending payment at your earliest convenience.

Thank you,
${gym}`;
}
/** Build WhatsApp URL with pre-filled number + message */
export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  const cleaned = (phone ?? "").replace(/\D/g, "");
  if (!cleaned) return null;
  const number = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Build SMS URL with pre-filled number + message */
export function buildSmsUrl(phone: string | null | undefined, message: string): string | null {
  const cleaned = (phone ?? "").replace(/\D/g, "");
  if (!cleaned) return null;
  const number = cleaned.startsWith("91") ? `+${cleaned}` : `+91${cleaned}`;
  // sms: scheme - works on iOS and Android
  return `sms:${number}?body=${encodeURIComponent(message)}`;
}

/** Build tel: URL for direct call */
export function buildCallUrl(phone: string | null | undefined): string | null {
  const cleaned = (phone ?? "").replace(/\D/g, "");
  if (!cleaned) return null;
  return `tel:${cleaned}`;
}
