"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { MessageCircle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export type TemplateRow = {
  id: string;
  templateKey: string;
  name: string;
  channel: string;
  content: string;
  variables: string[];
  isActive: boolean;
  updatedAt: string;
};

const TEMPLATE_KEY_LABELS: Record<string, string> = {
  membership_expiry: "Membership Expiry",
  payment_pending: "Pending Payment",
  payment_received: "Payment Received",
  daily_closing: "Daily Closing",
};

export function WhatsAppTemplateList({ templates }: { templates: TemplateRow[] }) {
  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="grid min-h-56 place-items-center py-12 text-center">
          <div className="max-w-sm space-y-2">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted">
              <MessageCircle className="size-6 text-muted-foreground" />
            </div>
            <p className="font-semibold">No WhatsApp templates yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first template in the Customization settings to start sending
              personalised WhatsApp messages to members.
            </p>
            <Link
              href="/admin/settings?tab=customization"
              className={buttonVariants({ size: "sm", className: "mt-2" })}
            >
              <ExternalLink className="size-3.5" />
              Go to Customization Settings
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id} className="overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b px-4 py-3 bg-muted/30">
              <div className="min-w-0">
                <p className="font-semibold truncate">{template.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {TEMPLATE_KEY_LABELS[template.templateKey] ?? template.templateKey}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge variant={template.isActive ? "success" : "outline"} className="text-[10px]">
                  {template.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {template.channel}
                </Badge>
              </div>
            </div>

            {/* Content preview */}
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Preview
              </p>
              <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap leading-relaxed">
                {template.content}
              </p>
            </div>

            {/* Variables */}
            {template.variables.length > 0 && (
              <div className="px-4 pb-3 space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Variables
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {template.variables.map((v) => (
                    <code
                      key={v}
                      className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-mono"
                    >
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t px-4 py-2 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Updated{" "}
                {format(parseISO(template.updatedAt), "dd MMM yyyy")}
              </span>
              <Link
                href="/admin/settings?tab=customization"
                className="text-xs text-primary hover:underline"
              >
                Edit →
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
