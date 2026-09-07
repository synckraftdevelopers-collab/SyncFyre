import { Badge } from "@/components/ui/badge";

const statusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "outline" | "default" }> = {
  active: { label: "Active", variant: "success" },
  paused: { label: "Paused", variant: "warning" },
  pending: { label: "Pending", variant: "warning" },
  expired: { label: "Expired", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export function SubscriptionStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge variant="outline">Unknown</Badge>;
  const cfg = statusMap[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function getDaysRemaining(endDate: string | null | undefined) {
  if (!endDate) return null;
  const target = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function SubscriptionExpiryBadge({ endDate }: { endDate: string | null | undefined }) {
  const days = getDaysRemaining(endDate);
  if (days === null) return <span className="text-sm text-muted-foreground">No expiry date</span>;
  if (days < 0) return <Badge variant="danger">Expired {Math.abs(days)}d ago</Badge>;
  if (days === 0) return <Badge variant="danger">Expires today</Badge>;
  if (days <= 7) return <Badge variant="warning">{days}d left</Badge>;
  if (days <= 30) return <Badge variant="outline">{days}d left</Badge>;
  return <Badge variant="success">{days}d left</Badge>;
}
