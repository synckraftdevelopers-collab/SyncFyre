/**
 * whatsapp.service.ts
 *
 * Provider-agnostic WhatsApp service.
 *
 * Architecture:
 *   SyncFyre send action
 *     → WhatsAppService.send()
 *       → isProviderConfigured() check
 *         NO  → returns { status: "provider_not_configured" }
 *         YES → POSTs to WHATSAPP_PROVIDER_URL with API key
 *               → returns { status: "sent", providerMessageId? }
 *
 * Status model (never fake delivery):
 *   "provider_not_configured" — env vars absent, no API call made
 *   "sent"                    — provider accepted the request
 *   "failed"                  — provider returned an error
 *   (delivered/read are webhook-only, never set here)
 *
 * To connect a real provider:
 *   1. Set WHATSAPP_PROVIDER_URL + WHATSAPP_PROVIDER_API_KEY in env
 *   2. The provider must accept the WhatsAppSendPayload below
 *   3. Add a webhook handler at /api/whatsapp/webhook to receive
 *      delivery receipts and update communication_logs accordingly
 */

import { env } from "@/lib/env";

export type WhatsAppSendStatus =
  | "provider_not_configured"
  | "sent"
  | "failed";

export type WhatsAppSendResult = {
  status: WhatsAppSendStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
};

export type WhatsAppSendPayload = {
  /** E.164 or local number — service normalises to 91XXXXXXXXXX */
  to: string;
  message: string;
  templateKey?: string | null;
  /** Tenant-scoped correlation ID for audit/logging */
  tenantId?: string | null;
  branchId?: string | null;
  memberId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Returns true when both provider URL and API key are set in the environment.
 * Does NOT make any network call.
 */
export function isWhatsAppProviderConfigured(): boolean {
  return Boolean(env.WHATSAPP_PROVIDER_URL && env.WHATSAPP_PROVIDER_API_KEY);
}

/**
 * Normalise a phone number to the format expected by Indian WhatsApp providers:
 * 91XXXXXXXXXX (no +, no spaces, 12 digits).
 */
export function normaliseWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return digits;
  // Already has country code (12 digits starting with 91)
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  // 10-digit local number
  if (digits.length === 10) return `91${digits}`;
  // Anything else: return as-is, let the provider reject gracefully
  return digits;
}

/**
 * Send a WhatsApp message through the configured provider.
 *
 * Returns a discriminated result — NEVER throws.
 * The caller is responsible for logging to communication_logs.
 */
export async function sendWhatsAppMessage(
  payload: WhatsAppSendPayload,
): Promise<WhatsAppSendResult> {
  if (!isWhatsAppProviderConfigured()) {
    return {
      status: "provider_not_configured",
      errorMessage:
        "WhatsApp Business integration is not configured. " +
        "Set WHATSAPP_PROVIDER_URL and WHATSAPP_PROVIDER_API_KEY to enable real delivery.",
    };
  }

  const to = normaliseWhatsAppNumber(payload.to);
  if (!to) {
    return { status: "failed", errorMessage: "Invalid or missing phone number." };
  }

  try {
    const response = await fetch(env.WHATSAPP_PROVIDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.WHATSAPP_PROVIDER_API_KEY}`,
      },
      body: JSON.stringify({
        to,
        message: payload.message,
        templateKey: payload.templateKey ?? null,
        tenantId: payload.tenantId ?? null,
        branchId: payload.branchId ?? null,
        memberId: payload.memberId ?? null,
        metadata: payload.metadata ?? {},
      }),
    });

    let body: { providerMessageId?: string; messageId?: string; status?: string; error?: string } | null = null;
    try {
      body = (await response.json()) as { providerMessageId?: string; messageId?: string; status?: string; error?: string };
    } catch {
      // Non-JSON response — treat as sent if HTTP 2xx
    }

    if (!response.ok) {
      const detail = (body as { error?: string } | null)?.error ?? response.statusText ?? `HTTP ${response.status}`;
      return { status: "failed", errorMessage: detail };
    }

    return {
      status: "sent",
      providerMessageId: body?.providerMessageId ?? body?.messageId ?? null,
    };
  } catch (error) {
    return {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown network error.",
    };
  }
}

/**
 * Resolve a template's {{placeholders}} with actual member/gym data.
 * Only substitutes declared variables; unmatched placeholders are left as-is.
 */
export function resolveTemplateContent(
  content: string,
  variables: Record<string, string | null | undefined>,
): string {
  return content.replace(/\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value !== null && value !== undefined ? value : `{{${key}}}`;
  });
}
