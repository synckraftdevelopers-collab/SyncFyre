"use client";

import { useMemo, useState, useCallback } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
  Pencil,
  UserX,
  RotateCcw,
  CreditCard,
  Dumbbell,
  FileText,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Settings2,
  UserRound,
  Share2,
  Phone,
  MessageSquare,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import type { MemberRegisterRow } from "@/types";
import { MemberAvatar } from "./member-avatar";
import {
  MemberStatusBadge,
  SubscriptionStatusBadge,
  DaysRemainingBadge,
  AttendanceTodayBadge,
} from "./member-badges";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { deactivateMemberAction } from "@/app/actions/member-management-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Attendance today map (passed from server) ────────────────────────────────

type AttendanceMap = Record<string, boolean>;   // member_id → present today
type PaymentMap    = Record<string, string>;    // member_id → invoice status
type AmountPaidMap = Record<string, number>;    // member_id → amount paid

// ─── Column helper ────────────────────────────────────────────────────────────

const helper = createColumnHelper<MemberRegisterRow>();

// All column IDs for visibility toggle
const ALL_COLUMNS = [
  "serial", "member_code", "photo", "full_name", "phone", "gender",
  "current_plan", "joined_date", "subscription_end", "days_remaining",
  "assigned_trainer", "subscription_status", "payment_status",
  "total_amount", "amount_paid", "balance", "attendance_today",
  "last_visit", "branch_name", "actions",
] as const;

const COLUMN_LABELS: Record<string, string> = {
  serial: "#", member_code: "Member Code", photo: "Photo",
  full_name: "Name", phone: "Mobile", gender: "Gender",
  current_plan: "Plan", joined_date: "Join Date",
  subscription_end: "Expiry", days_remaining: "Days Left",
  assigned_trainer: "Trainer", subscription_status: "Membership",
  payment_status: "Payment", total_amount: "Plan Amount",
  amount_paid: "Paid", balance: "Balance",
  attendance_today: "Today", last_visit: "Last Visit",
  branch_name: "Branch", actions: "Actions",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface MembersRegisterTableProps {
  data: MemberRegisterRow[];
  basePath?: string;
  attendanceMap?: AttendanceMap;
  paymentMap?: PaymentMap;
  amountPaidMap?: AmountPaidMap;
  lastVisitMap?: Record<string, string>;
  pageOffset?: number; // for serial numbers
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MembersRegisterTable({
  data,
  basePath = "/admin/members",
  attendanceMap = {},
  paymentMap = {},
  amountPaidMap = {},
  lastVisitMap = {},
  pageOffset = 0,
}: MembersRegisterTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [showColPicker, setShowColPicker] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleDeactivate = useCallback(async () => {
    if (!deactivateTarget) return;
    setIsPending(true);
    const result = await deactivateMemberAction(deactivateTarget.id);
    setIsPending(false);
    setDeactivateTarget(null);
    if (result.error) { toast.error(result.error); return; }
    toast.success(`${deactivateTarget.name} deactivated.`);
    router.refresh();
  }, [deactivateTarget, router]);

  const columns = useMemo(() => [
    // 1. Serial
    helper.display({
      id: "serial",
      header: "#",
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground text-xs">
          {pageOffset + row.index + 1}
        </span>
      ),
      enableSorting: false,
    }),

    // 2. Member Code
    helper.accessor("member_code", {
      header: ({ column }) => <SortHeader column={column} label="Member Code" />,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs font-medium text-muted-foreground">
          {getValue()}
        </span>
      ),
    }),

    // 3. Photo
    helper.accessor("profile_photo_url", {
      id: "photo",
      header: "Photo",
      cell: ({ row }) => (
        <MemberAvatar
          name={row.original.full_name}
          photoUrl={row.original.profile_photo_url}
          size="sm"
        />
      ),
      enableSorting: false,
    }),

    // 4. Name
    helper.accessor("full_name", {
      header: ({ column }) => <SortHeader column={column} label="Name" />,
      cell: ({ row }) => (
        <div className="min-w-[140px]">
          <p className="font-medium leading-tight">{row.original.full_name}</p>
          {row.original.email && (
            <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
              {row.original.email}
            </p>
          )}
        </div>
      ),
    }),

    // 5. Phone
    helper.accessor("phone", {
      header: "Mobile",
      cell: ({ getValue }) => (
        <a
          href={`tel:${getValue()}`}
          className="text-sm text-primary hover:underline whitespace-nowrap"
        >
          {getValue()}
        </a>
      ),
    }),

    // 6. Gender
    helper.accessor("gender", {
      header: ({ column }) => <SortHeader column={column} label="Gender" />,
      cell: ({ getValue }) => {
        const g = getValue();
        const map: Record<string, string> = {
          male: "Male", female: "Female", other: "Other", prefer_not_to_say: "—",
        };
        return <span className="text-sm">{g ? (map[g] ?? g) : "—"}</span>;
      },
    }),

    // 7. Plan
    helper.accessor("current_plan", {
      header: ({ column }) => <SortHeader column={column} label="Plan" />,
      cell: ({ row, getValue }) => {
        const val = getValue() || row.original.package_code;
        const isPt = row.original.is_pt;
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">{val ?? <span className="text-muted-foreground">No plan</span>}</span>
            {isPt && <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200">PT</Badge>}
          </div>
        );
      },
    }),

    // 8. Join Date
    helper.accessor("joined_date", {
      header: ({ column }) => <SortHeader column={column} label="Join Date" />,
      cell: ({ getValue }) => {
        try { return <span className="text-sm whitespace-nowrap">{format(parseISO(getValue()), "dd MMM yyyy")}</span>; }
        catch { return <span className="text-sm">{getValue()}</span>; }
      },
    }),

    // 9. Expiry Date
    helper.accessor("subscription_end", {
      header: ({ column }) => <SortHeader column={column} label="Expiry" />,
      cell: ({ getValue }) => {
        const v = getValue();
        if (!v) return <span className="text-muted-foreground text-sm">—</span>;
        try { return <span className="text-sm whitespace-nowrap">{format(parseISO(v), "dd MMM yyyy")}</span>; }
        catch { return <span className="text-sm">{v}</span>; }
      },
    }),

    // 10. Days Remaining
    helper.accessor("days_remaining", {
      header: ({ column }) => <SortHeader column={column} label="Days Left" />,
      cell: ({ getValue }) => <DaysRemainingBadge days={getValue()} />,
    }),

    // 11. Trainer
    helper.accessor("assigned_trainer", {
      header: ({ column }) => <SortHeader column={column} label="Trainer" />,
      cell: ({ getValue }) => (
        <span className="text-sm">{getValue() ?? <span className="text-muted-foreground">—</span>}</span>
      ),
    }),

    // 12. Membership Status
    helper.accessor("subscription_status", {
      id: "subscription_status",
      header: ({ column }) => <SortHeader column={column} label="Membership" />,
      cell: ({ row, getValue }) => {
        const memberStatus = row.original.member_status;
        if (memberStatus === "inactive")
          return <Badge variant="outline">Inactive</Badge>;
        return <SubscriptionStatusBadge status={getValue()} />;
      },
    }),

    // 13. Payment Status
    helper.display({
      id: "payment_status",
      header: "Payment",
      cell: ({ row }) => {
        const status = row.original.payment_status || paymentMap[row.original.member_id];
        if (!status) return <Badge variant="outline">—</Badge>;
        const map: Record<string, { label: string; variant: "success" | "warning" | "danger" | "outline" }> = {
          paid:    { label: "Paid",    variant: "success" },
          partial: { label: "Partial", variant: "warning" },
          unpaid:  { label: "Unpaid",  variant: "danger"  },
          void:    { label: "Void",    variant: "outline" },
        };
        const cfg = map[status] ?? { label: status, variant: "outline" as const };
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    }),

    // 14. Total Plan Amount
    helper.display({
      id: "total_amount",
      header: "Plan Amount",
      cell: ({ row }) => {
        const total = row.original.total_amount;
        return (
          <span className="tabular-nums text-sm font-medium">
            {total !== undefined && total !== null ? formatCurrency(total) : "—"}
          </span>
        );
      },
    }),

    // 15. Amount Paid
    helper.display({
      id: "amount_paid",
      header: "Paid",
      cell: ({ row }) => {
        const paid = row.original.paid_amount ?? amountPaidMap[row.original.member_id];
        return (
          <span className="tabular-nums text-sm font-medium text-emerald-600">
            {paid !== undefined && paid !== null ? formatCurrency(paid) : "—"}
          </span>
        );
      },
    }),

    // 16. Balance
    helper.display({
      id: "balance",
      header: "Balance",
      cell: ({ row }) => {
        const bal = row.original.balance_amount;
        if (bal !== undefined && bal !== null && bal > 0) {
          return (
            <span className="tabular-nums text-sm font-semibold text-rose-600">
              {formatCurrency(bal)}
            </span>
          );
        }
        return (
          <span className="tabular-nums text-sm text-muted-foreground">
            {bal === 0 ? "₹0" : "—"}
          </span>
        );
      },
    }),

    // 17. Attendance Today
    helper.display({
      id: "attendance_today",
      header: "Today",
      cell: ({ row }) => (
        <AttendanceTodayBadge present={!!attendanceMap[row.original.member_id]} />
      ),
    }),

    // 18. Last Visit
    helper.display({
      id: "last_visit",
      header: "Last Visit",
      cell: ({ row }) => {
        const d = lastVisitMap[row.original.member_id];
        if (!d) return <span className="text-xs text-muted-foreground">Never</span>;
        try { return <span className="text-xs whitespace-nowrap">{format(parseISO(d), "dd MMM yy")}</span>; }
        catch { return <span className="text-xs">{d}</span>; }
      },
    }),

    // 19. Branch
    helper.accessor("branch_name", {
      header: ({ column }) => <SortHeader column={column} label="Branch" />,
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{getValue()}</span>
      ),
    }),

    // 20. Actions
    helper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <ActionMenu
          row={row.original}
          basePath={basePath}
          onDeactivate={() =>
            setDeactivateTarget({ id: row.original.member_id, name: row.original.full_name })
          }
        />
      ),
      enableSorting: false,
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [basePath, attendanceMap, paymentMap, amountPaidMap, lastVisitMap, pageOffset]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!data.length) return <MembersEmptyState />;

  return (
    <>
      {/* Column visibility toggle */}
      <div className="flex justify-end px-4 pt-3">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowColPicker((v) => !v)}
            className="gap-1.5 text-xs"
          >
            <Settings2 className="size-3.5" />
            Columns
            {showColPicker ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
          {showColPicker && (
            <div className="absolute right-0 top-full z-30 mt-1.5 w-56 rounded-xl border bg-background p-3 shadow-xl">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Toggle columns
              </p>
              <div className="grid grid-cols-2 gap-1">
                {table.getAllColumns()
                  .filter((c) => c.id !== "actions" && c.id !== "serial")
                  .map((col) => (
                    <label key={col.id} className="flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs hover:bg-muted">
                      <input
                        type="checkbox"
                        checked={col.getIsVisible()}
                        onChange={col.getToggleVisibilityHandler()}
                        className="accent-primary"
                      />
                      {COLUMN_LABELS[col.id] ?? col.id}
                    </label>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1600px] text-sm">
          <thead className="sticky top-0 z-10 border-b bg-muted/70 backdrop-blur-sm text-left">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-3 py-2.5 text-xs font-semibold uppercase tracking-[.06em] text-muted-foreground whitespace-nowrap"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "transition-colors hover:bg-muted/30",
                  row.original.member_status === "inactive" && "opacity-60",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2.5 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Deactivate confirm dialog */}
      <Dialog
        open={!!deactivateTarget}
        onOpenChange={(o) => !o && setDeactivateTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate member?</DialogTitle>
            <DialogDescription>
              <strong>{deactivateTarget?.name}</strong> will be set to inactive. Their data is
              preserved and this can be reversed by editing the member.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateTarget(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={isPending}>
              {isPending ? "Deactivating…" : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Sort header ──────────────────────────────────────────────────────────────

function SortHeader({
  column,
  label,
}: {
    column: any;
  label: string;
}) {
  return (
    <button
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="inline-flex items-center gap-1 whitespace-nowrap"
    >
      {label}
      {column.getIsSorted() === "asc" ? (
        <ArrowUp className="size-3" />
      ) : column.getIsSorted() === "desc" ? (
        <ArrowDown className="size-3" />
      ) : (
        <ArrowUpDown className="size-3 opacity-40" />
      )}
    </button>
  );
}

// ─── Row action menu ──────────────────────────────────────────────────────────

function ActionMenu({
  row,
  basePath,
  onDeactivate,
}: {
  row: MemberRegisterRow;
  basePath: string;
  onDeactivate: () => void;
}) {
  const [open, setOpen]           = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [notifPending, setNotifPending] = useState(false);
  const id = row.member_id;

  const actions = [
    { label: "View profile",     icon: Eye,          href: `${basePath}/${id}` },
    { label: "Edit",             icon: Pencil,        href: `${basePath}/${id}?edit=1` },
    { label: "Renew membership", icon: RotateCcw,    href: `${basePath}/${id}?tab=membership` },
    { label: "Collect payment",  icon: CreditCard,   href: `${basePath}/${id}?tab=payment` },
    { label: "Generate invoice", icon: FileText,     href: `${basePath}/${id}?tab=invoice` },
    { label: "Assign trainer",   icon: Dumbbell,     href: `${basePath}/${id}?tab=trainer` },
    { label: "View attendance",  icon: ClipboardList, href: `${basePath}/${id}?tab=attendance` },
  ];

  return (
    <div className="relative flex items-center gap-1">
      {/* ── Share button ───────────────────────────── */}
      <div className="relative">
        <button
          onClick={() => { setShareOpen((v) => !v); setOpen(false); }}
          className="rounded-lg p-1.5 hover:bg-blue-50 text-blue-600 transition-colors"
          aria-label="Share / Contact"
          title="Share / Contact"
        >
          <Share2 className="size-4" />
        </button>

        {shareOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setShareOpen(false)} />
            <ShareMenu row={row} onClose={() => setShareOpen(false)} />
          </>
        )}
      </div>

      {/* ── Actions (⋯) button ─────────────────────── */}
      <button
        onClick={() => { setOpen((v) => !v); setShareOpen(false); }}
        className="rounded-lg p-1.5 hover:bg-muted transition-colors"
        aria-label="Member actions"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-xl border bg-background py-1 shadow-xl">
            {actions.map(({ label, icon: Icon, href }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Icon className="size-4 text-muted-foreground" />
                {label}
              </Link>
            ))}
            {/* Send renewal notification */}
            <div className="my-1 border-t" />
            <button
              onClick={async () => {
                setOpen(false);
                setNotifPending(true);
                try {
                  const { sendRenewalNotificationAction } = await import("@/app/actions/member-management-actions");
                  const res = await sendRenewalNotificationAction(row.member_id);
                  if (res?.error) toast.error(res.error);
                  else toast.success(`Renewal notification sent to ${row.full_name}`);
                } catch {
                  toast.error("Failed to send notification");
                } finally {
                  setNotifPending(false);
                }
              }}
              disabled={notifPending}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <Bell className="size-4" />
              {notifPending ? "Sending…" : "Send Renewal Notification"}
            </button>
            {row.member_status === "active" && (
              <>
                <div className="my-1 border-t" />
                <button
                  onClick={() => { setOpen(false); onDeactivate(); }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <UserX className="size-4" />
                  Deactivate
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Share / Contact menu ────────────────────────────────────────────────────

function ShareMenu({ row, onClose }: { row: MemberRegisterRow; onClose: () => void }) {
  const phone = row.phone?.replace(/\D/g, "") ?? "";

  // Determine membership expiry info for pre-filled messages
  const name       = row.full_name;
  const plan       = row.current_plan ?? "your membership";
  const expiry     = row.subscription_end
    ? (() => { try { return format(parseISO(row.subscription_end), "dd MMM yyyy"); } catch { return row.subscription_end; } })()
    : null;
  const daysLeft   = row.days_remaining;

  // Pre-composed messages
  const renewalMsg =
    daysLeft !== null && daysLeft <= 0
      ? `Hi ${name}, your ${plan} at SyncFyre Gym has expired. Renew now to continue your fitness journey! Call us or visit the gym. 💪`
      : `Hi ${name}, your ${plan} at SyncFyre Gym is expiring on ${expiry ?? "soon"}. Renew before it expires to avoid interruption. 💪`;

  const paymentMsg =
    `Hi ${name}, this is a reminder from SyncFyre Gym about a pending payment for your ${plan}. Please clear the dues at your earliest convenience. Thank you!`;

  const generalMsg =
    `Hi ${name}, greetings from SyncFyre Gym! We'd love to see you. Keep up the great work! 💪🏋️`;

  function smsLink(msg: string) {
    if (!phone) return null;
    return `sms:${phone}?body=${encodeURIComponent(msg)}`;
  }

  function waLink(msg: string) {
    if (!phone) return null;
    const num = phone.startsWith("91") ? phone : `91${phone}`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  }

  function callLink() {
    if (!phone) return null;
    return `tel:${phone}`;
  }

  const hasPhone = !!phone;

  const items: { label: string; sublabel: string; icon: React.ElementType; iconColor: string; href: string | null }[] = [
    {
      label:     "Call",
      sublabel:  hasPhone ? phone : "No phone",
      icon:      Phone,
      iconColor: "text-green-600",
      href:      callLink(),
    },
    {
      label:     "SMS — Renewal Reminder",
      sublabel:  "Opens SMS app with message",
      icon:      MessageSquare,
      iconColor: "text-blue-600",
      href:      smsLink(renewalMsg),
    },
    {
      label:     "SMS — Payment Due",
      sublabel:  "Opens SMS app with message",
      icon:      MessageSquare,
      iconColor: "text-amber-600",
      href:      smsLink(paymentMsg),
    },
    {
      label:     "WhatsApp — Renewal Reminder",
      sublabel:  "Opens WhatsApp with message",
      icon:      () => (
        <svg viewBox="0 0 24 24" className="size-4 fill-green-500">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      iconColor: "text-green-500",
      href:      waLink(renewalMsg),
    },
    {
      label:     "WhatsApp — Payment Due",
      sublabel:  "Opens WhatsApp with message",
      icon:      () => (
        <svg viewBox="0 0 24 24" className="size-4 fill-amber-500">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      iconColor: "text-amber-500",
      href:      waLink(paymentMsg),
    },
    {
      label:     "WhatsApp — General",
      sublabel:  "Opens WhatsApp with message",
      icon:      () => (
        <svg viewBox="0 0 24 24" className="size-4 fill-green-400">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      iconColor: "text-green-400",
      href:      waLink(generalMsg),
    },
  ];

  return (
    <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-xl border bg-background py-1.5 shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3.5 pb-2 pt-1">
        <Share2 className="size-3.5 text-blue-600" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Contact / Share
        </span>
      </div>

      {!hasPhone && (
        <p className="px-3.5 py-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20">
          ⚠ No phone number stored for this member.
        </p>
      )}

      {items.map(({ label, sublabel, icon: Icon, href }) => {
        const disabled = !href;
        const content = (
          <>
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted">
              <Icon />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-medium leading-tight ${disabled ? "text-muted-foreground" : ""}`}>
                {label}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{sublabel}</p>
            </div>
          </>
        );

        if (disabled) {
          return (
            <div
              key={label}
              className="flex cursor-not-allowed items-center gap-2.5 px-3 py-2 opacity-40"
            >
              {content}
            </div>
          );
        }

        return (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors"
          >
            {content}
          </a>
        );
      })}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function MembersEmptyState() {
  return (
    <div className="grid min-h-72 place-items-center text-center py-16">
      <div>
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-muted">
          <UserRound className="size-8 text-muted-foreground" />
        </div>
        <p className="font-semibold text-lg">No members found</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
          Try adjusting your filters or search terms. New members appear here after registration.
        </p>
      </div>
    </div>
  );
}
