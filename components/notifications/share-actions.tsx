"use client";

import { useState } from "react";
import { ExternalLink, Instagram, MessageCircle, MessageSquareText, Phone, Share2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ShareActionsProps = {
  memberName: string;
  phone: string | null;
  message: string;
};

function normalizeIndianPhone(phone: string | null) {
  if (!phone) return null;
  const raw = phone.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  if (digits.length >= 10) {
    const lastTen = digits.slice(-10);
    return `91${lastTen}`;
  }
  return digits;
}

export function ShareActions({ memberName, phone, message }: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const encoded = encodeURIComponent(message);
  const normalizedPhone = normalizeIndianPhone(phone);
  const actionPhone = normalizedPhone ?? phone?.trim() ?? "";
  const hasPhone = actionPhone.length > 0;

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function openLink(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const enabledClassName = buttonVariants({ variant: "outline", size: "sm" });
  const disabledClassName = cn(enabledClassName, "pointer-events-none opacity-50");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Share</span>
      {hasPhone ? (
        <a
          href={`https://wa.me/${actionPhone}?text=${encoded}`}
          target="_blank"
          rel="noreferrer"
          className={enabledClassName}
        >
          <MessageCircle className="size-3.5" />
          WhatsApp
        </a>
      ) : (
        <button type="button" disabled aria-disabled="true" title="Phone number not available" className={disabledClassName}>
          <MessageCircle className="size-3.5" />
          WhatsApp
        </button>
      )}
      {hasPhone ? (
        <a href={`sms:+${actionPhone}?body=${encoded}`} className={enabledClassName}>
          <MessageSquareText className="size-3.5" />
          SMS
        </a>
      ) : (
        <button type="button" disabled aria-disabled="true" title="Phone number not available" className={disabledClassName}>
          <MessageSquareText className="size-3.5" />
          SMS
        </button>
      )}
      {hasPhone ? (
        <a href={`tel:+${actionPhone}`} className={enabledClassName}>
          <Phone className="size-3.5" />
          Call
        </a>
      ) : (
        <button type="button" disabled aria-disabled="true" title="Phone number not available" className={disabledClassName}>
          <Phone className="size-3.5" />
          Call
        </button>
      )}
      <button
        type="button"
        onClick={() => openLink(`https://www.facebook.com/sharer/sharer.php?quote=${encoded}`)}
        className={enabledClassName}
      >
        <Share2 className="size-3.5" />
        Facebook
      </button>
      <button
        type="button"
        onClick={async () => {
          await copyMessage();
          openLink("https://www.instagram.com/direct/inbox/");
        }}
        className={enabledClassName}
      >
        <Instagram className="size-3.5" />
        Instagram
      </button>
      <button type="button" onClick={copyMessage} className={enabledClassName}>
        <ExternalLink className="size-3.5" />
        {copied ? "Copied" : `Copy msg for ${memberName.split(" ")[0] ?? "member"}`}
      </button>
    </div>
  );
}
