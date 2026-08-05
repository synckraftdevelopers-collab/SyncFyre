import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ModuleConfig {
  title: string;
  description: string;
  icon: LucideIcon;
  action: string;
  features: { title: string; description: string }[];
}

type ResourceRecord = Record<string, unknown> & { id?: string };

function labelFor(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function valueFor(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function ModuleOverview({ config, actionHref, records = [], error }: { config: ModuleConfig; actionHref: string; records?: ResourceRecord[]; error?: string }) {
  const Icon = config.icon;
  const hiddenColumns = new Set(["id", "branch_id", "created_by", "collected_by", "recorded_by", "updated_at"]);
  const columns = records.length
    ? Object.keys(records[0]).filter((key) => !hiddenColumns.has(key)).slice(0, 7)
    : [];
  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold">{config.title}</h1><p className="text-sm text-muted-foreground">{config.description}</p></div><Link href={actionHref} className={buttonVariants({ className: "sm:ml-auto" })}><Plus className="size-4"/>{config.action}</Link></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{config.features.map((feature) => <Card key={feature.title}><CardHeader><div className="mb-3 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5"/></div><CardTitle>{feature.title}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{feature.description}</p></CardContent></Card>)}</div>
    <Card>{error ? <CardContent className="grid min-h-40 place-items-center p-8 text-center"><div><p className="font-medium text-destructive">Unable to load records</p><p className="mt-1 text-sm text-muted-foreground">{error}</p></div></CardContent> : records.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr>{columns.map(column => <th key={column} className="px-4 py-3 font-medium">{labelFor(column)}</th>)}</tr></thead><tbody className="divide-y">{records.map((record, index) => <tr key={record.id ?? index} className="hover:bg-muted/30">{columns.map(column => <td key={column} className="max-w-64 truncate px-4 py-3" title={valueFor(record[column])}>{valueFor(record[column])}</td>)}</tr>)}</tbody></table></div> : <CardContent className="grid min-h-56 place-items-center p-8 text-center"><div><Icon className="mx-auto mb-3 size-10 text-muted-foreground"/><p className="font-medium">No records yet</p><p className="mt-1 text-sm text-muted-foreground">Records will appear here after your team creates them.</p></div></CardContent>}</Card>
  </div>;
}
