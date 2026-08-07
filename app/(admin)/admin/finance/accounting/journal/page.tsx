import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { listJournalEntries } from "@/services/finance.service";
import { PostJournalButton } from "@/components/finance/post-journal-button";

export const metadata = { title: "Journal Entries" };

export default async function JournalEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: pageStr, status } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? 1));
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id;

  const { data: entries, total, totalPages } = await listJournalEntries({
    branchId,
    page,
    pageSize: 20,
    status: (status as "draft" | "posted" | "voided" | undefined) ?? undefined,
  });

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
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Journal No</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Narration</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Debit</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Credit</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
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
                            variant={j.status === "posted" ? "default" : "secondary"}
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
                        href={`/admin/finance/accounting/journal?page=${page - 1}${status ? `&status=${status}` : ""}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Previous
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`/admin/finance/accounting/journal?page=${page + 1}${status ? `&status=${status}` : ""}`}
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
