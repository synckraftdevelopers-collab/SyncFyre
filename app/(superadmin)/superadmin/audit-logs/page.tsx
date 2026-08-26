import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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

export default async function SuperAdminAuditLogsPage() {
  await requireUser(["super_admin"]);
  const admin = createAdminClient();
  const { data, error } = await admin.from("activity_logs").select("id,action,entity_type,description,changes,created_at,users(full_name),branches(name,tenants(name))").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  const logs = (data ?? []) as unknown as Activity[];
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Audit Logs</h1><p className="text-sm text-muted-foreground">Recent platform actions across all gyms and machine integrations.</p></div><Card><CardHeader><CardTitle>Activity</CardTitle></CardHeader><CardContent className="overflow-x-auto">{logs.length ? <table className="w-full min-w-[980px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Gym</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Details</th></tr></thead><tbody className="divide-y">{logs.map((log) => <tr key={log.id}><td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("en-IN")}</td><td className="px-4 py-3 font-medium">{log.action}</td><td className="px-4 py-3 text-muted-foreground">{log.entity_type}</td><td className="px-4 py-3">{log.users?.full_name ?? "System"}</td><td className="px-4 py-3">{log.branches?.tenants?.name ?? "Platform"}</td><td className="px-4 py-3">{log.branches?.name ?? "Platform"}</td><td className="max-w-[360px] px-4 py-3 text-muted-foreground">{log.description ?? (log.changes ? JSON.stringify(log.changes) : "-")}</td></tr>)}</tbody></table> : <p className="py-12 text-center text-sm text-muted-foreground">No activity has been recorded.</p>}</CardContent></Card></div>;
}
