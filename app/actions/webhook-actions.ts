"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { createClient } from "@/lib/supabase/server";

// ─── Developer: Webhook Endpoints (P3-12) ───────────────────────────────────
//
// Gated by lib/entitlements/registry.ts's "api_webhooks" key (Scale plan
// only). Every action here is owner/admin only, matching
// supabase/migrations/0062_developer_api_webhooks.sql's RLS policies.
//
// The signing secret is generated the same way as API keys: a random
// secret, SHA-256 hashed before storage, and returned to the caller in
// plaintext only once — on createWebhookAction, never again afterward.

export const WEBHOOK_EVENTS = [
  "member.created",
  "member.updated",
  "membership.activated",
  "membership.expired",
  "payment.received",
  "payment.failed",
  "lead.created",
  "lead.converted",
] as const;

function generateWebhookSecret() {
  const secret = `whsec_${crypto.randomBytes(32).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(secret).digest("hex");
  return { secret, hash };
}

const urlSchema = z.string().trim().url("Enter a valid https:// URL.").refine((v) => v.startsWith("https://"), {
  message: "Webhook URLs must use https://.",
});

const createWebhookSchema = z.object({
  url: urlSchema,
  branch_id: z.string().trim().uuid().optional().or(z.literal("")),
  events: z.string().trim().optional().or(z.literal("")),
});

export type WebhookActionState = { error?: string; success?: string; plaintextSecret?: string };

// The create/edit forms submit one or more <input name="events" ...>
// entries (checkboxes share the name, so FormData.get() would only see the
// first one) — always read them with getAll, not get.
function parseEvents(formData: FormData) {
  const events = formData
    .getAll("events")
    .map((v) => String(v).trim())
    .filter(Boolean);
  return events.filter((e) => (WEBHOOK_EVENTS as readonly string[]).includes(e));
}

export async function createWebhookAction(formData: FormData): Promise<WebhookActionState> {
  const profile = await requireUser(["owner", "admin"]);
  if (!(await hasCurrentFeature("api_webhooks"))) {
    return { error: "APIs and webhooks are not included in the current plan." };
  }
  if (!profile.tenant_id) return { error: "Your account is not linked to an organization." };

  const parsed = createWebhookSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Review the webhook details." };

  const events = parseEvents(formData);
  if (events.length === 0) return { error: "Select at least one event." };

  const { secret, hash } = generateWebhookSecret();

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("webhook_endpoints").insert({
      tenant_id: profile.tenant_id,
      branch_id: parsed.data.branch_id || null,
      url: parsed.data.url,
      events,
      secret_hash: hash,
      is_active: true,
      created_by: profile.id,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/developer");
    return { success: "Webhook created.", plaintextSecret: secret };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create webhook." };
  }
}

export async function updateWebhookAction(formData: FormData): Promise<{ error?: string; success?: string }> {
  const profile = await requireUser(["owner", "admin"]);
  if (!(await hasCurrentFeature("api_webhooks"))) {
    return { error: "APIs and webhooks are not included in the current plan." };
  }
  if (!profile.tenant_id) return { error: "Your account is not linked to an organization." };

  const webhookId = String(formData.get("webhook_id") ?? "");
  if (!webhookId) return { error: "Select a webhook to update." };

  const urlRaw = String(formData.get("url") ?? "").trim();
  const urlParsed = urlRaw ? urlSchema.safeParse(urlRaw) : null;
  if (urlRaw && !urlParsed?.success) return { error: urlParsed?.error.issues[0]?.message ?? "Enter a valid URL." };

  const events = parseEvents(formData);
  if (events.length === 0) return { error: "Select at least one event." };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("webhook_endpoints")
      .update({ url: urlRaw || undefined, events })
      .eq("id", webhookId)
      .eq("tenant_id", profile.tenant_id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/developer");
    return { success: "Webhook updated." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update webhook." };
  }
}

export async function toggleWebhookActiveAction(formData: FormData): Promise<{ error?: string; success?: string }> {
  const profile = await requireUser(["owner", "admin"]);
  if (!(await hasCurrentFeature("api_webhooks"))) {
    return { error: "APIs and webhooks are not included in the current plan." };
  }
  if (!profile.tenant_id) return { error: "Your account is not linked to an organization." };

  const webhookId = String(formData.get("webhook_id") ?? "");
  const isActive = String(formData.get("is_active") ?? "") === "true";
  if (!webhookId) return { error: "Select a webhook to update." };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("webhook_endpoints")
      .update({ is_active: isActive })
      .eq("id", webhookId)
      .eq("tenant_id", profile.tenant_id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/developer");
    return { success: isActive ? "Webhook enabled." : "Webhook disabled." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update webhook." };
  }
}

export async function deleteWebhookAction(formData: FormData): Promise<{ error?: string; success?: string }> {
  const profile = await requireUser(["owner", "admin"]);
  if (!(await hasCurrentFeature("api_webhooks"))) {
    return { error: "APIs and webhooks are not included in the current plan." };
  }
  if (!profile.tenant_id) return { error: "Your account is not linked to an organization." };

  const webhookId = String(formData.get("webhook_id") ?? "");
  if (!webhookId) return { error: "Select a webhook to delete." };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("webhook_endpoints")
      .delete()
      .eq("id", webhookId)
      .eq("tenant_id", profile.tenant_id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/developer");
    return { success: "Webhook deleted." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to delete webhook." };
  }
}
