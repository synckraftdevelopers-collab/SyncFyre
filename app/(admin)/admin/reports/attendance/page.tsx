import Link from "next/link";
import { getAttendanceReport } from "@/services/report.service";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SortableTh, readSort } from "@/components/ui/sortable-th";
export const metadata = { title: "Attendance Report" };

const SORTABLE_COLUMNS = [
  { label: "Date", column: "date" as const },
  { label: "Member", column: "member" as const },
  { label: "Code", column: "code" as const },
  { label: "Entry", column: "entry" as const },
  { label: "Exit", column: "exit" as const },
  { label: "Duration", column: "duration" as const },
];

export default async function AttendanceReport({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; colSort?: string; colDir?: string }> }) {
  const sp = await searchParams;
  const profile = await requireUser(["admin", "manager"]);
  const report = await getAttendanceReport({ branchId: profile.branch_id, dateFrom: sp.from, dateTo: sp.to, pageSize: 100 });

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
        case "date": return row.attendance_date ?? "";
        case "member": return row.full_name ?? "";
        case "code": return row.member_code ?? "";
        case "entry": return row.entry_time_ist ?? "";
        case "exit": return row.exit_time_ist ?? "";
        case "duration": return row.duration_label ?? "";
        default: return "";
      }
    };
    rows = [...rows].sort((a, b) => sortValue(a).localeCompare(sortValue(b)) * dirMul);
  }

  return <div className="space-y-5"><div className="flex"><div><h1 className="text-2xl font-bold">Attendance Report</h1><p className="text-sm text-muted-foreground">{report.total} attendance records</p></div><Link className={buttonVariants({ variant: "outline", className: "ml-auto" })} href="/api/reports?resource=attendance">Export CSV</Link></div><Card><form className="flex gap-3 border-b p-4"><input name="from" type="date" defaultValue={sp.from} className="h-10 rounded-lg border px-3" /><input name="to" type="date" defaultValue={sp.to} className="h-10 rounded-lg border px-3" /><button className={buttonVariants({ variant: "outline" })}>Apply</button></form><div className="overflow-x-auto"><table className="w-full min-w-[750px] text-sm"><thead className="border-b text-left text-xs uppercase text-muted-foreground"><tr>{SORTABLE_COLUMNS.map(({ label, column }) => <SortableTh key={column} label={label} column={column} basePath="/admin/reports/attendance" searchParams={sp as Record<string, string | undefined>} currentSort={colSort} currentDir={colDir} paramNames={{ sort: "colSort", dir: "colDir" }} className="p-3 font-medium" />)}</tr></thead><tbody className="divide-y">{rows.map((row: any) => <tr key={row.attendance_id}><td className="p-3">{row.attendance_date}</td><td className="p-3 font-medium">{row.full_name}</td><td className="p-3">{row.member_code}</td><td className="p-3">{row.entry_time_ist ?? "—"}</td><td className="p-3">{row.exit_time_ist ?? "—"}</td><td className="p-3">{row.duration_label ?? "—"}</td></tr>)}</tbody></table></div></Card></div>;
}
