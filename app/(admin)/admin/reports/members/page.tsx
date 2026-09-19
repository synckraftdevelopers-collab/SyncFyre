import Link from "next/link";
import { getMembersReport } from "@/services/report.service";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SortableTh, readSort } from "@/components/ui/sortable-th";
export const metadata = { title: "Members Report" };

const SORTABLE_COLUMNS = [
  { label: "Code", column: "code" as const },
  { label: "Name", column: "name" as const },
  { label: "Phone", column: "phone" as const },
  { label: "Gender", column: "gender" as const },
  { label: "Plan", column: "plan" as const },
  { label: "Expiry", column: "expiry" as const },
  { label: "Status", column: "status" as const },
  { label: "Joined", column: "joined" as const },
];

export default async function MembersReport({ searchParams }: { searchParams: Promise<{ q?: string; status?: "active" | "inactive" | "all"; page?: string; colSort?: string; colDir?: string }> }) {
  const sp = await searchParams;
  const profile = await requireUser(["admin", "manager"]);
  const report = await getMembersReport({ branchId: profile.branch_id, page: Math.max(1, Number(sp.page ?? 1)), pageSize: 50, status: sp.status, search: sp.q });

  const { sort: colSort, dir: colDir } = readSort(
    sp as Record<string, string | undefined>,
    SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "colSort", dir: "colDir" },
  );
  let rows: any[] = report.data;
  if (colSort) {
    const dirMul = colDir === "desc" ? -1 : 1;
    const sortValue = (row: any): string => {
      switch (colSort) {
        case "code": return row.member_code ?? "";
        case "name": return row.full_name ?? "";
        case "phone": return row.phone ?? "";
        case "gender": return row.gender ?? "";
        case "plan": return row.current_plan ?? "";
        case "expiry": return row.expiry_date ?? "";
        case "status": return row.member_status ?? "";
        case "joined": return row.joined_date ?? "";
        default: return "";
      }
    };
    rows = [...rows].sort((a, b) => sortValue(a).localeCompare(sortValue(b)) * dirMul);
  }

  return <div className="space-y-5"><div className="flex items-center gap-3"><div><h1 className="text-2xl font-bold">Members Report</h1><p className="text-sm text-muted-foreground">{report.total} member records</p></div><Link href="/api/reports?resource=members" className={buttonVariants({ variant: "outline", className: "ml-auto" })}>Export CSV</Link></div><Card><form className="flex gap-3 border-b p-4"><input name="q" defaultValue={sp.q} placeholder="Search member" className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm" /><select name="status" defaultValue={sp.status ?? "all"} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select><button className={buttonVariants({ variant: "outline" })}>Apply</button></form><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="border-b text-left text-xs uppercase text-muted-foreground"><tr>{SORTABLE_COLUMNS.map(({ label, column }) => <SortableTh key={column} label={label} column={column} basePath="/admin/reports/members" searchParams={sp as Record<string, string | undefined>} currentSort={colSort} currentDir={colDir} paramNames={{ sort: "colSort", dir: "colDir" }} className="p-3 font-medium" />)}</tr></thead><tbody className="divide-y">{rows.map((row: any) => <tr key={row.member_id}><td className="p-3 font-mono text-xs">{row.member_code}</td><td className="p-3 font-medium">{row.full_name}</td><td className="p-3">{row.phone}</td><td className="p-3">{row.gender ?? "—"}</td><td className="p-3">{row.current_plan ?? "—"}</td><td className="p-3">{row.expiry_date ?? "—"}</td><td className="p-3 capitalize">{row.member_status}</td><td className="p-3">{row.joined_date}</td></tr>)}</tbody></table></div></Card></div>;
}
