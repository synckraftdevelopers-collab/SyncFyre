"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { SendWhatsAppModal } from "@/components/whatsapp/send-whatsapp-modal";

export interface QuickSendWhatsAppButtonProps {
  recipientName: string;
  recipientPhone?: string | null;
  gymName?: string | null;
  memberId?: string | null;
  leadId?: string | null;
  defaultMessage?: string;
  /** 'icon' — compact circular icon button (tables/rows). 'full' — icon + label. */
  variant?: "icon" | "full";
  /** Full className override — when set, replaces the default button classes entirely
   *  (e.g. pass buttonVariants({ variant: "outline", size: "sm" }) to match a page's other buttons). */
  className?: string;
}

/** Small reusable trigger for the WhatsApp quick-send modal — member detail, leads, expiry lists. */
export function QuickSendWhatsAppButton({
  recipientName,
  recipientPhone,
  gymName,
  memberId,
  leadId,
  defaultMessage,
  variant = "icon",
  className,
}: QuickSendWhatsAppButtonProps) {
  const [open, setOpen] = useState(false);
  const hasPhone = Boolean((recipientPhone ?? "").replace(/\D/g, ""));

  const defaultClass =
    variant === "full"
      ? "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      : "inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!hasPhone}
        aria-label={`Send WhatsApp to ${recipientName}`}
        title={hasPhone ? `Send WhatsApp to ${recipientName}` : "No phone on file"}
        className={className ?? defaultClass}
      >
        <MessageCircle className="size-4 text-[#25D366]" />
        {variant === "full" ? <span>WhatsApp</span> : null}
      </button>

      {open ? (
        <SendWhatsAppModal
          recipientName={recipientName}
          recipientPhone={recipientPhone}
          gymName={gymName}
          memberId={memberId}
          leadId={leadId}
          defaultMessage={defaultMessage}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
