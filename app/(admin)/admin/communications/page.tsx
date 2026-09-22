import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { listCommunicationLogs } from "@/services/whatsapp.service";

export const metadata = { title: "Communication History" };

const PAGE_SIZE = 25;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const profile = await requireUser(["owner", "admin", "manager"]);
  const whatsappEnabled = await hasCurrentFeature("whatsapp");

  if (!whatsappEnabled) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <MessageCircle className="size-8 text-muted-foreground" />
          <p className="font-medium">WhatsApp communications aren&apos;t included in your current plan</p>
          <p className="text-sm text-muted-foreground">
            Upgrade to the Growth plan to see the communication history log.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!profile.tenant_id) {
    return <p className="text-sm text-muted-foreground">Your account is not linked to an organization.</p>;
  }

  const page = Math.max(1, Number(pageParam) || 1);
  const { rows, total } = await listCommunicationLogs(profile.tenant_id, profile.branch_id, {
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Communication History</h1>
        <p className="text-sm text-muted-foreground">
          A log of WhatsApp messages staff opened from the quick-send panel. This app only ever opens a pre-filled
          WhatsApp link — the send itself happens in the staff member&apos;s own WhatsApp app, so delivery isn&apos;t
          confirmed here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {total} message{total === 1 ? "" : "s"} logged
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No messages logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Recipient</th>
                    <th className="px-4 py-3 font-medium">Channel</th>
                    <th className="px-4 py-3 font-medium">Template</th>
                    <th className="px-4 py-3 font-medium">Message</th>
                    <th className="px-4 py-3 font-medium">Sent by</th>
                    <th className="px-4 py-3 font-medium">Sent at</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.member?.full_name ?? row.lead?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.recipient_phone ?? "—"}
                          {row.lead ? " · Lead" : row.member ? " · Member" : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 capitalize">{row.channel}</td>
                      <td className="px-4 py-3">
                        {row.template_key ? (
                          <Badge variant="outline" className="capitalize">{row.template_key.replace(/_/g, " ")}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Ad-hoc</span>
                        )}
                      </td>
                      <td className="max-w-sm truncate px-4 py-3 text-muted-foreground" title={row.message_preview}>
                        {row.message_preview}
                      </td>
                      <td className="px-4 py-3">{row.sentByUser?.full_name ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatDate(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Link
            href={`/admin/communications?page=${Math.max(1, page - 1)}`}
            className={`rounded-lg border px-3 py-1.5 ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-muted"}`}
          >
            Previous
          </Link>
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/admin/communications?page=${Math.min(totalPages, page + 1)}`}
            className={`rounded-lg border px-3 py-1.5 ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-muted"}`}
          >
            Next
          </Link>
        </div>
      ) : null}
    </div>
  );
}
