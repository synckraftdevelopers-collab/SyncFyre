import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { listJournalEntries } from "@/services/finance.service";
import { PostJournalButton } from "@/components/finance/post-journal-button";
import { SortableTh, readSort } from "@/components/ui/sortable-th";

export const metadata = { title: "Journal Entries" };

const SORTABLE_COLUMNS = [
  { label: "Journal No", column: "journal_no" as const },
  { label: "Date", column: "date" as const },
  { label: "Narration", column: "narration" as const },
  { label: "Debit", column: "debit" as const, align: "right" as const },
  { label: "Credit", column: "credit" as const, align: "right" as const },
  { label: "Status", column: "status" as const },
];

export default async function JournalEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; colSort?: string; colDir?: string }>;
}) {
  const sp = await searchParams;
  const { page: pageStr, status } = sp;
  const page = Math.max(1, Number(pageStr ?? 1));
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id;

  const { data: entriesData, total, totalPages } = await listJournalEntries({
    branchId,
    page,
    pageSize: 20,
    status: (status as "draft" | "posted" | "voided" | undefined) ?? undefined,
  });
  let entries = entriesData;

  const { sort: colSort, dir: colDir } = readSort(
    sp as Record<string, string | undefined>,
    SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "colSort", dir: "colDir" },
  );
  if (colSort) {
    const dirMul = colDir === "desc" ? -1 : 1;
    const sortValue = (j: (typeof entries)[number]): string | number => {
      switch (colSort) {
        case "journal_no": return j.journal_number ?? "";
        case "date": return j.entry_date ?? "";
        case "narration": return j.narration ?? "";
        case "debit": return Number(j.total_debit) || 0;
        case "credit": return Number(j.total_credit) || 0;
        case "status": return j.status ?? "";
        default: return "";
      }
    };
    entries = [...entries].sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dirMul;
      return ((av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0) * dirMul;
    });
  }

  const draftCount  = entries.filter((e) => e.status === "draft").length;
  const postedCount = entries.filter((e) => e.status === "posted").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/finance/accounting"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ArrowLeft className="size-4" /> Accounting
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Journal Entries</h1>
            <p className="text-sm text-muted-foreground">{total} total entries</p>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          {(["", "draft", "posted"] as const).map((s) => (
            <Link
              key={s}
              href={s ? `/admin/finance/accounting/journal?status=${s}` : "/admin/finance/accounting/journal"}
              className={buttonVariants({
                variant: (status ?? "") === s ? "default" : "outline",
                size: "sm",
              })}
            >
              {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </Link>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-yellow-100 text-yellow-600">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Draft</p>
              <p className="text-xl font-bold">{draftCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-green-100 text-green-600">
              <CheckCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Posted</p>
              <p className="text-xl font-bold">{postedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <CheckCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total (this page)</p>
              <p className="text-xl font-bold">{entries.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>Journal Entries</CardTitle></CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No journal entries found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {SORTABLE_COLUMNS.map(({ label, column, align }) => (
                        <SortableTh
                          key={column}
                          label={label}
                          column={column}
                          basePath="/admin/finance/accounting/journal"
                          searchParams={sp as Record<string, string | undefined>}
                          currentSort={colSort}
                          currentDir={colDir}
                          align={align}
                          paramNames={{ sort: "colSort", dir: "colDir" }}
                          className={`px-4 py-3 font-medium text-muted-foreground ${align === "right" ? "text-right" : "text-left"}`}
                        />
                      ))}
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {entries.map((j) => (
                      <tr key={j.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{j.journal_number}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{j.entry_date}</td>
                        <td className="px-4 py-3 max-w-[240px] truncate">{j.narration}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(Number(j.total_debit))}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(Number(j.total_credit))}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={j.status === "posted" ? "default" : "outline"}
                            className="capitalize text-[10px]"
                          >
                            {j.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {j.status === "draft" && (
                            <PostJournalButton journalEntryId={j.id} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link
                        href={`/admin/finance/accounting/journal?page=${page - 1}${status ? `&status=${status}` : ""}${colSort ? `&colSort=${colSort}&colDir=${colDir}` : ""}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Previous
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`/admin/finance/accounting/journal?page=${page + 1}${status ? `&status=${status}` : ""}${colSort ? `&colSort=${colSort}&colDir=${colDir}` : ""}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Next
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
