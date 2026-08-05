"use client";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  FinanceRevenuePoint,
  FinancePaymentModePoint,
  FinanceReceivableAgingPoint,
} from "@/types";

const MODE_COLORS: Record<string, string> = {
  cash:   "#22b978",
  upi:    "#52c7ea",
  card:   "#ff3024",
  online: "#f4b844",
};

const AGING_COLORS: Record<string, string> = {
  "0-30":  "#22b978",
  "31-60": "#f4b844",
  "61-90": "#ff8c00",
  "90+":   "#ff3024",
};

function fmt(v: number) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)   return `₹${(v / 1000).toFixed(0)}k`;
  return `₹${v}`;
}

interface FinanceChartsProps {
  trend: FinanceRevenuePoint[];
  modes: FinancePaymentModePoint[];
  aging: FinanceReceivableAgingPoint[];
}

export function FinanceCharts({ trend, modes, aging }: FinanceChartsProps) {
  const hasT = trend.some((d) => d.income > 0 || d.expense > 0);
  const hasM = modes.some((d) => d.amount > 0);
  const hasA = aging.some((d) => d.amount > 0);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {/* Revenue vs Expense Trend */}
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Revenue vs Expenses</CardTitle>
          <p className="text-xs text-muted-foreground">Last 6 months</p>
        </CardHeader>
        <CardContent className="h-72">
          {!hasT ? (
            <Empty text="No transactions recorded yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#22b978" stopOpacity={0.35} />
                    <stop offset="1" stopColor="#22b978" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ff3024" stopOpacity={0.25} />
                    <stop offset="1" stopColor="#ff3024" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={58} tickFormatter={fmt} />
                <Tooltip
                  formatter={(v, name) => [
                    `₹${Number(v).toLocaleString("en-IN")}`,
                    String(name) === "income" ? "Income" : String(name) === "expense" ? "Expenses" : "Profit",
                  ]}
                />
                <Area type="monotone" dataKey="income"  stroke="#22b978" strokeWidth={2} fill="url(#incGrad)" />
                <Area type="monotone" dataKey="expense" stroke="#ff3024" strokeWidth={2} fill="url(#expGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Payment Mode Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Modes</CardTitle>
          <p className="text-xs text-muted-foreground">Collection by method</p>
        </CardHeader>
        <CardContent className="h-72">
          {!hasM ? (
            <Empty text="No income data yet." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height="75%">
                <PieChart>
                  <Pie
                    data={modes}
                    dataKey="amount"
                    nameKey="mode"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                  >
                    {modes.map((m) => (
                      <Cell
                        key={m.mode}
                        fill={MODE_COLORS[m.mode] ?? "#a78bfa"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, name) => [
                      `₹${Number(v).toLocaleString("en-IN")}`,
                      String(name).toUpperCase(),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {modes.map((m) => (
                  <span key={m.mode} className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                    <i
                      className="inline-block size-2 rounded-full shrink-0"
                      style={{ background: MODE_COLORS[m.mode] ?? "#a78bfa" }}
                    />
                    {m.mode} ({m.count})
                  </span>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Outstanding Aging */}
      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle>Outstanding Aging</CardTitle>
          <p className="text-xs text-muted-foreground">Overdue receivables by age bucket</p>
        </CardHeader>
        <CardContent className="h-56">
          {!hasA ? (
            <Empty text="No outstanding dues." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aging} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={fmt} />
                <YAxis type="category" dataKey="bucket" tickLine={false} axisLine={false} width={52} />
                <Tooltip
                  formatter={(v, name) => [
                    `₹${Number(v).toLocaleString("en-IN")}`,
                    String(name) === "amount" ? "Amount" : String(name),
                  ]}
                />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]} maxBarSize={36}>
                  {aging.map((a) => (
                    <Cell key={a.bucket} fill={AGING_COLORS[a.bucket] ?? "#a78bfa"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="grid h-full place-items-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
