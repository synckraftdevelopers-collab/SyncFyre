import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WhatsAppTemplateManager, type TemplateRow } from "@/components/whatsapp/whatsapp-template-manager";
import { requireUser } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { getBranches } from "@/services/branch.service";
import { listCommunicationTemplates } from "@/services/config.service";

export const metadata = { title: "WhatsApp Templates" };

export default async function WhatsAppTemplatesPage() {
  const profile = await requireUser(["owner", "admin", "manager"]);
  const whatsappEnabled = await hasCurrentFeature("whatsapp");

  if (!whatsappEnabled) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <MessageCircle className="size-8 text-muted-foreground" />
          <p className="font-medium">WhatsApp communications aren&apos;t included in your current plan</p>
          <p className="text-sm text-muted-foreground">
            Upgrade to the Growth plan to send WhatsApp messages and manage saved templates.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!profile.tenant_id) {
    return <p className="text-sm text-muted-foreground">Your account is not linked to an organization.</p>;
  }

  const [templates, branches] = await Promise.all([
    listCommunicationTemplates(profile.tenant_id, profile.branch_id),
    getBranches(profile.tenant_id).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">WhatsApp Templates</h1>
        <p className="text-sm text-muted-foreground">
          Manage the saved messages staff can send from the WhatsApp quick-send panel on member and lead pages.
        </p>
      </div>
      <WhatsAppTemplateManager
        templates={templates as unknown as TemplateRow[]}
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
      />
    </div>
  );
}
