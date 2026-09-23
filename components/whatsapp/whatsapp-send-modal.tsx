"use client";

/**
 * WhatsAppSendModal
 *
 * Provider-aware WhatsApp send modal. Used from:
 *   - Member detail (send to member)
 *   - Renewals page (send renewal reminder)
 *   - Pending payments page (send payment reminder)
 *
 * When provider is NOT configured:
 *   → Shows clear "not configured" state with a "Open WhatsApp" fallback
 *     (deep-link via wa.me) so the user can still communicate manually.
 *   → Never claims the message was "sent via API".
 *
 * When provider IS configured:
 *   → Shows Send button → calls the supplied server action.
 *   → Displays result status honestly (sent / failed).
 *
 * Android back / PWA: uses pushState pattern for back button dismissal.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X, Send, ExternalLink, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { buildWhatsAppUrl } from "@/lib/member-messages";
import type { WhatsAppActionState } from "@/app/actions/whatsapp-actions";

/** Extended result shape used by the modal — superset of WhatsAppActionState */
type ModalResult = WhatsAppActionState & {
  status?: "sent" | "failed" | "provider_not_configured" | "entitlement_denied";
  message?: string;
  providerMessageId?: string | null;
};

export type WhatsAppSendConfig = {
  /** Recipient phone (raw — the modal normalises it) */
  phone: string | null | undefined;
  /** Display name for the recipient */
  recipientName: string;
  /** Pre-resolved message to show in preview and send */
  message: string;
  /** Template name for display only (e.g. "Membership Expiry Reminder") */
  templateLabel?: string;
  /** Whether the provider is configured — passed from server */
  providerConfigured: boolean;
  /** Server action to call when Send is clicked */
  onSend: () => Promise<WhatsAppActionState>;
  /** Optional label on the trigger button */
  triggerLabel?: string;
  /** Optional custom trigger class */
  triggerClassName?: string;
};

export function WhatsAppSendModal({
  phone,
  recipientName,
  message,
  templateLabel,
  providerConfigured,
  onSend,
  triggerLabel = "WhatsApp",
  triggerClassName,
}: WhatsAppSendConfig) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ModalResult | null>(null);
  const closedViaPopState = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
    setResult(null);
  }, []);

  // PWA / Android back button — push history entry when modal opens
  useEffect(() => {
    if (!open) return;
    closedViaPopState.current = false;
    window.history.pushState({ whatsappModal: true }, "");

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handlePop() {
      closedViaPopState.current = true;
      setOpen(false);
      setResult(null);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }

    window.addEventListener("popstate", handlePop);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("popstate", handlePop);
      document.removeEventListener("keydown", handleKey);
      if (!closedViaPopState.current && window.history.state?.whatsappModal) {
        window.history.back();
      }
    };
  }, [open, closeModal]);

  const deepLinkUrl = buildWhatsAppUrl(phone, message);

  function handleSend() {
    startTransition(async () => {
      const raw = await onSend();
      // Normalise simple {error, success} into the richer ModalResult shape
      const res: ModalResult = {
        ...raw,
        status: (raw as ModalResult).status ?? (raw.error ? "failed" : raw.success ? "sent" : undefined),
        message: (raw as ModalResult).message ?? raw.error ?? raw.success,
      };
      setResult(res);
    });
  }

  const triggerBtn = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      disabled={!phone}
      title={phone ? `Send WhatsApp to ${recipientName}` : "No phone number available"}
      className={
        triggerClassName ??
        `inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50`
      }
    >
      <MessageCircle className="size-4" />
      {triggerLabel}
    </button>
  );

  if (!mounted) return triggerBtn;

  return (
    <>
      {triggerBtn}
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
              style={{ padding: "env(safe-area-inset-top, 1rem) 1rem env(safe-area-inset-bottom, 1rem) 1rem" }}
              role="dialog"
              aria-modal="true"
              aria-label="Send WhatsApp"
            >
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={closeModal}
                aria-hidden="true"
              />

              {/* Panel */}
              <div className="relative z-10 flex w-full max-w-md flex-col rounded-2xl border bg-background shadow-2xl max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem))] overflow-hidden">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="grid size-8 place-items-center rounded-lg bg-[#25D366]/10 text-[#25D366]">
                      <MessageCircle className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Send WhatsApp</p>
                      {templateLabel && (
                        <p className="text-xs text-muted-foreground">{templateLabel}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="rounded-lg p-1.5 hover:bg-muted transition-colors"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
                  {/* Recipient */}
                  <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recipient</p>
                    <p className="font-semibold">{recipientName}</p>
                    <p className="text-muted-foreground">{phone ?? "No phone number"}</p>
                  </div>

                  {/* Provider state */}
                  {!providerConfigured && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="size-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-amber-900">WhatsApp Business not configured</p>
                          <p className="mt-1 text-amber-800 text-xs">
                            Real API delivery requires a WhatsApp Business provider. You can still
                            open WhatsApp manually using the button below — your message is pre-filled.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message preview */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Message Preview
                    </p>
                    <div className="whitespace-pre-wrap rounded-xl border bg-background p-3 text-sm leading-relaxed">
                      {message}
                    </div>
                    {!providerConfigured && (
                      <p className="text-xs text-muted-foreground">
                        This message will be pre-filled when you open WhatsApp.
                        Sending it through the app requires a WhatsApp Business provider.
                      </p>
                    )}
                  </div>

                  {/* Result state */}
                  {result && (
                    <ResultBanner result={result} />
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 border-t px-5 py-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  {result ? (
                    <Button variant="outline" onClick={closeModal}>
                      Close
                    </Button>
                  ) : providerConfigured ? (
                    <>
                      <Button variant="outline" onClick={closeModal} disabled={isPending}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSend}
                        disabled={isPending || !phone}
                        className="bg-[#25D366] hover:bg-[#20c05c] text-white border-[#25D366]"
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Sending…
                          </>
                        ) : (
                          <>
                            <Send className="size-4" />
                            Send WhatsApp
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={closeModal}>
                        Cancel
                      </Button>
                      {deepLinkUrl ? (
                        <a
                          href={deepLinkUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={closeModal}
                          className={buttonVariants({
                            className:
                              "bg-[#25D366] hover:bg-[#20c05c] text-white border-[#25D366]",
                          })}
                        >
                          <ExternalLink className="size-4" />
                          Open WhatsApp
                        </a>
                      ) : (
                        <Button disabled>No phone number</Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function ResultBanner({ result }: { result: ModalResult }) {
  if (result.status === "sent") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="size-4 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-900">Message sent</p>
            <p className="text-xs text-emerald-800 mt-0.5">
              {result.message ?? "Your WhatsApp message has been queued for delivery."}
            </p>
            {result.providerMessageId && (
              <p className="text-xs text-emerald-700 mt-1 font-mono">
                ID: {result.providerMessageId}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (result.status === "provider_not_configured") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
        <div className="flex items-start gap-2">
          <AlertCircle className="size-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-900">Provider not configured</p>
            <p className="text-xs text-amber-800 mt-0.5">
              {result.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (result.status === "entitlement_denied") {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
        <div className="flex items-start gap-2">
          <AlertCircle className="size-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Growth plan required</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
      <div className="flex items-start gap-2">
        <AlertCircle className="size-4 text-red-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-red-900">Failed to send</p>
          <p className="text-xs text-red-800 mt-0.5">{result.message}</p>
        </div>
      </div>
    </div>
  );
}
