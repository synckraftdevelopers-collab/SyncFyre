import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeIndianRupee,
  Banknote,
  Building2,
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

const quickLinks = [
  { label: "Income",       href: "/admin/finance/income",            icon: ArrowUpCircle,    desc: "Record & view income" },
  { label: "Expenses",     href: "/admin/finance/expenses",          icon: ArrowDownCircle,  desc: "Manage & approve expenses" },
  { label: "Cash Book",    href: "/admin/finance/cash-book",         icon: Banknote,         desc: "Daily cash flow" },
  { label: "Bank",         href: "/admin/finance/bank",              icon: Building2,        desc: "Bank accounts & transactions" },
  { label: "Outstanding",  href: "/admin/finance/outstanding",       icon: CircleAlert,      desc: "Dues & receivables" },
  { label: "GST",          href: "/admin/finance/gst",               icon: ReceiptText,      desc: "GST returns & summary" },
  { label: "P&L",          href: "/admin/finance/reports/profit-loss", icon: TrendingUp,     desc: "Profit & Loss statement" },
  { label: "Accounting",   href: "/admin/finance/accounting",        icon: BadgeIndianRupee, desc: "Journal, ledger, COA" },
];

export default async function FinancePage() {
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id;

  const [metrics, trend, modes, aging] = await Promise.all([
    getFinanceDashboardMetrics(branchId),
    getFinanceRevenueTrend(branchId),
    getPaymentModeBreakdown(branchId),
    getReceivableAging(branchId),
  ]);

  return (
    <div className="space-y-7">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#071d38] px-6 py-7 text-white shadow-[0_16px_45px_rgba(7,29,56,.18)] md:px-8">
        <div className="absolute -right-16 -top-20 size-56 rounded-full border-[38px] border-[#52c7ea]/10" />
        <div className="absolute bottom-0 right-28 h-24 w-4 skew-x-[-28deg] bg-primary/80" />
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#52c7ea]">Finance & Accounting</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Finance Dashboard</h1>
        <p className="mt-2 max-w-xl text-sm text-white/55">
          Complete financial overview — income, expenses, cash flow, and outstanding dues.
        </p>
      </div>

      {/* KPI Cards — row 1 */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Today's Collection"
          value={formatCurrency(metrics.todayCollection)}
          icon={IndianRupee}
          tone="green"
        />
        <MetricCard
          label="Monthly Collection"
          value={formatCurrency(metrics.monthlyCollection)}
          icon={TrendingUp}
          tone="blue"
        />
        <MetricCard
          label="Total Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          icon={BadgeIndianRupee}
          tone="green"
        />
        <MetricCard
          label="Total Expenses"
          value={formatCurrency(metrics.totalExpenses)}
          icon={TrendingDown}
        />
      </section>

      {/* KPI Cards — row 2 */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Net Profit"
          value={formatCurrency(metrics.netProfit)}
          icon={TrendingUp}
          tone={metrics.netProfit >= 0 ? "green" : "orange"}
        />
        <MetricCard
          label="Cash in Hand"
          value={formatCurrency(metrics.cashInHand)}
          icon={Banknote}
          tone="blue"
        />
        <MetricCard
          label="Bank Balance"
          value={formatCurrency(metrics.bankBalance)}
          icon={Building2}
          tone="purple"
        />
        <MetricCard
          label="Outstanding Dues"
          value={formatCurrency(metrics.outstandingReceivables)}
          icon={CircleAlert}
        />
      </section>

      {/* KPI Cards — row 3 */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active Members"
          value={metrics.activeMembers}
          icon={Users}
          tone="blue"
        />
        <MetricCard
          label="Renewals Due (30d)"
          value={metrics.membershipsRenewingDue}
          icon={CalendarClock}
        />
        <MetricCard
          label="Collection Efficiency"
          value={`${metrics.collectionEfficiency}%`}
          icon={TrendingUp}
          tone={metrics.collectionEfficiency >= 80 ? "green" : "orange"}
        />
        <MetricCard
          label="Avg Revenue / Member"
          value={formatCurrency(metrics.avgRevenuePerMember)}
          icon={IndianRupee}
          tone="purple"
        />
      </section>

      {/* Charts */}
      <FinanceCharts trend={trend} modes={modes} aging={aging} />

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Finance Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
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
