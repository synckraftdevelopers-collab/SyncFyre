"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, X } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/member-messages";
import {
  listWhatsAppTemplatesAction,
  logWhatsAppSendAction,
  type WhatsAppTemplateOption,
} from "@/app/actions/whatsapp-actions";

export interface SendWhatsAppModalProps {
  recipientName: string;
  recipientPhone?: string | null;
  /** Gym / branch name used to fill a template's {{gym_name}} placeholder. */
  gymName?: string | null;
  memberId?: string | null;
  leadId?: string | null;
  /** Starting text for the "Ad-hoc message" tab — e.g. a pre-built membership/payment message. */
  defaultMessage?: string;
  onClose: () => void;
}

const ADHOC_VALUE = "__adhoc__";

/** Fills a template's {{variable}} placeholders — same pattern as lib/config/template-variables.ts. */
function renderTemplate(content: string, values: Record<string, string>): string {
  return content.replace(/\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/g, (_match, key: string) =>
    values[key]?.trim() ? values[key] : `{{${key}}}`,
  );
}

function guessDefaultValue(variable: string, recipientName: string, gymName?: string | null): string {
  if (variable === "member_name" || variable === "lead_name" || variable === "name") return recipientName;
  if (variable === "gym_name") return gymName || "SyncFyre Gym";
  return "";
}

export function SendWhatsAppModal({
  recipientName,
  recipientPhone,
  gymName,
  memberId,
  leadId,
  defaultMessage = "",
  onClose,
}: SendWhatsAppModalProps) {
  const [mounted, setMounted] = useState(false);
  const [templates, setTemplates] = useState<WhatsAppTemplateOption[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>(ADHOC_VALUE);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [adhocMessage, setAdhocMessage] = useState(defaultMessage);
  const [, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);

  // Load the tenant's active WhatsApp templates once, on open.
  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      const result = await listWhatsAppTemplatesAction();
      if (cancelled) return;
      setTemplates(result.templates);
      if (result.error) setTemplatesError(result.error);
      setTemplatesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Escape to close + lock body scroll while open.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId],
  );

  // Re-seed variable inputs with sensible defaults whenever the template changes.
  useEffect(() => {
    if (!selectedTemplate) return;
    setVariableValues((prev) => {
      const next: Record<string, string> = {};
      for (const variable of selectedTemplate.variables) {
        next[variable] = prev[variable] ?? guessDefaultValue(variable, recipientName, gymName);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate?.id]);

  const finalMessage = selectedTemplate ? renderTemplate(selectedTemplate.content, variableValues) : adhocMessage;
  const whatsappUrl = buildWhatsAppUrl(recipientPhone, finalMessage);

  function handleOpenWhatsApp() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("channel", "whatsapp");
      if (memberId) formData.set("member_id", memberId);
      if (leadId) formData.set("lead_id", leadId);
      if (selectedTemplate) formData.set("template_key", selectedTemplate.template_key);
      formData.set("message_preview", finalMessage);
      if (recipientPhone) formData.set("recipient_phone", recipientPhone);
      await logWhatsAppSendAction(formData);
    });
    onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      style={{ padding: "env(safe-area-inset-top, 1rem) 1rem env(safe-area-inset-bottom, 1rem) 1rem" }}
      role="dialog"
      aria-modal="true"
      aria-label={`Send WhatsApp to ${recipientName}`}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-2xl border bg-background shadow-2xl max-h-[90dvh] overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-3.5">
          <div>
            <p className="font-semibold">Send WhatsApp to {recipientName}</p>
            <p className="text-xs text-muted-foreground">{recipientPhone || "No phone on file"}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
          <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Message source
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-1.5 h-9 w-full rounded-lg border bg-background px-2 text-sm normal-case"
            >
              <option value={ADHOC_VALUE}>Ad-hoc message</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.template_key})
                </option>
              ))}
            </select>
          </label>
          {templatesLoading ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <LoaderCircle className="size-3 animate-spin" /> Loading saved templates…
            </p>
          ) : null}
          {templatesError ? <p className="text-xs text-destructive">{templatesError}</p> : null}

          {selectedTemplate ? (
            <div className="space-y-2.5">
              {selectedTemplate.variables.length === 0 ? (
                <p className="text-xs text-muted-foreground">This template has no fill-in variables.</p>
              ) : (
                selectedTemplate.variables.map((variable) => (
                  <label key={variable} className="block text-xs font-medium text-muted-foreground">
                    {variable.replace(/_/g, " ")}
                    <input
                      value={variableValues[variable] ?? ""}
                      onChange={(e) => setVariableValues((prev) => ({ ...prev, [variable]: e.target.value }))}
                      className="mt-1 h-9 w-full rounded-lg border bg-background px-2 text-sm normal-case"
                    />
                  </label>
                ))
              )}
            </div>
          ) : (
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Message
              <textarea
                value={adhocMessage}
                onChange={(e) => setAdhocMessage(e.target.value)}
                rows={8}
                className="mt-1.5 w-full resize-none rounded-xl border bg-muted/40 px-3 py-2.5 text-sm normal-case font-mono"
              />
            </label>
          )}

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Preview</p>
            <div className="whitespace-pre-wrap rounded-xl border bg-muted/40 px-3 py-2.5 text-sm">
              {finalMessage || "—"}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Edit before sending. Opening WhatsApp does not confirm delivery.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3">
          <button onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
            Cancel
          </button>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={handleOpenWhatsApp}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-95"
            >
              Open WhatsApp
            </a>
          ) : (
            <button type="button" disabled className="cursor-not-allowed rounded-lg bg-muted px-3 py-1.5 text-sm text-muted-foreground">
              No phone number
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
