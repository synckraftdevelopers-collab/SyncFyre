import { BadgeIndianRupee, BookOpen, FileText, List } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { listJournalEntries, listChartOfAccounts, getTrialBalance } from "@/services/finance.service";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Accounting" };

const subModules = [
  { label: "Chart of Accounts",  href: "/admin/finance/accounting/chart-of-accounts", icon: List,             desc: "Account hierarchy" },
  { label: "Journal Entries",    href: "/admin/finance/accounting/journal",            icon: FileText,         desc: "Double-entry bookkeeping" },
  { label: "General Ledger",     href: "/admin/finance/accounting/ledger",             icon: BookOpen,         desc: "Account-wise ledger" },
  { label: "Trial Balance",      href: "/admin/finance/accounting/trial-balance",      icon: BadgeIndianRupee, desc: "Debit & credit totals" },
  { label: "Profit & Loss",      href: "/admin/finance/reports/profit-loss",           icon: BadgeIndianRupee, desc: "Income vs Expenses" },
];

export default async function AccountingPage() {
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id;

  const [{ data: journals }, accounts, trialBalance] = await Promise.all([
    listJournalEntries({ branchId, page: 1, pageSize: 10 }),
    listChartOfAccounts(branchId),
    getTrialBalance(branchId),
  ]);

  const totalDebit  = trialBalance.reduce((s, r) => s + (r.debit  as number), 0);
  const totalCredit = trialBalance.reduce((s, r) => s + (r.credit as number), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Accounting</h1>
        <p className="text-sm text-muted-foreground">General ledger, journal entries and financial statements</p>
      </div>

      {/* Sub-module links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subModules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <m.icon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{m.label}</p>
              <p className="text-xs text-muted-foreground">{m.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Trial Balance Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Debit</p>
            <p className="mt-2 text-xl font-bold">{formatCurrency(totalDebit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Credit</p>
            <p className="mt-2 text-xl font-bold">{formatCurrency(totalCredit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Chart of Accounts</p>
            <p className="mt-2 text-xl font-bold">{accounts.length} accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Journal Entries */}
      <Card>
        <CardHeader><CardTitle>Recent Journal Entries</CardTitle></CardHeader>
        <CardContent className="p-0">
          {journals.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No journal entries yet.
            </div>
          ) : (
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
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {journals.map((j) => (
                    <tr key={j.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{j.journal_number}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{j.entry_date}</td>
                      <td className="px-4 py-3 max-w-[220px] truncate">{j.narration}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(j.total_debit))}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(j.total_credit))}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${j.status === "posted" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {j.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
