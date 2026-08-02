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

export function ModuleOverview({ config, actionHref }: { config: ModuleConfig; actionHref: string }) {
  const Icon = config.icon;
  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold">{config.title}</h1><p className="text-sm text-muted-foreground">{config.description}</p></div><Link href={actionHref} className={buttonVariants({ className: "sm:ml-auto" })}><Plus className="size-4"/>{config.action}</Link></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{config.features.map((feature) => <Card key={feature.title}><CardHeader><div className="mb-3 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5"/></div><CardTitle>{feature.title}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{feature.description}</p></CardContent></Card>)}</div>
    <Card><CardContent className="grid min-h-56 place-items-center p-8 text-center"><div><Icon className="mx-auto mb-3 size-10 text-muted-foreground"/><p className="font-medium">No records yet</p><p className="mt-1 text-sm text-muted-foreground">Records will appear here after your team creates them.</p></div></CardContent></Card>
  </div>;
}
