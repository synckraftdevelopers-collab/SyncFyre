import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
  tone?: "orange" | "green" | "blue" | "purple";
  href?: string;
}

export function MetricCard({ label, value, detail, icon: Icon, tone = "orange", href }: MetricCardProps) {
  const tones = {
    orange: "bg-[#ff3024]/10 text-[#ff3024]",
    green:  "bg-[#22b978]/12 text-[#15a568]",
    blue:   "bg-[#52c7ea]/15 text-[#168caf]",
    purple: "bg-[#f4b844]/15 text-[#b97c08]",
  };

  const inner = (
    <CardContent className="relative flex min-h-24 items-start justify-between p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[.08em] text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </div>
      <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="size-4" />
      </div>
    </CardContent>
  );

  const cardClass = "overflow-hidden transition-colors hover:bg-muted/30";

  if (href) {
    return (
      <Link href={href} className="block">
        <Card className={`${cardClass} cursor-pointer`}>{inner}</Card>
      </Link>
    );
  }

  return <Card className={cardClass}>{inner}</Card>;
}
