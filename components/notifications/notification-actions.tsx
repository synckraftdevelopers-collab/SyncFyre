"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle, RotateCcw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import {
  buildNotificationShareMessage,
  getNotificationCategoryLabel,
  isExpiryNotification,
  isPendingBalanceNotification,
  shareNotificationMessage,
  type MemberNotificationLike,
} from "@/lib/notifications/member-notification";
import type { NotificationPortal } from "@/lib/notifications/destination";
import { cn } from "@/lib/utils";

type NotificationActionProps = {
  notification: MemberNotificationLike;
  portal: NotificationPortal;
  compact?: boolean;
};

function getRenewHref(notification: MemberNotificationLike, portal: NotificationPortal) {
  if (!notification.member_id) return null;
  if (portal === "admin") return `/admin/members/${notification.member_id}?tab=membership&renew=1`;
  if (portal === "reception") return `/reception/members/${notification.member_id}?tab=membership&renew=1`;
  return null;
}

function normalizeWhatsAppPhone(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("91") ? digits : `91${digits.slice(-10)}`;
}

function buildWhatsAppHref(phone: string | null | undefined, message: string) {
  const number = normalizeWhatsAppPhone(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function NotificationActions({ notification, portal, compact = false }: NotificationActionProps) {
  const [busy, setBusy] = useState(false);
  const category = getNotificationCategoryLabel(notification);
  if (!category) return null;
  const renewHref = getRenewHref(notification, portal);
  const whatsappHref = buildWhatsAppHref(notification.members?.phone, buildNotificationShareMessage(notification));

  const buttonClassName = buttonVariants({ variant: "outline", size: "sm" });
  const spacingClassName = compact ? "mt-3" : "mt-4";

  async function handleShare() {
    setBusy(true);
    try {
      const result = await shareNotificationMessage(notification.title, buildNotificationShareMessage(notification));
      toast.success(result === "shared" ? "Share sheet opened." : "Message copied to clipboard.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to share this notification.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn(spacingClassName, "flex flex-wrap gap-2")}>
      {isExpiryNotification(notification) && renewHref ? (
        <Link href={renewHref} className={buttonClassName}>
          <RotateCcw className="size-3.5" />
          Renew
        </Link>
      ) : null}
      {isExpiryNotification(notification) || isPendingBalanceNotification(notification) ? (
        <button type="button" onClick={() => void handleShare()} disabled={busy} className={buttonClassName}>
          <Share2 className="size-3.5" />
          {busy ? "Sharing..." : "Share"}
        </button>
      ) : null}
      {whatsappHref ? (
        <a href={whatsappHref} target="_blank" rel="noreferrer" className={buttonClassName}>
          <MessageCircle className="size-3.5" />
          WhatsApp
        </a>
      ) : null}
    </div>
  );
}
