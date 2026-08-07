import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentProfile } from "@/lib/auth";
import {
  listMembersRich,
  getBranchOptions,
  getPlanOptions,
  getTrainerOptions,
} from "@/services/member-extended.service";
import { createClient } from "@/lib/supabase/server";
import { MembersRegisterTable } from "@/components/members/members-register-table";
import { MemberFilters } from "@/components/members/member-filters";
import { MemberTableToolbar } from "@/components/members/member-table-toolbar";

export const metadata = { title: "Members Register" };

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp      = await searchParams;
  const profile = await getCurrentProfile();
  const branchId = profile?.branch_id ?? null;

  const page     = Math.max(1, Number(sp.page ?? 1));
  const pageSize = Math.max(1, Math.min(100, Number(sp.pageSize ?? 50)));

  // ── Parallel data fetch ─────────────────────────────────────────────────────
  const [result, branches, plans, trainers] = await Promise.all([
    listMembersRich({
      page,
      pageSize,
      search:             sp.q || undefined,
      branchId:           sp.branch || branchId || undefined,
      status:             sp.status || undefined,
      planId:             sp.plan || undefined,
      trainerId:          sp.trainer || undefined,
      gender:             sp.gender || undefined,
      subscriptionStatus: sp.sub_status || undefined,
      joinDateFrom:       sp.join_from || undefined,
      joinDateTo:         sp.join_to || undefined,
      expiryDateFrom:     sp.exp_from || undefined,
      expiryDateTo:       sp.exp_to || undefined,
    }),
    getBranchOptions(),
    getPlanOptions(branchId),
    getTrainerOptions(branchId),
  ]);

  // ── Today's attendance map ──────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();

  const memberIds = result.data.map((m) => m.member_id);

  const [attendanceRes, lastVisitRes] = await Promise.all([
    memberIds.length
      ? supabase
          .from("attendance")
          .select("member_id")
          .in("member_id", memberIds)
          .eq("attendance_date", today)
      : { data: [] },
    memberIds.length
      ? supabase
          .from("attendance")
          .select("member_id, attendance_date")
          .in("member_id", memberIds)
          .lt("attendance_date", today)
          .order("attendance_date", { ascending: false })
      : { data: [] },
  ]);

  // Build attendance map: member_id → present today
  const attendanceMap: Record<string, boolean> = {};
  for (const r of attendanceRes.data ?? []) {
    attendanceMap[r.member_id] = true;
  }

  // Build last visit map: member_id → most recent date (excluding today)
  const lastVisitMap: Record<string, string> = {};
  for (const r of lastVisitRes.data ?? []) {
    if (!lastVisitMap[r.member_id]) {
      lastVisitMap[r.member_id] = r.attendance_date;
    }
  }

  // ── Pagination URL builder ──────────────────────────────────────────────────
  function pageUrl(p: number) {
    const params = new URLSearchParams(sp as Record<string, string>);
    params.set("page", String(p));
    return `/admin/members?${params.toString()}`;
  }

  const totalPages = Math.max(1, result.totalPages);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold">Members Register</h1>
          <p className="text-sm text-muted-foreground">
            Full operational view of all gym members — plans, payments, attendance, and more.
          </p>
        </div>
        <div className="ml-auto flex-shrink-0">
          <Link href="/admin/members/new" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-4" />
            Add Member
          </Link>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill label="Total" value={result.total} color="blue" />
        <StatPill
          label="Active"
          value={result.data.filter((m) => m.member_status === "active").length}
          note={`of ${result.data.length} shown`}
          color="green"
        />
        <StatPill
          label="Present Today"
          value={Object.keys(attendanceMap).length}
          color="emerald"
        />
        <StatPill
          label="Expiring ≤30d"
          value={
            result.data.filter(
              (m) => m.days_remaining !== null && m.days_remaining >= 0 && m.days_remaining <= 30,
            ).length
          }
          color="amber"
        />
      </div>

      {/* Main card */}
      <Card className="overflow-hidden">
        {/* Filters */}
        <MemberFilters
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          plans={plans.map((p) => ({ id: p.id, name: p.name }))}
          trainers={trainers.map((t) => ({ id: t.id, name: t.name }))}
          basePath="/admin/members"
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <MemberTableToolbar data={result.data} total={result.total} />
        </div>

        {/* Table */}
        <MembersRegisterTable
          data={result.data}
          basePath="/admin/members"
          attendanceMap={attendanceMap}
          lastVisitMap={lastVisitMap}
          pageOffset={(page - 1) * pageSize}
        />

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, result.total)} of {result.total.toLocaleString()} members
          </span>
          <div className="flex items-center gap-1.5">
            <PaginationLink
              href={pageUrl(page - 1)}
              disabled={page <= 1}
              label="← Prev"
            />
            <span className="px-2 text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <PaginationLink
              href={pageUrl(page + 1)}
              disabled={page >= totalPages}
              label="Next →"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  note,
  color,
}: {
  label: string;
  value: number;
  note?: string;
  color: "blue" | "green" | "emerald" | "amber";
}) {
  const colors = {
    blue:    "bg-blue-500/8 text-blue-700",
    green:   "bg-emerald-500/8 text-emerald-700",
    emerald: "bg-emerald-500/8 text-emerald-700",
    amber:   "bg-amber-500/8 text-amber-700",
  };
  return (
    <div className={`rounded-xl px-4 py-3 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value.toLocaleString()}</p>
      {note && <p className="text-[10px] opacity-60 mt-0.5">{note}</p>}
    </div>
  );
}

function PaginationLink({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-lg border px-3 py-1.5 text-xs opacity-40">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
    >
      {label}
    </Link>
  );
}
