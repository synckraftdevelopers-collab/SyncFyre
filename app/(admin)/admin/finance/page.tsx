import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CalendarClock,
  CircleAlert,
  IndianRupee,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import {
  getFinanceDashboardMetrics,
  getFinanceRevenueTrend,
  getPaymentModeBreakdown,
  getReceivableAging,
} from "@/services/finance.service";
import { FinanceCharts } from "@/components/finance/finance-charts";

export const metadata = { title: "Finance" };

const primaryLinks = [
  { label: "Dashboard", href: "/admin/finance", icon: IndianRupee, desc: "Finance overview" },
  { label: "Income", href: "/admin/finance/income", icon: ArrowUpCircle, desc: "Record and review revenue" },
  { label: "Expenses", href: "/admin/finance/expenses", icon: ArrowDownCircle, desc: "Manage business expenses" },
  { label: "Payments", href: "/admin/finance/payments", icon: IndianRupee, desc: "Reuse the existing payment ledger" },
  { label: "Invoices", href: "/admin/finance/invoices", icon: ReceiptText, desc: "Invoice records with GST values" },
  { label: "GST", href: "/admin/finance/gst", icon: ReceiptText, desc: "GST dashboard, summary, and CA export" },
  { label: "Receivables", href: "/admin/finance/receivables", icon: CircleAlert, desc: "Outstanding dues and follow-up" },
  { label: "Cash Book", href: "/admin/finance/cash-book", icon: Banknote, desc: "Cash movements and balance" },
  { label: "Settings", href: "/admin/finance/settings", icon: Users, desc: "Branch, GST, and finance settings" },
];

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ date_from?: string; date_to?: string }>;
}) {
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id;
  const params = await searchParams;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dateFrom = params.date_from ?? formatDateInput(monthStart);
  const dateTo = params.date_to ?? formatDateInput(now);

  const [metrics, trend, modes, aging] = await Promise.all([
    getFinanceDashboardMetrics(branchId, dateFrom, dateTo),
    getFinanceRevenueTrend(branchId, 6, dateFrom, dateTo),
    getPaymentModeBreakdown(branchId, dateFrom, dateTo),
    getReceivableAging(branchId),
  ]);

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-3xl bg-[#071d38] px-6 py-7 text-white shadow-[0_16px_45px_rgba(7,29,56,.18)] md:px-8">
        <div className="absolute -right-16 -top-20 size-56 rounded-full border-[38px] border-[#52c7ea]/10" />
        <div className="absolute bottom-0 right-28 h-24 w-4 skew-x-[-28deg] bg-primary/80" />
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#52c7ea]">Finance</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Finance Dashboard</h1>
        <p className="mt-2 max-w-xl text-sm text-white/55">
          Finance remains the source of truth. GST stays under Finance and reads from the same payment, invoice, income, and GST transaction records.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form className="flex flex-wrap gap-3">
            <input name="date_from" type="date" defaultValue={dateFrom} className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <input name="date_to" type="date" defaultValue={dateTo} className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <button type="submit" className="h-10 rounded-lg bg-[#ff3b30] px-5 text-sm font-semibold text-white hover:bg-[#e5352b]">Apply</button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Showing period: {dateFrom} to {dateTo}. Revenue, expenses, GST, and receivables follow this range. Cash and bank values remain point-in-time balances as of {dateTo}.
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Selected Period Collection" value={formatCurrency(metrics.selectedCollection)} icon={IndianRupee} tone="green" />
        <MetricCard label="Membership Revenue" value={formatCurrency(metrics.membershipRevenue)} icon={Users} tone="blue" />
        <MetricCard label="Total Revenue" value={formatCurrency(metrics.totalRevenue)} icon={IndianRupee} tone="green" />
        <MetricCard label="Total Expenses" value={formatCurrency(metrics.totalExpenses)} icon={TrendingDown} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Net Profit" value={formatCurrency(metrics.netProfit)} icon={TrendingUp} tone={metrics.netProfit >= 0 ? "green" : "orange"} />
        <MetricCard label={`Cash in Hand as of ${dateTo}`} value={formatCurrency(metrics.cashInHand)} icon={Banknote} tone="blue" />
        <MetricCard label="Outstanding Dues" value={formatCurrency(metrics.outstandingReceivables)} icon={CircleAlert} />
        <MetricCard label="GST Collected" value={formatCurrency(metrics.gstCollected)} icon={ReceiptText} tone="orange" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Members" value={metrics.activeMembers} icon={Users} tone="blue" />
        <MetricCard label="Renewals Due (30d)" value={metrics.membershipsRenewingDue} icon={CalendarClock} />
        <MetricCard label="Collection Efficiency" value={`${metrics.collectionEfficiency}%`} icon={TrendingUp} tone={metrics.collectionEfficiency >= 80 ? "green" : "orange"} />
        <MetricCard label="Avg Revenue / Member" value={formatCurrency(metrics.avgRevenuePerMember)} icon={IndianRupee} tone="purple" />
      </section>

      <FinanceCharts trend={trend} modes={modes} aging={aging} />

      <Card>
        <CardHeader>
          <CardTitle>Finance Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <link.icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{link.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{link.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
