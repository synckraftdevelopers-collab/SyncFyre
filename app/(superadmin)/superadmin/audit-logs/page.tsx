import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SortableTh, readSort } from "@/components/ui/sortable-th";

export const metadata = { title: "Audit Logs" };

type Activity = {
  id: number;
  action: string;
  entity_type: string;
  description: string | null;
  created_at: string;
  changes: Record<string, unknown> | null;
  users: { full_name: string } | null;
  branches: { name: string; tenants: { name: string } | null } | null;
};

const SORTABLE_COLUMNS = [
  { label: "When", column: "when" as const },
  { label: "Action", column: "action" as const },
  { label: "Entity", column: "entity" as const },
  { label: "User", column: "user" as const },
  { label: "Gym", column: "gym" as const },
  { label: "Branch", column: "branch" as const },
];

export default async function SuperAdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ colSort?: string; colDir?: string }>;
}) {
  const sp = await searchParams;
  await requireUser(["super_admin"]);
  const admin = createAdminClient();
  const { data, error } = await admin.from("activity_logs").select("id,action,entity_type,description,changes,created_at,users(full_name),branches(name,tenants(name))").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  let logs = (data ?? []) as unknown as Activity[];

  const { sort: colSort, dir: colDir } = readSort(
    sp as Record<string, string | undefined>,
    SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "colSort", dir: "colDir" },
  );
  if (colSort) {
    const dirMul = colDir === "desc" ? -1 : 1;
    const sortValue = (log: Activity): string => {
      switch (colSort) {
        case "when": return log.created_at ?? "";
        case "action": return log.action ?? "";
        case "entity": return log.entity_type ?? "";
        case "user": return log.users?.full_name ?? "";
        case "gym": return log.branches?.tenants?.name ?? "";
        case "branch": return log.branches?.name ?? "";
        default: return "";
      }
    };
    logs = [...logs].sort((a, b) => sortValue(a).localeCompare(sortValue(b)) * dirMul);
  }

  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Audit Logs</h1><p className="text-sm text-muted-foreground">Recent platform actions across all gyms and machine integrations.</p></div><Card><CardHeader><CardTitle>Activity</CardTitle></CardHeader><CardContent className="overflow-x-auto">{logs.length ? <table className="w-full min-w-[980px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr>{SORTABLE_COLUMNS.map(({ label, column }) => <SortableTh key={column} label={label} column={column} basePath="/superadmin/audit-logs" searchParams={sp as Record<string, string | undefined>} currentSort={colSort} currentDir={colDir} paramNames={{ sort: "colSort", dir: "colDir" }} className="px-4 py-3 font-medium" />)}<th className="px-4 py-3">Details</th></tr></thead><tbody className="divide-y">{logs.map((log) => <tr key={log.id}><td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("en-IN")}</td><td className="px-4 py-3 font-medium">{log.action}</td><td className="px-4 py-3 text-muted-foreground">{log.entity_type}</td><td className="px-4 py-3">{log.users?.full_name ?? "System"}</td><td className="px-4 py-3">{log.branches?.tenants?.name ?? "Platform"}</td><td className="px-4 py-3">{log.branches?.name ?? "Platform"}</td><td className="max-w-[360px] px-4 py-3 text-muted-foreground">{log.description ?? (log.changes ? JSON.stringify(log.changes) : "-")}</td></tr>)}</tbody></table> : <p className="py-12 text-center text-sm text-muted-foreground">No activity has been recorded.</p>}</CardContent></Card></div>;
}
