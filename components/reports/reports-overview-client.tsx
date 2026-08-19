"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BadgeIndianRupee,
  CalendarClock,
  CircleAlert,
  IndianRupee,
  Receipt,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import type { ReportsFilterState, ReportsOverviewResponse } from "@/types";

const CHART_COLORS = ["#22b978", "#52c7ea", "#f4b844", "#ff3024", "#0f766e", "#1d4ed8"];

function fmtCompact(value: number) {
  if (value >= 100000) return `?${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `?${(value / 1000).toFixed(0)}k`;
  return `?${value.toFixed(0)}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface Props {
  initialData: ReportsOverviewResponse;
}

export function ReportsOverviewClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState<ReportsFilterState>(initialData.filters.applied);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"live" | "reconnecting" | "fallback">("live");

  async function load(nextFilters: ReportsFilterState, mode: "manual" | "silent" = "manual") {
    if (mode === "manual") setLoading(true);
    setError(null);

    try {
      const search = new URLSearchParams();
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value && value !== "all") search.set(key, String(value));
      });
      const response = await fetch(`/api/reports/overview?${search.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to load this report.");
      }
      const payload = (await response.json()) as ReportsOverviewResponse;
      setData(payload);
      setFilters(payload.filters.applied);
      setConnectionStatus("live");
    } catch (loadError) {
      setConnectionStatus("fallback");
      setError(loadError instanceof Error ? loadError.message : "Unable to load this report.");
    } finally {
      if (mode === "manual") setLoading(false);
    }
  }

  async function applyFilters() {
    if (filters.datePreset === "custom" && (!filters.dateFrom || !filters.dateTo)) {
      setError("Choose both a start date and an end date before applying a custom range.");
      return;
    }

    // Pass a snapshot so the request always reflects the values shown when Apply was clicked.
    await load({ ...filters });
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("reports-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => void load(filters, "silent"))
      .on("postgres_changes", { event: "*", schema: "public", table: "income" }, () => void load(filters, "silent"))
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => void load(filters, "silent"))
      .on("postgres_changes", { event: "*", schema: "public", table: "receivables" }, () => void load(filters, "silent"))
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => void load(filters, "silent"))
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () => void load(filters, "silent"))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnectionStatus("live");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnectionStatus("reconnecting");
        if (status === "CLOSED") setConnectionStatus("fallback");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [filters]);

  const applied = data.filters.applied;
  const noData =
    data.summary.totalRevenue === 0 &&
    data.summary.totalExpenses === 0 &&
    data.summary.outstanding === 0 &&
    data.tableData.length === 0;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-[#071d38] px-6 py-7 text-white shadow-[0_16px_45px_rgba(7,29,56,.18)] md:px-8">
        <div className="absolute -right-16 -top-20 size-56 rounded-full border-[38px] border-[#52c7ea]/10" />
        <div className="absolute bottom-0 right-24 h-24 w-4 skew-x-[-28deg] bg-primary/80" />
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#52c7ea]">Reports Overview</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Real-time financial and operational analytics</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/70">
          Every KPI and chart below is recalculated from live SyncFyre data using the existing finance, membership, attendance, and receivables tables.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/75">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
            {connectionStatus === "live" ? "Live" : connectionStatus === "reconnecting" ? "Reconnecting..." : "Fallback refresh"}
          </span>
          <span>Last updated: {formatDateTime(data.generatedAt)}</span>
          <span>{applied.dateFrom} to {applied.dateTo}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Select value={filters.datePreset ?? "this_month"} onChange={(event) => setFilters((current) => ({ ...current, datePreset: event.target.value }))}>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
            <option value="last_week">Last Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </Select>
          <Select value={filters.branchId ?? "all"} onChange={(event) => setFilters((current) => ({ ...current, branchId: event.target.value }))}>
            {data.filters.options.branches.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select value={filters.paymentMode ?? "all"} onChange={(event) => setFilters((current) => ({ ...current, paymentMode: event.target.value }))}>
            {data.filters.options.paymentModes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select value={filters.incomeCategoryId ?? "all"} onChange={(event) => setFilters((current) => ({ ...current, incomeCategoryId: event.target.value }))}>
            {data.filters.options.incomeCategories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select value={filters.expenseCategoryId ?? "all"} onChange={(event) => setFilters((current) => ({ ...current, expenseCategoryId: event.target.value }))}>
            {data.filters.options.expenseCategories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Button type="button" onClick={() => void applyFilters()} disabled={loading}>
            {loading ? "Applying..." : "Apply"}
          </Button>
          {filters.datePreset === "custom" && (
            <>
              <Input type="date" value={filters.dateFrom ?? ""} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} />
              <Input type="date" value={filters.dateTo ?? ""} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} />
            </>
          )}
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="font-semibold">Unable to load this report.</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={() => void load(filters)}>Retry</Button>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}
        </div>
      ) : noData ? (
        <Card>
          <CardContent className="p-8 text-sm text-muted-foreground">
            No financial data available for {applied.dateFrom} to {applied.dateTo}.
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Revenue" value={formatCurrency(data.summary.totalRevenue)} icon={BadgeIndianRupee} tone="green" />
            <MetricCard label="Total Expenses" value={formatCurrency(data.summary.totalExpenses)} icon={TrendingDown} />
            <MetricCard label="Net Profit" value={formatCurrency(data.summary.netProfit)} detail={`${data.summary.profitMargin.toFixed(1)}% margin`} icon={TrendingUp} tone={data.summary.netProfit >= 0 ? "green" : "orange"} />
            <MetricCard label="Outstanding" value={formatCurrency(data.summary.outstanding)} icon={CircleAlert} />
            <MetricCard label="Today's Collection" value={formatCurrency(data.summary.todayCollection)} icon={IndianRupee} tone="blue" />
            <MetricCard label="Monthly Collection" value={formatCurrency(data.summary.monthlyCollection)} icon={Receipt} tone="blue" />
            <MetricCard label="Active Members" value={data.summary.activeMembers} icon={Users} tone="purple" />
            <MetricCard label="Attendance" value={data.summary.attendance} detail={`${data.summary.newMembers} new members, ${data.summary.renewals} renewals`} icon={Activity} tone="purple" />
          </section>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Monthly Profit Trend</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chartData.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={60} tickFormatter={fmtCompact} />
                    <Tooltip formatter={(value: any, name: any) => [formatCurrency(Number(value ?? 0)), String(name)]} />
                    <Area type="monotone" dataKey="revenue" stroke="#22b978" fill="#22b97822" strokeWidth={2} />
                    <Area type="monotone" dataKey="expenses" stroke="#ff3024" fill="#ff302422" strokeWidth={2} />
                    <Area type="monotone" dataKey="profit" stroke="#52c7ea" fill="#52c7ea18" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Mode Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="75%">
                  <PieChart>
                    <Pie data={data.chartData.paymentModes} dataKey="amount" nameKey="mode" innerRadius={55} outerRadius={82} paddingAngle={2}>
                      {data.chartData.paymentModes.map((entry, index) => <Cell key={entry.mode} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {data.chartData.paymentModes.map((entry, index) => (
                    <span key={entry.mode} className="flex items-center gap-2 capitalize">
                      <i className="size-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      {entry.mode} ({entry.count})
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="xl:col-span-3">
              <CardHeader>
                <CardTitle>Outstanding Aging</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData.outstandingAging}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis dataKey="bucket" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={60} tickFormatter={fmtCompact} />
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value ?? 0))} />
                    <Bar dataKey="amount" radius={[10, 10, 0, 0]}>
                      {data.chartData.outstandingAging.map((entry, index) => <Cell key={entry.bucket} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
          <section className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Financial Snapshot</CardTitle>
                <p className="text-sm text-muted-foreground">Revenue, costs, and profit at a glance.</p>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ label: "Revenue", amount: data.summary.totalRevenue }, { label: "Expenses", amount: data.summary.totalExpenses }, { label: "Profit", amount: data.summary.netProfit }]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={60} tickFormatter={fmtCompact} />
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value ?? 0))} />
                    <Bar dataKey="amount" fill="#52c7ea" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Collection Efficiency</CardTitle>
                <p className="text-sm text-muted-foreground">Collected revenue versus outstanding balance.</p>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ name: "Collected", value: data.summary.collectionEfficiency }, { name: "Outstanding", value: Math.max(0, 100 - data.summary.collectionEfficiency) }]} dataKey="value" innerRadius={58} outerRadius={84} startAngle={90} endAngle={-270} paddingAngle={2}>
                      <Cell fill="#22b978" />
                      <Cell fill="#e5e7eb" />
                    </Pie>
                    <Tooltip formatter={(value: any) => `${Number(value ?? 0).toFixed(1)}%`} />
                    <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-xl font-bold">{data.summary.collectionEfficiency.toFixed(1)}%</text>
                    <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">Collected</text>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Member Activity</CardTitle>
                <p className="text-sm text-muted-foreground">Membership movement in the selected period.</p>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ label: "Members", active: data.summary.activeMembers, new: data.summary.newMembers, renewals: data.summary.renewals, attendance: data.summary.attendance }]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={48} />
                    <Tooltip />
                    <Bar dataKey="active" name="Active" fill="#52c7ea" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="new" name="New" fill="#22b978" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="renewals" name="Renewals" fill="#f4b844" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="attendance" name="Attendance" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </section>

            <CardHeader>
              <CardTitle>Drill-down Transactions</CardTitle>
              <p className="text-sm text-muted-foreground">Recent income, expense, and outstanding records behind the overview numbers.</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">Date</th>
                    <th className="py-3 pr-4 font-medium">Type</th>
                    <th className="py-3 pr-4 font-medium">Category</th>
                    <th className="py-3 pr-4 font-medium">Member</th>
                    <th className="py-3 pr-4 font-medium">Branch</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tableData.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 whitespace-nowrap">{row.date || "-"}</td>
                      <td className="py-3 pr-4 capitalize">{row.type}</td>
                      <td className="py-3 pr-4">{row.category}</td>
                      <td className="py-3 pr-4">{row.memberName ?? "-"}</td>
                      <td className="py-3 pr-4">{row.branchName ?? "-"}</td>
                      <td className="py-3 pr-4 capitalize">{row.status.replaceAll("_", " ")}</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Collection Efficiency" value={`${data.summary.collectionEfficiency.toFixed(1)}%`} icon={TrendingUp} tone={data.summary.collectionEfficiency >= 80 ? "green" : "orange"} />
            <MetricCard label="Average Revenue / Member" value={formatCurrency(data.summary.averageRevenuePerMember)} icon={IndianRupee} tone="blue" />
            <MetricCard label="Renewals" value={data.summary.renewals} detail="Subscription renewals in selected period" icon={CalendarClock} tone="purple" />
          </section>
        </>
      )}
    </div>
  );
}

