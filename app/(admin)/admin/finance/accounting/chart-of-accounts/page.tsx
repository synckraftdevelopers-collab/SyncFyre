import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { listChartOfAccounts } from "@/services/finance.service";

export const metadata = { title: "Chart of Accounts" };

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  asset:     "bg-blue-100 text-blue-700",
  liability: "bg-red-100 text-red-700",
  equity:    "bg-purple-100 text-purple-700",
  income:    "bg-green-100 text-green-700",
  expense:   "bg-orange-100 text-orange-700",
};

export default async function ChartOfAccountsPage() {
  const profile = await getCurrentProfile();
  const accounts = await listChartOfAccounts(profile?.branch_id);

  // Group by account type
  const grouped = accounts.reduce<Record<string, typeof accounts>>((acc, a) => {
    const type = a.account_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(a);
    return acc;
  }, {});

  const types = ["asset", "liability", "equity", "income", "expense"] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/finance/accounting"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4" /> Accounting
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">
            {accounts.length} accounts across {Object.keys(grouped).length} types
          </p>
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No accounts configured yet. Chart of accounts is typically set up during initial system configuration.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {types.map((type) => {
            const group = grouped[type];
            if (!group?.length) return null;
            return (
              <Card key={type}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base capitalize">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACCOUNT_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-700"}`}>
                      {type}
                    </span>
                    <span className="text-muted-foreground font-normal text-sm">
                      {group.length} account{group.length !== 1 ? "s" : ""}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Code</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Account Name</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                          <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Opening Balance</th>
                          <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {group.map((acc) => (
                          <tr key={acc.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-xs font-semibold">{acc.account_code}</td>
                            <td className="px-4 py-2.5 font-medium">
                              {acc.parent_id && <span className="mr-1 text-muted-foreground">└</span>}
                              {acc.account_name}
                              {acc.is_system && (
                                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                                  system
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 max-w-[200px] truncate text-muted-foreground">
                              {acc.description ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {formatCurrency(Number(acc.opening_balance))}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge variant={acc.status === "active" ? "default" : "outline"} className="text-[10px]">
                                {acc.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
