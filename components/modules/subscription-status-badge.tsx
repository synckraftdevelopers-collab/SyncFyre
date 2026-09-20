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

/**
 * `status` + `gracePeriodDays` are optional (13-prompt sprint, Prompt 5:
 * Grace Period): pass them wherever a subscription can currently be
 * "active" with a past end_date because it's inside a Growth/Scale grace
 * window (see migration 0053_grace_period_for_lapsed_subscriptions.sql —
 * a fixed, non-configurable 7-day grace period; expire_overdue_subscriptions()
 * doesn't sweep it to 'expired' until the window closes). Without them this
 * renders exactly as before, so existing callers are unaffected.
 */
export function SubscriptionExpiryBadge({
  endDate,
  status,
  gracePeriodDays = 0,
}: {
  endDate: string | null | undefined;
  status?: string | null;
  gracePeriodDays?: number;
}) {
  const days = getDaysRemaining(endDate);
  if (days === null) return <span className="text-sm text-muted-foreground">No expiry date</span>;

  if (status === "active" && days < 0 && gracePeriodDays > 0 && Math.abs(days) <= gracePeriodDays) {
    const daysLeftInGrace = gracePeriodDays - Math.abs(days);
    return (
      <Badge variant="warning">
        Grace period — {daysLeftInGrace > 0 ? `${daysLeftInGrace}d left` : "ends today"}
      </Badge>
    );
  }

  if (days < 0) return <Badge variant="danger">Expired {Math.abs(days)}d ago</Badge>;
  if (days === 0) return <Badge variant="danger">Expires today</Badge>;
  if (days <= 7) return <Badge variant="warning">{days}d left</Badge>;
  if (days <= 30) return <Badge variant="outline">{days}d left</Badge>;
  return <Badge variant="success">{days}d left</Badge>;
}
