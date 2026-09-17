import { Suspense } from "react";
import { requirePortalContext } from "@/lib/auth";
import { AuditLogClient } from "./audit-log-client";

export const metadata = { title: "Audit Logs" };

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Only owner and admin can access audit logs (manager/reception/trainer blocked)
  await requirePortalContext(["owner", "admin"]);

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";
  const action = typeof sp.action === "string" ? sp.action : "";
  const entityType = typeof sp.entityType === "string" ? sp.entityType : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          A complete trail of all actions performed in your organization.
        </p>
      </div>
      <Suspense fallback={<div className="py-10 text-center text-sm text-muted-foreground">Loading audit logs…</div>}>
        <AuditLogClient
          initialPage={page}
          initialFrom={from}
          initialTo={to}
          initialAction={action}
          initialEntityType={entityType}
        />
      </Suspense>
    </div>
  );
}
