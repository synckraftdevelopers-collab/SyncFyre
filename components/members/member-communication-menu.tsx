"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Phone, Share2, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  generateMembershipMessage,
  buildWhatsAppUrl,
  buildSmsUrl,
  buildCallUrl,
  type MemberMessageInput,
} from "@/lib/member-messages";

interface MemberCommunicationMenuProps extends MemberMessageInput {
  phone?: string | null;
  /** Button variant: 'icon' shows just the share icon, 'full' shows label too */
  variant?: "icon" | "full";
  className?: string;
}

export function MemberCommunicationMenu({
  phone,
  variant = "icon",
  className = "",
  ...messageInput
}: MemberCommunicationMenuProps) {
  const [open, setOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editedMessage, setEditedMessage] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); setShowPreview(false); }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function openPreview() {
    const msg = generateMembershipMessage(messageInput);
    setEditedMessage(msg);
    setShowPreview(true);
  }

  const callUrl = buildCallUrl(phone);
  const hasPhone = Boolean(phone?.replace(/\D/g, ""));

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Share member"
        aria-expanded={open}
        className={
          variant === "full"
            ? "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            : "flex size-9 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        }
      >
        <Share2 className="size-4" />
        {variant === "full" && <span>Share</span>}
      </button>

      {/* ── Main share menu ──────────────────────────────────────── */}
      {open && !showPreview && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-2xl border bg-background shadow-[0_8px_30px_rgba(0,0,0,.12)] overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <p className="text-sm font-semibold">Share</p>
            <button onClick={() => setOpen(false)} className="rounded p-0.5 hover:bg-muted">
              <X className="size-3.5" />
            </button>
          </div>

          <div className="p-1.5 space-y-0.5">
            {/* Phone */}
            {callUrl ? (
              <a
                href={callUrl}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                aria-label={`Call ${messageInput.memberName}`}
              >
                <div className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <Phone className="size-4" />
                </div>
                <div>
                  <p className="font-medium">Call</p>
                  <p className="text-xs text-muted-foreground">{phone}</p>
                </div>
              </a>
            ) : (
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm opacity-40 cursor-not-allowed">
                <div className="grid size-8 place-items-center rounded-lg bg-muted">
                  <Phone className="size-4" />
                </div>
                <p className="font-medium">No phone</p>
              </div>
            )}

            {/* SMS */}
            <button
              onClick={openPreview}
              disabled={!hasPhone}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={`Send text message to ${messageInput.memberName}`}
            >
              <div className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <MessageCircle className="size-4" />
              </div>
              <div className="text-left">
                <p className="font-medium">Text Message</p>
                <p className="text-xs text-muted-foreground">SMS with pre-written msg</p>
              </div>
            </button>

            {/* WhatsApp */}
            <button
              onClick={openPreview}
              disabled={!hasPhone}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={`Send WhatsApp to ${messageInput.memberName}`}
            >
              <div className="grid size-8 place-items-center rounded-lg bg-[#25D366]/10 text-[#25D366]">
                <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium">WhatsApp</p>
                <p className="text-xs text-muted-foreground">Pre-written message</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── Message preview + edit ───────────────────────────────── */}
      {open && showPreview && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowPreview(false); setOpen(false); }} />
          
          <div className="relative z-10 w-full max-w-md rounded-2xl border bg-background shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <div>
                <p className="font-semibold">Share with {messageInput.memberName}</p>
                <p className="text-xs text-muted-foreground">{phone ?? "No phone"}</p>
              </div>
              <button onClick={() => { setShowPreview(false); setOpen(false); }} className="rounded-lg p-1.5 hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>

            {/* Message preview + editor */}
            <div className="p-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Message preview</p>
              <textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                rows={10}
                className="w-full rounded-xl border bg-muted/40 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">You can edit the message above before sending.</p>
            </div>

            {/* Action buttons */}
            <div className="border-t px-4 py-3 grid grid-cols-3 gap-2">
              {/* Call */}
              {callUrl && (
                <a
                  href={callUrl}
                  onClick={() => { setShowPreview(false); setOpen(false); }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium hover:bg-muted transition-colors"
                  aria-label={`Call ${messageInput.memberName}`}
                >
                  <Phone className="size-5 text-blue-600" />
                  Call
                </a>
              )}

              {/* SMS */}
              {buildSmsUrl(phone, editedMessage) && (
                <a
                  href={buildSmsUrl(phone, editedMessage)!}
                  onClick={() => { setShowPreview(false); setOpen(false); }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium hover:bg-muted transition-colors"
                  aria-label={`Send text message to ${messageInput.memberName}`}
                >
                  <Send className="size-5 text-emerald-600" />
                  Text
                </a>
              )}

              {/* WhatsApp */}
              {buildWhatsAppUrl(phone, editedMessage) && (
                <a
                  href={buildWhatsAppUrl(phone, editedMessage)!}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => { setShowPreview(false); setOpen(false); }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium hover:bg-muted transition-colors"
                  aria-label={`Send WhatsApp to ${messageInput.memberName}`}
                >
                  <svg viewBox="0 0 24 24" className="size-5 text-[#25D366]" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
