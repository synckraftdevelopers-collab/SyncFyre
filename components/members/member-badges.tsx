import { Badge } from "@/components/ui/badge";

// ─── Membership status ────────────────────────────────────────────────────────

export function SubscriptionStatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline">No plan</Badge>;
  const map: Record<string, { label: string; variant: "success" | "warning" | "danger" | "outline" | "default" }> = {
    active:    { label: "Active",    variant: "success" },
    expired:   { label: "Expired",   variant: "danger"  },
    pending:   { label: "Pending",   variant: "warning" },
    cancelled: { label: "Cancelled", variant: "outline" },
    paused:    { label: "Paused",    variant: "warning" },
  };
  const cfg = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ─── Member active/inactive ───────────────────────────────────────────────────

export function MemberStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "active" ? "success" : "outline"}>
      {status === "active" ? "Active" : "Inactive"}
    </Badge>
  );
}

// ─── Days remaining ───────────────────────────────────────────────────────────

export function DaysRemainingBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-muted-foreground text-xs">—</span>;
  if (days < 0)
    return (
      <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
        Expired {Math.abs(days)}d ago
      </span>
    );
  if (days === 0)
    return (
      <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
        Expires today
      </span>
    );
  if (days <= 7)
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
        {days}d left
      </span>
    );
  if (days <= 30)
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600">
        {days}d left
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
      {days}d left
    </span>
  );
}

// ─── Payment status ───────────────────────────────────────────────────────────

export function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "danger" | "outline" | "default" }> = {
    paid:     { label: "Paid",     variant: "success" },
    partial:  { label: "Partial",  variant: "warning" },
    unpaid:   { label: "Unpaid",   variant: "danger"  },
    void:     { label: "Void",     variant: "outline" },
    completed: { label: "Paid",    variant: "success" },
    pending:  { label: "Pending",  variant: "warning" },
    failed:   { label: "Failed",   variant: "danger"  },
    refunded: { label: "Refunded", variant: "outline" },
  };
  const cfg = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ─── Attendance today ─────────────────────────────────────────────────────────

export function AttendanceTodayBadge({ present }: { present: boolean }) {
  return present ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
      <span className="size-1.5 rounded-full bg-emerald-500" />
      Present
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Absent
    </span>
  );
}
