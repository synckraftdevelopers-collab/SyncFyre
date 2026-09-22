"use server";

import { requireUser } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { listCommunicationTemplates } from "@/services/config.service";
import { recordCommunicationLog } from "@/services/whatsapp.service";

const COMM_ROLES = ["owner", "admin", "manager", "reception"] as const;

export type WhatsAppActionState = { error?: string; success?: string };

/**
 * Logs that a staff member opened a wa.me deep link for a member/lead.
 * Called fire-and-forget (via startTransition) right when "Open WhatsApp"
 * is clicked — the actual send happens in the staff member's own WhatsApp
 * app, this only records that it happened.
 */
export async function logWhatsAppSendAction(formData: FormData): Promise<WhatsAppActionState> {
  try {
    const profile = await requireUser([...COMM_ROLES]);
    if (!(await hasCurrentFeature("whatsapp"))) {
      return { error: "WhatsApp communications are not included in the current plan." };
    }
    if (!profile.tenant_id) return { error: "Your account is not linked to an organization." };

    const channelRaw = String(formData.get("channel") ?? "whatsapp").trim();
    if (channelRaw !== "whatsapp" && channelRaw !== "sms") return { error: "Invalid channel." };

    const memberId = String(formData.get("member_id") ?? "").trim() || null;
    const leadId = String(formData.get("lead_id") ?? "").trim() || null;
    const templateKey = String(formData.get("template_key") ?? "").trim() || null;
    const messagePreview = String(formData.get("message_preview") ?? "").trim();
    const recipientPhone = String(formData.get("recipient_phone") ?? "").trim() || null;

    if (!messagePreview) return { error: "Message is required." };

    await recordCommunicationLog({
      tenantId: profile.tenant_id,
      branchId: profile.branch_id ?? null,
      memberId,
      leadId,
      channel: channelRaw,
      templateKey,
      messagePreview,
      recipientPhone,
      sentBy: profile.id,
    });

    return { success: "Logged." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to log message." };
  }
}

export interface WhatsAppTemplateOption {
  id: string;
  template_key: string;
  channel: string;
  name: string;
  content: string;
  variables: string[];
}

/**
 * Templates for the quick-send modal's picker. Fetched client-side on open
 * (rather than plumbed through every call site) so QuickSendWhatsAppButton
 * stays a drop-in component that only needs recipient + gym name.
 */
export async function listWhatsAppTemplatesAction(): Promise<{
  templates: WhatsAppTemplateOption[];
  error?: string;
}> {
  try {
    const profile = await requireUser([...COMM_ROLES]);
    if (!(await hasCurrentFeature("whatsapp"))) {
      return { templates: [], error: "WhatsApp communications are not included in the current plan." };
    }
    if (!profile.tenant_id) return { templates: [], error: "Your account is not linked to an organization." };

    const templates = await listCommunicationTemplates(profile.tenant_id, profile.branch_id);
    return {
      templates: (templates as any[])
        .filter((template) => template.channel === "whatsapp" && template.is_active)
        .map((template) => ({
          id: template.id,
          template_key: template.template_key,
          channel: template.channel,
          name: template.name,
          content: template.content,
          variables: Array.isArray(template.variables) ? template.variables : [],
        })),
    };
  } catch (error) {
    return { templates: [], error: error instanceof Error ? error.message : "Unable to load templates." };
  }
}
