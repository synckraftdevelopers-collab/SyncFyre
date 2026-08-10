"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProgressPoint = {
  measured_at: string;
  weight_kg: number | null;
  bmi: number | null;
  body_fat_percent: number | null;
};

export function MemberProgressChart({ records }: { records: ProgressPoint[] }) {
  const data = [...records]
    .reverse()
    .map((record) => ({
      date: new Date(`${record.measured_at}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      weight: record.weight_kg,
      bmi: record.bmi,
      bodyFat: record.body_fat_percent,
    }));

  if (data.length < 2) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground"><span><i className="mr-1 inline-block size-2 rounded-full bg-primary" />Weight (kg)</span><span><i className="mr-1 inline-block size-2 rounded-full bg-emerald-500" />BMI</span><span><i className="mr-1 inline-block size-2 rounded-full bg-amber-500" />Body fat (%)</span></div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="hsl(var(--primary))" strokeWidth={2} connectNulls dot={{ r: 3 }} />
              <Line type="monotone" dataKey="bmi" name="BMI" stroke="#10b981" strokeWidth={2} connectNulls dot={{ r: 3 }} />
              <Line type="monotone" dataKey="bodyFat" name="Body fat (%)" stroke="#f59e0b" strokeWidth={2} connectNulls dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}