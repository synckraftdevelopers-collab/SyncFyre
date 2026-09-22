"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { createClient } from "@/lib/supabase/server";

// ─── Developer: API Keys (P3-12) ────────────────────────────────────────────
//
// Gated by lib/entitlements/registry.ts's "api_webhooks" key (Scale plan
// only). Every action here is owner/admin only, matching
// supabase/migrations/0062_developer_api_webhooks.sql's RLS policies.
//
// Secrets: the full API key secret is generated with crypto.randomBytes and
// is NEVER stored or logged — only its SHA-256 hash (key_hash) is written to
// the database. The plaintext secret is returned to the caller exactly once,
// in createApiKeyAction's response, so the UI can show it a single time.

const KEY_PREFIX = "sfk_live_";

function generateApiKeySecret() {
  const raw = crypto.randomBytes(32).toString("hex");
  const secret = `${KEY_PREFIX}${raw}`;
  const displayPrefix = `${KEY_PREFIX}${raw.slice(0, 6)}`;
  const hash = crypto.createHash("sha256").update(secret).digest("hex");
  return { secret, displayPrefix, hash };
}

const createApiKeySchema = z.object({
  name: z.string().trim().min(2, "Name the key so you can identify it later.").max(120),
  branch_id: z.string().trim().uuid().optional().or(z.literal("")),
  scopes: z.string().trim().optional().or(z.literal("")),
  expires_at: z.string().trim().optional().or(z.literal("")),
});

export type ApiKeyActionState = { error?: string; success?: string; plaintextKey?: string };

export async function createApiKeyAction(formData: FormData): Promise<ApiKeyActionState> {
  const profile = await requireUser(["owner", "admin"]);
  if (!(await hasCurrentFeature("api_webhooks"))) {
    return { error: "APIs and webhooks are not included in the current plan." };
  }
  if (!profile.tenant_id) return { error: "Your account is not linked to an organization." };

  const parsed = createApiKeySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Review the key details." };

  const scopes = parsed.data.scopes
    ? parsed.data.scopes.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const expiresAt = parsed.data.expires_at ? new Date(parsed.data.expires_at) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return { error: "Enter a valid expiry date." };

  const { secret, displayPrefix, hash } = generateApiKeySecret();

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("api_keys").insert({
      tenant_id: profile.tenant_id,
      branch_id: parsed.data.branch_id || null,
      name: parsed.data.name,
      key_prefix: displayPrefix,
      key_hash: hash,
      scopes,
      created_by: profile.id,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/developer");
    return { success: "API key created.", plaintextKey: secret };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create API key." };
  }
}

export async function revokeApiKeyAction(formData: FormData): Promise<{ error?: string; success?: string }> {
  const profile = await requireUser(["owner", "admin"]);
  if (!(await hasCurrentFeature("api_webhooks"))) {
    return { error: "APIs and webhooks are not included in the current plan." };
  }
  if (!profile.tenant_id) return { error: "Your account is not linked to an organization." };

  const keyId = String(formData.get("key_id") ?? "");
  if (!keyId) return { error: "Select a key to revoke." };

  try {
    const supabase = await createClient();
    // Soft delete only — revoked_at is kept for audit, the row is never
    // hard-deleted so past key usage stays traceable.
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", keyId)
      .eq("tenant_id", profile.tenant_id)
      .is("revoked_at", null);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/developer");
    return { success: "API key revoked." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to revoke API key." };
  }
}
