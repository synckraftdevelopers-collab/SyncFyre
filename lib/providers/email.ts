import { env } from "@/lib/env";

export type EmailMessage = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  metadata?: Record<string, unknown>;
};

export type EmailDeliveryResult = {
  provider: string;
  providerMessageId: string | null;
  status: "sent" | "delivered" | "queued";
};

export function isEmailProviderConfigured() {
  return Boolean(env.EMAIL_PROVIDER_URL && env.EMAIL_PROVIDER_API_KEY);
}

export async function sendEmail(message: EmailMessage): Promise<EmailDeliveryResult> {
  if (!isEmailProviderConfigured()) {
    throw new Error("Email provider is not configured.");
  }

  const response = await fetch(env.EMAIL_PROVIDER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.EMAIL_PROVIDER_API_KEY}`,
    },
    body: JSON.stringify({
      to: message.to,
      subject: message.subject,
      html: message.html ?? null,
      text: message.text ?? null,
      from: message.from ?? null,
      replyTo: message.replyTo ?? null,
      cc: message.cc ?? [],
      bcc: message.bcc ?? [],
      metadata: message.metadata ?? {},
      appUrl: env.NEXT_PUBLIC_APP_URL,
    }),
  });

  const body = await response.json().catch(() => null) as { provider?: string; providerMessageId?: string; status?: string; error?: string } | null;
  if (!response.ok) {
    throw new Error(body?.error ?? body?.status ?? `Email provider returned ${response.status}`);
  }

  return {
    provider: body?.provider ?? "email-provider",
    providerMessageId: body?.providerMessageId ?? null,
    status: body?.status === "delivered" ? "delivered" : body?.status === "queued" ? "queued" : "sent",
  };
}

