"use client";

/**
 * RenewalReminderButton
 *
 * Inline WhatsApp send button for the renewals page.
 * The server action is pre-bound by the parent server component and passed
 * in as a prop — this keeps secrets server-side and avoids "use server"
 * inside a client component.
 */

import { WhatsAppSendModal } from "@/components/whatsapp/whatsapp-send-modal";
import { generateMembershipMessage } from "@/lib/member-messages";
import type { WhatsAppActionResult } from "@/app/actions/whatsapp-actions";

export type RenewalReminderButtonProps = {
  memberName: string;
  phone: string | null | undefined;
  planName: string;
  expiryDate: string;
  gymName: string;
  providerConfigured: boolean;
  /** Pre-bound server action: sendRenewalReminderWhatsAppAction.bind(null, input) */
  sendAction: () => Promise<WhatsAppActionResult>;
};

export function RenewalReminderButton({
  memberName,
  phone,
  planName,
  expiryDate,
  gymName,
  providerConfigured,
  sendAction,
}: RenewalReminderButtonProps) {
  const message = generateMembershipMessage({
    memberName,
    gymName,
    planName,
    subscriptionStatus: "active",
    expiryDate,
    dueAmount: 0,
  });

  return (
    <WhatsAppSendModal
      phone={phone}
      recipientName={memberName}
      message={message}
      templateLabel="Membership Expiry Reminder"
      providerConfigured={providerConfigured}
      onSend={sendAction}
      triggerLabel="Remind"
    />
  );
}
