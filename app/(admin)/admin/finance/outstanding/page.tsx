import { CircleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceivableRowActions } from "@/components/finance/receivable-row-actions";
import { getCurrentProfile } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { formatCurrency } from "@/lib/utils";
import { getOutstandingReceivablesSummary, listReceivables } from "@/services/finance.service";
import { SortableTh, readSort } from "@/components/ui/sortable-th";

export const metadata = { title: "Outstanding Dues" };

// Keys are the dynamically COMPUTED status (display_status), never the
// stale stored `receivables.status` column — see
// lib/finance/payment-balance.ts#computeReceivableDisplayStatus.
const STATUS_STYLES: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-700",
  overdue:    "bg-red-100 text-red-700",
  paid:       "bg-green-100 text-green-700",
  written_off:"bg-gray-100 text-gray-500",
};

const SORTABLE_COLUMNS = [
  { label: "Member", column: "member" as const, align: "left" as const },
  { label: "Type", column: "type" as const, align: "left" as const },
  { label: "Original", column: "original" as const, align: "right" as const },
  { label: "Paid", column: "paid" as const, align: "right" as const },
  { label: "Balance", column: "balance" as const, align: "right" as const },
  { label: "Due Date", column: "due_date" as const, align: "left" as const },
  { label: "Status", column: "status" as const, align: "left" as const },
];

export default async function OutstandingPage({
  searchParams,
}: {
  searchParams: Promise<{ colSort?: string; colDir?: string }>;
}) {
  // No explicit `export const dynamic` needed: lib/supabase/server.ts's
  // createClient() reads cookies() on every call, which already opts this
  // route into dynamic (uncached, per-request) rendering — the same
  // convention every other page in this app relies on. Combined with the
  // date-aware status computed below, that means a fresh page load always
  // reflects the current database state: new invoices, new payments, and
  // pending -> overdue date transitions all show up on the next load/refresh
  // without any manual data edit or cron job.
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id;
  const sp = await searchParams;

  // pageSize is generous rather than the field default (30) so the table
  // shows every currently-outstanding row for a normal-sized gym in one
  // page; the KPI cards above are always computed from the full, unpaginated
  // dataset regardless of this limit.
  const [{ data: allUnsorted, total }, summary, canUseInstallments] = await Promise.all([
    listReceivables({ branchId, page: 1, pageSize: 500 }),
    getOutstandingReceivablesSummary(branchId),
    // Installments / partial-payment continuation is an Advanced Membership
    // Operations capability — Growth+ only (lib/entitlements/registry.ts's
    // `advanced_membership` key). Essential-tier tenants still see every
    // column below except the per-row "Manage" actions.
    hasCurrentFeature("advanced_membership"),
  ]);

  const { sort: colSort, dir: colDir } = readSort(
    sp as Record<string, string | undefined>,
    SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "colSort", dir: "colDir" },
  );

  let all = allUnsorted;
  if (colSort) {
    const dirMul = colDir === "desc" ? -1 : 1;
    const sortValue = (row: (typeof all)[number]): string | number => {
      const m = row.members as { full_name: string; member_code: string } | null;
      switch (colSort) {
        case "member":
          return m?.full_name ?? "";
        case "type":
          return row.receivable_type ?? "";
        case "original":
          return Number(row.original_amount) || 0;
        case "paid":
          return Number(row.paid_amount) || 0;
        case "balance":
          return Number(row.balance_amount) || 0;
        case "due_date":
          return row.next_installment_due_date ?? row.due_date ?? "";
        case "status":
          return row.display_status ?? "";
        default:
          return "";
      }
    };
    all = [...all].sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dirMul;
      return ((av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0) * dirMul;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Outstanding Dues</h1>
        <p className="text-sm text-muted-foreground">Track and follow up on pending receivables</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-red-100 text-red-600">
              <CircleAlert className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overdue</p>
              <p className="text-xl font-bold text-red-600">{summary.overdueCount}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(summary.overdueAmount)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-yellow-100 text-yellow-600">
              <CircleAlert className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pending</p>
              <p className="text-xl font-bold">{summary.pendingCount}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(summary.pendingAmount)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <CircleAlert className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Outstanding</p>
              <p className="text-xl font-bold">{formatCurrency(summary.totalOutstanding)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receivables Table */}
      <Card>
        <CardHeader><CardTitle>Receivables</CardTitle></CardHeader>
        <CardContent className="p-0">
          {all.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No outstanding dues. All payments are up to date.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    {SORTABLE_COLUMNS.map(({ label, column, align }) => (
                      <SortableTh
                        key={column}
                        label={label}
                        column={column}
                        align={align}
                        basePath="/admin/finance/outstanding"
                        searchParams={sp as Record<string, string | undefined>}
                        currentSort={colSort}
                        currentDir={colDir}
                        paramNames={{ sort: "colSort", dir: "colDir" }}
                        className={`px-4 py-3 font-medium text-muted-foreground ${align === "right" ? "text-right" : "text-left"}`}
                      />
                    ))}
                    {canUseInstallments ? (
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {all.map((row) => {
                    const m = row.members as { full_name: string; member_code: string } | null;
                    const balance = Number(row.balance_amount);
                    return (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{m?.full_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{m?.member_code}</p>
                        </td>
                        <td className="px-4 py-3 capitalize">{row.receivable_type}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(Number(row.original_amount))}</td>
                        <td className="px-4 py-3 text-right text-green-600">{formatCurrency(Number(row.paid_amount))}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(balance)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.is_installment && row.next_installment_due_date ? (
                            <>
                              <span className="mr-1.5 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                Installment
                              </span>
                              <span className="text-xs text-muted-foreground">Next due {row.next_installment_due_date}</span>
                            </>
                          ) : (
                            (row.due_date ?? "—")
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[row.display_status] ?? "bg-gray-100 text-gray-600"}`}>
                            {row.display_status.replace("_", " ")}
                          </span>
                        </td>
                        {canUseInstallments ? (
                          <td className="px-4 py-3">
                            {row.invoice_id && balance > 0 ? (
                              <ReceivableRowActions
                                row={{
                                  invoiceId: row.invoice_id,
                                  balance,
                                  isInstallment: Boolean(row.is_installment),
                                  nextInstallmentDueDate: row.next_installment_due_date,
                                }}
                              />
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {total > all.length ? (
                <p className="px-4 py-3 text-xs text-muted-foreground">
                  Showing {all.length} of {total} outstanding receivables.
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
