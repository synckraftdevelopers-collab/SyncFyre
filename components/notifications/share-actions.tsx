"use client";

import { useState } from "react";
import { ExternalLink, Instagram, MessageCircle, MessageSquareText, Phone, Share2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Share</span>
      <a
        href={actionPhone ? `https://wa.me/${actionPhone}?text=${encoded}` : "#"}
        target="_blank"
        rel="noreferrer"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <MessageCircle className="size-3.5" />
        WhatsApp
      </a>
      <a
        href={actionPhone ? `sms:+${actionPhone}?body=${encoded}` : "#"}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <MessageSquareText className="size-3.5" />
        SMS
      </a>
      <a
        href={actionPhone ? `tel:+${actionPhone}` : "#"}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <Phone className="size-3.5" />
        Call
      </a>
      <button
        type="button"
        onClick={() => openLink(`https://www.facebook.com/sharer/sharer.php?quote=${encoded}`)}
        className={buttonVariants({ variant: "outline", size: "sm" })}
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
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <Instagram className="size-3.5" />
        Instagram
      </button>
      <button type="button" onClick={copyMessage} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <ExternalLink className="size-3.5" />
        {copied ? "Copied" : `Copy msg for ${memberName.split(" ")[0] ?? "member"}`}
      </button>
    </div>
  );
}
