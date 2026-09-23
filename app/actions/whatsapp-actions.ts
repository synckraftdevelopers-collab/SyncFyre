"use server";

/**
 * whatsapp-actions.ts
 *
 * Server actions for WhatsApp send flows.
 * Every action:
 *   1. Checks Growth plan entitlement (hasCurrentFeature("whatsapp"))
 *   2. Resolves template content if a template key is supplied
 *   3. Calls WhatsAppService.sendWhatsAppMessage()
 *   4. Logs the attempt to notification_logs (via the existing log table)
 *   5. Returns a discriminated result — never throws to the client
 *
 * STATUS RULES (from spec §11):
 *   provider_not_configured → clearly labelled, no fake send
 *   sent                    → provider accepted the request
 *   failed                  → provider returned an error
 *   Delivered/Read are webhook-only, never set here.
 */

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import {
  isWhatsAppProviderConfigured,
  resolveTemplateContent,
  sendWhatsAppMessage,
} from "@/services/whatsapp.service";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type WhatsAppActionResult = {
  status: "sent" | "failed" | "provider_not_configured" | "entitlement_denied";
  message?: string;
  providerMessageId?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Insert a row into notification_logs (reuses existing delivery log table). */
async function logWhatsAppAttempt(input: {
  channel: "whatsapp";
  recipient: string;
  status: "sent" | "failed" | "skipped";
  provider?: string | null;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  /** Optional: links to a notification row for correlation */
  notificationId?: string | null;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("notification_logs").insert({
      notification_id: input.notificationId ?? null,
      channel: input.channel,
      recipient: input.recipient,
      provider: input.provider ?? "whatsapp",
      provider_message_id: input.providerMessageId ?? null,
      status: input.status,
      error_message: input.errorMessage ?? null,
      delivered_at: null,
    });
  } catch {
    // Logging must never break the send flow
  }
}

/** Resolve template content from the communication_templates table. */
async function resolveTemplate(
  tenantId: string,
  branchId: string | null,
  templateKey: string,
  variables: Record<string, string | null | undefined>,
): Promise<string | null> {
  const supabase = await createClient();
  let query = supabase
    .from("communication_templates")
    .select("content")
    .eq("tenant_id", tenantId)
    .eq("template_key", templateKey)
    .eq("channel", "whatsapp")
    .eq("is_active", true);

  // Prefer branch-level template over tenant-level
  if (branchId) {
    const { data: branchTemplate } = await query.eq("branch_id", branchId).maybeSingle();
    if (branchTemplate?.content) {
      return resolveTemplateContent(branchTemplate.content, variables);
    }
  }

  const { data: tenantTemplate } = await query.is("branch_id", null).maybeSingle();
  if (tenantTemplate?.content) {
    return resolveTemplateContent(tenantTemplate.content, variables);
  }

  return null;
}

// ─── Action: Send WhatsApp to a member ────────────────────────────────────────

export type SendMemberWhatsAppInput = {
  memberId: string;
  phone: string;
  /** Pre-resolved message text (after template substitution in the UI) */
  message: string;
  templateKey?: string | null;
};

export async function sendMemberWhatsAppAction(
  input: SendMemberWhatsAppInput,
): Promise<WhatsAppActionResult> {
  const profile = await requireUser(["admin", "manager", "reception"]);

  if (!(await hasCurrentFeature("whatsapp"))) {
    return {
      status: "entitlement_denied",
      message: "WhatsApp is available on the Growth plan and above. Upgrade to unlock this feature.",
    };
  }

  if (!input.phone?.trim()) {
    return { status: "failed", message: "This member does not have a phone number on file." };
  }

  if (!isWhatsAppProviderConfigured()) {
    return {
      status: "provider_not_configured",
      message:
        "WhatsApp Business integration is not configured for this account. " +
        "Contact support to connect your WhatsApp Business provider.",
    };
  }

  const result = await sendWhatsAppMessage({
    to: input.phone,
    message: input.message,
    templateKey: input.templateKey ?? null,
    tenantId: profile.tenant_id,
    branchId: profile.branch_id,
    memberId: input.memberId,
  });

  await logWhatsAppAttempt({
    channel: "whatsapp",
    recipient: input.phone,
    status: result.status === "sent" ? "sent" : "failed",
    providerMessageId: result.providerMessageId,
    errorMessage: result.errorMessage,
  });

  if (result.status === "sent") {
    return {
      status: "sent",
      message: "WhatsApp message queued for delivery.",
      providerMessageId: result.providerMessageId,
    };
  }

  return {
    status: "failed",
    message: result.errorMessage ?? "Unable to send WhatsApp message. Please try again.",
  };
}

// ─── Action: Send WhatsApp payment reminder ───────────────────────────────────

export type SendPaymentReminderWhatsAppInput = {
  memberId: string;
  memberName: string;
  phone: string;
  pendingAmount: number;
  gymName: string;
};

export async function sendPaymentReminderWhatsAppAction(
  input: SendPaymentReminderWhatsAppInput,
): Promise<WhatsAppActionResult> {
  const profile = await requireUser(["admin", "manager", "reception"]);

  if (!(await hasCurrentFeature("whatsapp"))) {
    return {
      status: "entitlement_denied",
      message: "WhatsApp is available on the Growth plan and above.",
    };
  }

  if (!input.phone?.trim()) {
    return { status: "failed", message: "No phone number available for this member." };
  }

  if (!isWhatsAppProviderConfigured()) {
    return {
      status: "provider_not_configured",
      message: "WhatsApp Business integration is not configured. Contact support to enable it.",
    };
  }

  // Try to resolve a custom payment_pending template; fall back to default
  const variables = {
    member_name: input.memberName,
    pending_amount: `₹${input.pendingAmount.toLocaleString("en-IN")}`,
    gym_name: input.gymName,
  };

  const templateMessage = profile.tenant_id
    ? await resolveTemplate(profile.tenant_id, profile.branch_id, "payment_pending", variables)
    : null;

  const message =
    templateMessage ??
    `Hello ${input.memberName},\n\nYou have a pending payment of ₹${input.pendingAmount.toLocaleString("en-IN")} at ${input.gymName}.\n\nPlease clear your dues at the earliest.\n\nThank you,\n${input.gymName}`;

  const result = await sendWhatsAppMessage({
    to: input.phone,
    message,
    templateKey: "payment_pending",
    tenantId: profile.tenant_id,
    branchId: profile.branch_id,
    memberId: input.memberId,
  });

  await logWhatsAppAttempt({
    channel: "whatsapp",
    recipient: input.phone,
    status: result.status === "sent" ? "sent" : "failed",
    providerMessageId: result.providerMessageId,
    errorMessage: result.errorMessage,
  });

  if (result.status === "sent") {
    return {
      status: "sent",
      message: "Payment reminder sent via WhatsApp.",
      providerMessageId: result.providerMessageId,
    };
  }

  return {
    status: "failed",
    message: result.errorMessage ?? "Failed to send WhatsApp reminder.",
  };
}

// ─── Action: Send WhatsApp renewal reminder ───────────────────────────────────

export type SendRenewalReminderWhatsAppInput = {
  memberId: string;
  memberName: string;
  phone: string;
  planName: string;
  expiryDate: string;
  gymName: string;
};

export async function sendRenewalReminderWhatsAppAction(
  input: SendRenewalReminderWhatsAppInput,
): Promise<WhatsAppActionResult> {
  const profile = await requireUser(["admin", "manager", "reception"]);

  if (!(await hasCurrentFeature("whatsapp"))) {
    return {
      status: "entitlement_denied",
      message: "WhatsApp is available on the Growth plan and above.",
    };
  }

  if (!input.phone?.trim()) {
    return { status: "failed", message: "No phone number available for this member." };
  }

  if (!isWhatsAppProviderConfigured()) {
    return {
      status: "provider_not_configured",
      message: "WhatsApp Business integration is not configured. Contact support to enable it.",
    };
  }

  const formattedExpiry = (() => {
    try {
      return new Date(input.expiryDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return input.expiryDate;
    }
  })();

  const variables = {
    member_name: input.memberName,
    membership_plan: input.planName,
    expiry_date: formattedExpiry,
    gym_name: input.gymName,
  };

  const templateMessage = profile.tenant_id
    ? await resolveTemplate(profile.tenant_id, profile.branch_id, "membership_expiry", variables)
    : null;

  const message =
    templateMessage ??
    `Hello ${input.memberName},\n\nYour ${input.planName} at ${input.gymName} is expiring on ${formattedExpiry}.\n\nPlease renew now to continue your fitness journey without interruption.\n\nThank you,\n${input.gymName}`;

  const result = await sendWhatsAppMessage({
    to: input.phone,
    message,
    templateKey: "membership_expiry",
    tenantId: profile.tenant_id,
    branchId: profile.branch_id,
    memberId: input.memberId,
  });

  await logWhatsAppAttempt({
    channel: "whatsapp",
    recipient: input.phone,
    status: result.status === "sent" ? "sent" : "failed",
    providerMessageId: result.providerMessageId,
    errorMessage: result.errorMessage,
  });

  if (result.status === "sent") {
    revalidatePath("/admin/renewals");
    return {
      status: "sent",
      message: "Renewal reminder sent via WhatsApp.",
      providerMessageId: result.providerMessageId,
    };
  }

  return {
    status: "failed",
    message: result.errorMessage ?? "Failed to send WhatsApp renewal reminder.",
  };
}
