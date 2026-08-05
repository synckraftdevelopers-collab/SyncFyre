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
import type { RevenuePoint, AttendancePoint, PlanPoint } from "@/services/dashboard.service";

interface DashboardChartsProps {
  revenueData?: RevenuePoint[];
  attendanceData?: AttendancePoint[];
  planData?: PlanPoint[];
}

export function DashboardCharts({
  revenueData = [],
  attendanceData = [],
  planData = [],
}: DashboardChartsProps) {
  const hasRevenue = revenueData.some((d) => d.v > 0);
  const hasAttendance = attendanceData.some((d) => d.v > 0);
  const hasPlans = planData.length > 0;

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {/* Revenue overview */}
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Revenue overview</CardTitle>
          <p className="text-xs text-muted-foreground">Last 6 months — completed payments</p>
        </CardHeader>
        <CardContent className="h-72">
          {!hasRevenue ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              No payment data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ff3024" stopOpacity={0.35} />
                    <stop offset="1" stopColor="#ff3024" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={55}
                  tickFormatter={(v) =>
                    v >= 100000
                      ? `₹${(v / 100000).toFixed(1)}L`
                      : v >= 1000
                      ? `₹${(v / 1000).toFixed(0)}k`
                      : `₹${v}`
                  }
                />
                <Tooltip
                  formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#ff3024"
                  strokeWidth={3}
                  fill="url(#rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Subscription distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription distribution</CardTitle>
          <p className="text-xs text-muted-foreground">Active subscriptions by plan</p>
        </CardHeader>
        <CardContent className="h-72">
          {!hasPlans ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              No active subscriptions.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="75%">
                <PieChart>
                  <Pie
                    data={planData}
                    dataKey="value"
                    innerRadius={55}
                    outerRadius={82}
                    paddingAngle={3}
                  >
                    {planData.map((p) => (
                      <Cell key={p.name} fill={p.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2">
                {planData.map((p) => (
                  <span key={p.name} className="text-xs text-muted-foreground">
                    <i
                      className="mr-2 inline-block size-2 rounded-full"
                      style={{ background: p.color }}
                    />
                    {p.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Weekly attendance */}
      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle>Weekly attendance</CardTitle>
          <p className="text-xs text-muted-foreground">Last 7 days</p>
        </CardHeader>
        <CardContent className="h-64">
          {!hasAttendance ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              No attendance data for this week.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="d" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [v, "Visits"]} />
                <Bar dataKey="v" fill="#52c7ea" radius={[6, 6, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
