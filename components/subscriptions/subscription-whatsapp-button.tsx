"use client";

/**
 * Thin client wrapper that puts the existing QuickSendWhatsAppButton
 * on the Subscriptions list page (a Server Component).
 *
 * Uses the existing modal + logWhatsAppSendAction + Communication History
 * pipeline — no new sending/logging system.
 */

import { QuickSendWhatsAppButton } from "@/components/whatsapp/quick-send-whatsapp-button";

interface Props {
  memberName: string;
  memberPhone: string | null;
  memberId: string | null;
  gymName: string | null;
  defaultMessage: string;
}

export function SubscriptionWhatsAppButton({
  memberName,
  memberPhone,
  memberId,
  gymName,
  defaultMessage,
}: Props) {
  return (
    <QuickSendWhatsAppButton
      recipientName={memberName}
      recipientPhone={memberPhone}
      gymName={gymName}
      memberId={memberId}
      defaultMessage={defaultMessage}
      variant="full"
      className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
    />
  );
}
