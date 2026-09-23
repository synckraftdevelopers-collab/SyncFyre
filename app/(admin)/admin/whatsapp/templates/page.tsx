import Link from "next/link";
import { MessageCircle, Plus, AlertCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { isWhatsAppProviderConfigured } from "@/services/whatsapp.service";
import { listCommunicationTemplates } from "@/services/config.service";
import { WhatsAppTemplateList } from "@/components/whatsapp/whatsapp-template-list";

export const metadata = { title: "WhatsApp Templates" };

export default async function WhatsAppTemplatesPage() {
  const profile = await requireUser(["owner", "admin", "manager"]);
  const whatsappEnabled = await hasCurrentFeature("whatsapp");
  const providerConfigured = isWhatsAppProviderConfigured();

  if (!whatsappEnabled) {
    return (
      <div className="space-y-5">
        <PageHeader />
        <Card>
          <CardContent className="grid min-h-64 place-items-center py-16 text-center">
            <div className="max-w-sm space-y-3">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted">
                <MessageCircle className="size-7 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">WhatsApp is a Growth feature</p>
              <p className="text-sm text-muted-foreground">
                Upgrade to the Growth plan to create WhatsApp templates and send messages to members.
              </p>
              <Link href="/admin/upgrade" className={buttonVariants({ className: "mt-2" })}>
                Upgrade to Growth
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Templates require customization engine enabled — read them safely
  const templates = profile.tenant_id
    ? await listCommunicationTemplates(profile.tenant_id, profile.branch_id).catch(() => [])
    : [];

  const whatsappTemplates = templates.filter((t) => t.channel === "whatsapp");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <PageHeader />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Link
            href="/admin/settings?tab=customization"
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="size-4" />
            Manage Templates
          </Link>
        </div>
      </div>

      {/* Provider status banner */}
      {!providerConfigured && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">
                WhatsApp Business integration is not configured
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Templates and message previews are available. Real WhatsApp delivery requires
                a configured provider (set{" "}
                <code className="rounded bg-amber-100 px-1 font-mono text-xs">
                  WHATSAPP_PROVIDER_URL
                </code>{" "}
                and{" "}
                <code className="rounded bg-amber-100 px-1 font-mono text-xs">
                  WHATSAPP_PROVIDER_API_KEY
                </code>{" "}
                in your environment). Contact support to connect your WhatsApp Business account.
              </p>
            </div>
          </div>
        </div>
      )}

      {providerConfigured && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
          <div className="flex items-center gap-2 text-sm text-emerald-800">
            <div className="size-2 rounded-full bg-emerald-500" />
            <span className="font-medium">WhatsApp provider configured.</span>
            <span className="text-emerald-700">Messages sent through this account will be delivered via your WhatsApp Business provider.</span>
          </div>
        </div>
      )}

      {/* Template list */}
      <WhatsAppTemplateList
        templates={whatsappTemplates.map((t) => ({
          id: t.id,
          templateKey: t.template_key,
          name: t.name,
          channel: t.channel,
          content: t.content,
          variables: t.variables,
          isActive: t.is_active,
          updatedAt: t.updated_at,
        }))}
      />

      <p className="text-xs text-muted-foreground">
        <strong>Note:</strong> SyncFyre templates are your own message drafts — they are not
        pre-approved WhatsApp Business templates. To use WhatsApp Business API (required for
        outbound messages outside 24-hour windows), your templates must also be registered and
        approved by your WhatsApp Business provider separately.
      </p>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-bold">WhatsApp Templates</h1>
      <p className="text-sm text-muted-foreground">
        Manage message templates for membership reminders, payment reminders, and renewals.
      </p>
    </div>
  );
}
