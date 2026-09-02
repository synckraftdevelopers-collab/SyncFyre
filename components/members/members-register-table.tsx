"use client";

import {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
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
  Copy,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import type { MemberRegisterRow } from "@/types";
import { MemberAvatar } from "./member-avatar";
import {
  SubscriptionStatusBadge,
  DaysRemainingBadge,
  AttendanceTodayBadge,
} from "./member-badges";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { deactivateMemberAction } from "@/app/actions/member-management-actions";
import {
  buildCallUrl,
  buildSmsUrl,
  buildWhatsAppUrl,
  generateMembershipMessage,
} from "@/lib/member-messages";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AttendanceMap = Record<string, boolean>;
type PaymentMap = Record<string, string>;
type AmountPaidMap = Record<string, number>;

type MenuState = {
  member: MemberRegisterRow;
  anchorKind: "row" | "button";
  point: {
    x: number;
    y: number;
  };
  rowRect?: {
    top: number;
    right: number;
    bottom: number;
    height: number;
  };
};

type ShareDialogState = {
  member: MemberRegisterRow;
};

type ScrollSyncSource = "top" | "table" | null;

const helper = createColumnHelper<MemberRegisterRow>();

const COLUMN_LABELS: Record<string, string> = {
  serial: "#",
  member_code: "Member Code",
  photo: "Photo",
  full_name: "Name",
  phone: "Mobile",
  gender: "Gender",
  current_plan: "Plan",
  joined_date: "Join Date",
  subscription_end: "Expiry",
  days_remaining: "Days Left",
  assigned_trainer: "Trainer",
  subscription_status: "Membership",
  payment_status: "Payment",
  total_amount: "Plan Amount",
  amount_paid: "Paid",
  balance: "Balance",
  attendance_today: "Today",
  last_visit: "Last Visit",
  branch_name: "Branch",
  actions: "Actions",
};

interface MembersRegisterTableProps {
  data: MemberRegisterRow[];
  basePath?: string;
  attendanceMap?: AttendanceMap;
  paymentMap?: PaymentMap;
  amountPaidMap?: AmountPaidMap;
  lastVisitMap?: Record<string, string>;
  pageOffset?: number;
}

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
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string; memberCode: string; branchName: string } | null>(null);
  const [rowMenu, setRowMenu] = useState<MenuState | null>(null);
  const [shareDialog, setShareDialog] = useState<ShareDialogState | null>(null);
  const [isPending, setIsPending] = useState(false);
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const syncSourceRef = useRef<ScrollSyncSource>(null);
  const [proxyWidth, setProxyWidth] = useState(1600);

  const syncProxyWidth = useCallback(() => {
    if (!tableRef.current) return;
    setProxyWidth(tableRef.current.scrollWidth);
  }, []);

  useEffect(() => {
    syncProxyWidth();
    if (!tableRef.current || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      syncProxyWidth();
    });

    observer.observe(tableRef.current);
    return () => observer.disconnect();
  }, [data, visibility, syncProxyWidth]);

  const syncScrollPosition = useCallback((source: ScrollSyncSource, left: number) => {
    syncSourceRef.current = source;

    if (source !== "top" && topScrollRef.current && topScrollRef.current.scrollLeft !== left) {
      topScrollRef.current.scrollLeft = left;
    }

    if (source !== "table" && tableScrollRef.current && tableScrollRef.current.scrollLeft !== left) {
      tableScrollRef.current.scrollLeft = left;
    }

    window.requestAnimationFrame(() => {
      syncSourceRef.current = null;
    });
  }, []);

  const handleTopScroll = useCallback(() => {
    if (syncSourceRef.current === "table" || !topScrollRef.current) return;
    syncScrollPosition("top", topScrollRef.current.scrollLeft);
  }, [syncScrollPosition]);

  const handleTableScroll = useCallback(() => {
    if (syncSourceRef.current === "top" || !tableScrollRef.current) return;
    syncScrollPosition("table", tableScrollRef.current.scrollLeft);
  }, [syncScrollPosition]);

  const handleDeactivate = useCallback(async () => {
    if (!deactivateTarget) return;
    setIsPending(true);
    const result = await deactivateMemberAction(deactivateTarget.id);
    setIsPending(false);
    setDeactivateTarget(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`${deactivateTarget.name} deactivated.`);
    router.refresh();
  }, [deactivateTarget, router]);

  const openRowMenu = useCallback((member: MemberRegisterRow, anchorEl: HTMLElement, anchorKind: "row" | "button", point?: { x: number; y: number }) => {
    const rect = anchorEl.getBoundingClientRect();
    setRowMenu({
      member,
      anchorKind,
      point: point ?? { x: rect.right, y: anchorKind === "button" ? rect.bottom : rect.top + rect.height / 2 },
      rowRect: anchorKind === "row" ? {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        height: rect.height,
      } : undefined,
    });
  }, []);

  const closeRowMenu = useCallback(() => {
    setRowMenu(null);
  }, []);

  const columns = useMemo(
    () => [
      helper.display({
        id: "serial",
        header: "#",
        cell: ({ row }) => (
          <span className="tabular-nums text-xs text-muted-foreground">
            {pageOffset + row.index + 1}
          </span>
        ),
        enableSorting: false,
      }),
      helper.accessor("member_code", {
        header: ({ column }) => <SortHeader column={column} label="Member Code" />,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-medium text-muted-foreground">
            {getValue()}
          </span>
        ),
      }),
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
      helper.accessor("full_name", {
        header: ({ column }) => <SortHeader column={column} label="Name" />,
        cell: ({ row }) => (
          <div className="min-w-[140px]">
            <p className="font-medium leading-tight">{row.original.full_name}</p>
            {row.original.email ? (
              <p className="max-w-[160px] truncate text-[11px] text-muted-foreground">
                {row.original.email}
              </p>
            ) : null}
          </div>
        ),
      }),
      helper.accessor("phone", {
        header: "Mobile",
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-sm text-primary hover:underline">
            {getValue()}
          </span>
        ),
      }),
      helper.accessor("gender", {
        header: ({ column }) => <SortHeader column={column} label="Gender" />,
        cell: ({ getValue }) => {
          const gender = getValue();
          const labelMap: Record<string, string> = {
            male: "Male",
            female: "Female",
            other: "Other",
            prefer_not_to_say: "—",
          };
          return <span className="text-sm">{gender ? (labelMap[gender] ?? gender) : "—"}</span>;
        },
      }),
      helper.accessor("current_plan", {
        header: ({ column }) => <SortHeader column={column} label="Plan" />,
        cell: ({ row, getValue }) => {
          const value = getValue() || row.original.package_code;
          return (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium">
                {value ?? <span className="text-muted-foreground">No plan</span>}
              </span>
              {row.original.is_pt ? (
                <Badge
                  variant="outline"
                  className="border-purple-200 bg-purple-100 px-1 py-0 text-[10px] text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                >
                  PT
                </Badge>
              ) : null}
            </div>
          );
        },
      }),
      helper.accessor("joined_date", {
        header: ({ column }) => <SortHeader column={column} label="Join Date" />,
        cell: ({ row, getValue }) => {
          const value = row.original.subscription_start ?? getValue();
          try {
            return <span className="whitespace-nowrap text-sm">{format(parseISO(value), "dd MMM yyyy")}</span>;
          } catch {
            return <span className="text-sm">{value}</span>;
          }
        },
      }),
      helper.accessor("subscription_end", {
        header: ({ column }) => <SortHeader column={column} label="Expiry" />,
        cell: ({ getValue }) => {
          const value = getValue();
          if (!value) return <span className="text-sm text-muted-foreground">—</span>;
          try {
            return <span className="whitespace-nowrap text-sm">{format(parseISO(value), "dd MMM yyyy")}</span>;
          } catch {
            return <span className="text-sm">{value}</span>;
          }
        },
      }),
      helper.accessor("days_remaining", {
        header: ({ column }) => <SortHeader column={column} label="Days Left" />,
        cell: ({ getValue }) => <DaysRemainingBadge days={getValue()} />,
      }),
      helper.accessor("assigned_trainer", {
        header: ({ column }) => <SortHeader column={column} label="Trainer" />,
        cell: ({ getValue }) => (
          <span className="text-sm">{getValue() ?? <span className="text-muted-foreground">—</span>}</span>
        ),
      }),
      helper.accessor("subscription_status", {
        id: "subscription_status",
        header: ({ column }) => <SortHeader column={column} label="Membership" />,
        cell: ({ row, getValue }) => {
          if (row.original.member_status === "inactive") {
            return <Badge variant="outline">Inactive</Badge>;
          }
          return <SubscriptionStatusBadge status={getValue()} />;
        },
      }),
      helper.display({
        id: "payment_status",
        header: "Payment",
        cell: ({ row }) => {
          const status = row.original.payment_status || paymentMap[row.original.member_id];
          if (!status) return <Badge variant="outline">—</Badge>;
          const variants: Record<string, { label: string; variant: "success" | "warning" | "danger" | "outline" }> = {
            paid: { label: "Paid", variant: "success" },
            partial: { label: "Partial", variant: "warning" },
            unpaid: { label: "Unpaid", variant: "danger" },
            void: { label: "Void", variant: "outline" },
          };
          const config = variants[status] ?? { label: status, variant: "outline" as const };
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      }),
      helper.display({
        id: "total_amount",
        header: "Plan Amount",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm font-medium">
            {row.original.total_amount !== undefined && row.original.total_amount !== null
              ? formatCurrency(row.original.total_amount)
              : "—"}
          </span>
        ),
      }),
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
      helper.display({
        id: "balance",
        header: "Balance",
        cell: ({ row }) => {
          const balance = row.original.balance_amount;
          if (balance !== undefined && balance !== null && balance > 0) {
            return <span className="tabular-nums text-sm font-semibold text-rose-600">{formatCurrency(balance)}</span>;
          }
          return <span className="tabular-nums text-sm text-muted-foreground">{balance === 0 ? "?0" : "—"}</span>;
        },
      }),
      helper.display({
        id: "attendance_today",
        header: "Today",
        cell: ({ row }) => <AttendanceTodayBadge present={!!attendanceMap[row.original.member_id]} />,
      }),
      helper.display({
        id: "last_visit",
        header: "Last Visit",
        cell: ({ row }) => {
          const value = lastVisitMap[row.original.member_id];
          if (!value) return <span className="text-xs text-muted-foreground">Never</span>;
          try {
            return <span className="whitespace-nowrap text-xs">{format(parseISO(value), "dd MMM yy")}</span>;
          } catch {
            return <span className="text-xs">{value}</span>;
          }
        },
      }),
      helper.accessor("branch_name", {
        header: ({ column }) => <SortHeader column={column} label="Branch" />,
        cell: ({ getValue }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{getValue()}</span>,
      }),
      helper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1" data-row-action-ignore="true">
            <button
              type="button"
              aria-label={`Share ${row.original.full_name}`}
              className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-50"
              data-row-action-ignore="true"
              onClick={(event) => {
                event.stopPropagation();
                closeRowMenu();
                setShareDialog({ member: row.original });
              }}
            >
              <Share2 className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`Open actions for ${row.original.full_name}`}
              className="rounded-lg p-1.5 transition-colors hover:bg-muted"
              data-row-action-ignore="true"
              onClick={(event) => {
                event.stopPropagation();
                closeRowMenu();
                openRowMenu(row.original, event.currentTarget, "button");
              }}
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>
        ),
        enableSorting: false,
      }),
    ],
    [
      amountPaidMap,
      attendanceMap,
      closeRowMenu,
      lastVisitMap,
      openRowMenu,
      pageOffset,
      paymentMap,
    ],
  );

  const table = useReactTable({
    data,
    columns,
    getRowId: (member) => member.member_id,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!data.length) return <MembersEmptyState />;

  return (
    <>
      <div className="flex justify-end px-4 pt-3">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowColPicker((value) => !value)}
            className="gap-1.5 text-xs"
            data-row-action-ignore="true"
          >
            <Settings2 className="size-3.5" />
            Columns
            {showColPicker ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
          {showColPicker ? (
            <div className="absolute right-0 top-full z-30 mt-1.5 w-56 rounded-xl border bg-background p-3 shadow-xl">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Toggle columns
              </p>
              <div className="grid grid-cols-2 gap-1">
                {table
                  .getAllColumns()
                  .filter((column) => column.id !== "actions" && column.id !== "serial")
                  .map((column) => (
                    <label
                      key={column.id}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="accent-primary"
                        data-row-action-ignore="true"
                      />
                      {COLUMN_LABELS[column.id] ?? column.id}
                    </label>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-4 pb-2 pt-2">
        <div
          ref={topScrollRef}
          className="overflow-x-auto overflow-y-hidden rounded-t-xl border border-b-0 bg-background"
          onScroll={handleTopScroll}
          aria-label="Members table horizontal scrollbar"
        >
          <div style={{ width: proxyWidth, height: 16 }} />
        </div>

        <div
          ref={tableScrollRef}
          className="overflow-x-auto rounded-b-xl border"
          onScroll={handleTableScroll}
        >
          <table ref={tableRef} className="w-full min-w-[1600px] text-sm">
            <thead className="sticky top-0 z-10 border-b bg-muted/70 text-left backdrop-blur-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-[.06em] text-muted-foreground"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open member actions for ${row.original.full_name}`}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none",
                    row.original.member_status === "inactive" && "opacity-60",
                  )}
                  onClick={(event) => {
                    const target = event.target as HTMLElement;
                    if (isInteractiveTarget(target)) return;
                    openRowMenu(row.original, event.currentTarget, "row", {
                      x: event.clientX,
                      y: event.clientY,
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openRowMenu(row.original, event.currentTarget, "row", { x: window.innerWidth - 24, y: event.currentTarget.getBoundingClientRect().top + event.currentTarget.getBoundingClientRect().height / 2 });
                    }
                    if (event.key === "Escape") {
                      closeRowMenu();
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isActionCell = cell.column.id === "actions";

                    return (
                      <td key={cell.id} className="px-3 py-2.5 align-middle">
                        {isActionCell ? (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        ) : (
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={(event) => {
                              event.stopPropagation();
                              openRowMenu(row.original, event.currentTarget, "row", {
                                x: event.currentTarget.getBoundingClientRect().right,
                                y: event.currentTarget.getBoundingClientRect().top + event.currentTarget.getBoundingClientRect().height / 2,
                              });
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RowActionMenu
        menu={rowMenu}
        basePath={basePath}
        onClose={closeRowMenu}
        onDeactivate={(member) => setDeactivateTarget({ id: member.member_id, name: member.full_name, memberCode: member.member_code, branchName: member.branch_name })}
        onShare={(member) => setShareDialog({ member })}
      />

      <ShareMemberDialog shareDialog={shareDialog} onClose={() => setShareDialog(null)} />

      <Dialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Member?</DialogTitle>
            <DialogDescription className="space-y-1 pt-1 text-left"><span className="block">Are you sure you want to delete:</span><span className="block font-semibold text-foreground">{deactivateTarget?.name}</span><span className="block">Member ID: {deactivateTarget?.memberCode}</span><span className="block">Branch: {deactivateTarget?.branchName}</span><span className="block">This action cannot be undone. SyncFyre will remove this member from the active register while preserving historical records.</span></DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateTarget(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={isPending}>
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SortHeader<TData>({
  column,
  label,
}: {
  column: Column<TData, unknown>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="inline-flex items-center gap-1 whitespace-nowrap"
      data-row-action-ignore="true"
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

function RowActionMenu({
  menu,
  basePath,
  onClose,
  onDeactivate,
  onShare,
}: {
  menu: MenuState | null;
  basePath: string;
  onClose: () => void;
  onDeactivate: (member: MemberRegisterRow) => void;
  onShare: (member: MemberRegisterRow) => void;
}) {
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!menu) return;

    const width = 240;
    const height = menu.member.member_status === "active" ? 360 : 320;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const left = menu.anchorKind === "button"
      ? Math.min(Math.max(12, menu.point.x - width), viewportWidth - width - 12)
      : Math.min(Math.max(12, menu.point.x + 12), viewportWidth - width - 12);

    const preferredTop = menu.anchorKind === "button"
      ? menu.point.y + 8
      : (menu.rowRect
          ? menu.rowRect.top + Math.max(8, Math.min(menu.rowRect.height / 2 - height / 2, menu.rowRect.height - height - 8))
          : menu.point.y - height / 2);

    const top = Math.min(Math.max(12, preferredTop), viewportHeight - height - 12);

    setPosition({ top, left });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    updatePosition();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", onClose, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [menu, onClose, updatePosition]);

  if (!menu || typeof document === "undefined") return null;

  const id = menu.member.member_id;
  const paymentsHref = basePath.startsWith("/reception") ? "/reception/payments" : "/admin/payments";
  const actions = [
    { label: "View profile", icon: Eye, href: `${basePath}/${id}` },
    { label: "Edit", icon: Pencil, href: `${basePath}/${id}?edit=1` },
    { label: "Renew membership", icon: RotateCcw, href: `${basePath}/${id}?tab=membership` },
    { label: "Collect payment", icon: CreditCard, href: `${basePath}/${id}?tab=payment` },
    { label: "Generate invoice", icon: FileText, href: paymentsHref },
    { label: "Assign trainer", icon: Dumbbell, href: `${basePath}/${id}?tab=trainer` },
    { label: "View attendance", icon: ClipboardList, href: `${basePath}/${id}?tab=attendance` },
  ];

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close member action menu"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        onMouseDown={onClose}
      />
      <div
        className="fixed z-50 w-60 rounded-xl border bg-background py-1 shadow-xl"
        onWheel={(event) => event.preventDefault()}
        style={{ top: position.top, left: position.left }}
        role="menu"
        aria-label={`Actions for ${menu.member.full_name}`}
      >
        <div className="border-b px-3.5 py-2" onMouseDown={(event) => event.stopPropagation()}>
          <p className="truncate text-sm font-semibold">{menu.member.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{menu.member.member_code}</p>
        </div>
        {actions.map(({ label, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            onClick={onClose}
            className="flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors hover:bg-muted"
            role="menuitem"
          >
            <Icon className="size-4 text-muted-foreground" />
            {label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => {
            onClose();
            onShare(menu.member);
          }}
          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors hover:bg-muted"
          role="menuitem"
        >
          <Share2 className="size-4 text-muted-foreground" />
          Share
        </button>
        <div className="my-1 border-t" />
        <button
              type="button"
              onClick={() => {
                onClose();
                onDeactivate(menu.member);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
              role="menuitem"
            ><UserX className="size-4" />Delete</button>
      </div>
    </>,
    document.body,
  );
}
function ShareMemberDialog({
  shareDialog,
  onClose,
}: {
  shareDialog: ShareDialogState | null;
  onClose: () => void;
}) {
  const member = shareDialog?.member ?? null;
  const plan = member?.current_plan ?? member?.package_code ?? "Membership";
  const startDate = formatMemberDate(member?.subscription_start ?? member?.joined_date ?? null);
  const endDate = formatMemberDate(member?.subscription_end ?? null);
  const payment = member?.paid_amount ?? member?.total_amount ?? 0;
  const message = member
    ? generateMembershipMessage({
        memberName: member.full_name,
        gymName: "SyncFyre Gym",
        planName: plan,
        subscriptionStatus: member.subscription_status,
        expiryDate: member.subscription_end,
        dueAmount: member.balance_amount,
        daysRemaining: member.days_remaining,
      })
    : "";

  const whatsappUrl = member ? buildWhatsAppUrl(member.phone, message) : null;
  const smsUrl = member ? buildSmsUrl(member.phone, message) : null;
  const callUrl = member ? buildCallUrl(member.phone) : null;

  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error("Unable to copy to clipboard.");
    }
  };

  return (
    <Dialog open={!!shareDialog} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Share member</DialogTitle>
          <DialogDescription>
            Use the selected member&apos;s live membership details for communication.
          </DialogDescription>
        </DialogHeader>

        {member ? (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <InfoItem label="Member" value={member.full_name} />
                <InfoItem label="Package" value={plan} />
                <InfoItem label="Start" value={startDate} />
                <InfoItem label="End" value={endDate} />
                <InfoItem label="Payment" value={formatCurrency(payment)} />
                <InfoItem label="Phone" value={member.phone ?? "—"} />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Message preview</p>
              <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border bg-background p-3 text-sm">
                {message}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <ShareActionLink href={whatsappUrl} icon={Share2} label="WhatsApp" description="Open WhatsApp with member details" />
              <ShareActionLink href={smsUrl} icon={MessageSquare} label="SMS / Text" description="Open the SMS app with the message" />
              <ShareActionButton
                icon={Copy}
                label="Copy message"
                description="Copy the generated message"
                onClick={() => copyText(message, "Member message copied.")}
              />
              <ShareActionButton
                icon={Phone}
                label="Copy phone number"
                description="Copy the member phone number"
                onClick={() => copyText(member.phone ?? "", "Phone number copied.")}
                disabled={!member.phone}
              />
            </div>

            {callUrl ? (
              <a href={callUrl} className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start")}>
                <Phone className="size-4" />
                Call member
              </a>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ShareActionLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string | null;
  icon: typeof Share2;
  label: string;
  description: string;
}) {
  if (!href) {
    return (
      <div className="rounded-xl border border-dashed p-3 text-sm opacity-50">
        <div className="flex items-center gap-2 font-medium">
          <Icon className="size-4" />
          {label}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Phone number not available.</p>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-xl border p-3 text-sm transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-2 font-medium">
        <Icon className="size-4" />
        {label}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </a>
  );
}

function ShareActionButton({
  icon: Icon,
  label,
  description,
  onClick,
  disabled,
}: {
  icon: typeof Copy;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl border p-3 text-left text-sm transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="flex items-center gap-2 font-medium">
        <Icon className="size-4" />
        {label}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </button>
  );
}
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function formatMemberDate(value: string | null): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

function isInteractiveTarget(target: HTMLElement): boolean {
  return Boolean(
    target.closest(
      "button, input, select, textarea, summary, [role='button'], [role='menuitem'], [data-row-action-ignore='true']",
    ),
  );
}

function MembersEmptyState() {
  return (
    <div className="grid min-h-72 place-items-center py-16 text-center">
      <div>
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-muted">
          <UserRound className="size-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold">No members found</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
          Try adjusting your filters or search terms. New members appear here after registration.
        </p>
      </div>
    </div>
  );
}





