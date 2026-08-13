import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { MemberExcelImportDialog } from "@/components/members/member-excel-import-dialog";

export const metadata = { title: "Members Register" };

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp       = await searchParams;
  const profile  = await getCurrentProfile();
  const branchId = profile?.branch_id ?? null;

  const page     = Math.max(1, Number(sp.page     ?? 1));
  const pageSize = Math.max(1, Math.min(100, Number(sp.pageSize ?? 50)));

  const [result, branches, plans, trainers, statusCounts] = await Promise.all([
    listMembersRich({
      page,
      pageSize,
      search:             sp.q          || undefined,
      branchId:           sp.branch     || branchId || undefined,
      status:             sp.status     || undefined,
      planId:             sp.plan       || undefined,
      trainerId:          sp.trainer    || undefined,
      gender:             sp.gender     || undefined,
      subscriptionStatus: sp.sub_status || undefined,
      joinDateFrom:       sp.join_from  || undefined,
      joinDateTo:         sp.join_to    || undefined,
      expiryDateFrom:     sp.exp_from   || undefined,
      expiryDateTo:       sp.exp_to     || undefined,
    }),
    getBranchOptions(),
    getPlanOptions(branchId),
    getTrainerOptions(branchId),
    // Fetch real counts for ALL membership states in one go
    (async () => {
      const { createClient: cc } = await import("@/lib/supabase/server");
      const sb = await cc();
      const eb = sp.branch || branchId || null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const br = (q: any) => (eb ? q.eq("branch_id", eb) : q);

      const [tM, aM, iM, aSub, eSub, pSub, pauseSub, cSub] = await Promise.all([
        br(sb.from("members").select("id",      { count: "exact", head: true })),
        br(sb.from("members").select("id",      { count: "exact", head: true }).eq("status", "active")),
        br(sb.from("members").select("id",      { count: "exact", head: true }).eq("status", "inactive")),
        br(sb.from("subscriptions").select("id",{ count: "exact", head: true }).eq("status", "active")),
        br(sb.from("subscriptions").select("id",{ count: "exact", head: true }).eq("status", "expired")),
        br(sb.from("subscriptions").select("id",{ count: "exact", head: true }).eq("status", "pending")),
        br(sb.from("subscriptions").select("id",{ count: "exact", head: true }).eq("status", "paused")),
        br(sb.from("subscriptions").select("id",{ count: "exact", head: true }).eq("status", "cancelled")),
      ]);

      return {
        totalMembers:    tM.count     ?? 0,
        activeMembers:   aM.count     ?? 0,
        inactiveMembers: iM.count     ?? 0,
        activeSubs:      aSub.count   ?? 0,
        expiredSubs:     eSub.count   ?? 0,
        pendingSubs:     pSub.count   ?? 0,
        pausedSubs:      pauseSub.count ?? 0,
        cancelledSubs:   cSub.count   ?? 0,
      };
    })(),
  ]);

  const {
    totalMembers, activeMembers, inactiveMembers,
    expiredSubs, pendingSubs, pausedSubs,
  } = statusCounts;

  // Today's attendance
  const today        = new Date().toISOString().slice(0, 10);
  const inThirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const supabase     = await createClient();
  const memberIds    = result.data.map((m) => m.member_id);

  const [attendanceRes, lastVisitRes] = await Promise.all([
    memberIds.length
      ? supabase.from("attendance").select("member_id").in("member_id", memberIds).eq("attendance_date", today)
      : { data: [] },
    memberIds.length
      ? supabase.from("attendance").select("member_id, attendance_date").in("member_id", memberIds).lt("attendance_date", today).order("attendance_date", { ascending: false })
      : { data: [] },
  ]);

  const attendanceMap: Record<string, boolean> = {};
  for (const r of attendanceRes.data ?? []) attendanceMap[r.member_id] = true;

  const lastVisitMap: Record<string, string> = {};
  for (const r of lastVisitRes.data ?? []) {
    if (!lastVisitMap[r.member_id]) lastVisitMap[r.member_id] = r.attendance_date;
  }

  function pageUrl(p: number) {
    const params = new URLSearchParams(sp as Record<string, string>);
    params.set("page", String(p));
    return `/admin/members?${params.toString()}`;
  }

  const totalPages  = Math.max(1, result.totalPages);
  const expiringCount = result.data.filter(
    (m) => m.days_remaining !== null && m.days_remaining >= 0 && m.days_remaining <= 30,
  ).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold">Members Register</h1>
          <p className="text-sm text-muted-foreground">
            Full operational view — plans, payments, attendance, and membership status.
          </p>
        </div>
        <div className="ml-auto flex flex-shrink-0 flex-wrap items-center gap-2">
          <MemberExcelImportDialog
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            defaultBranchId={branchId}
          />
          <Link href="/admin/members/new" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-4" />
            Add Member
          </Link>
        </div>
      </div>

      {/* ── Stats strip — 8 membership state pills ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
        <StatPill
          label="Total Members"
          value={totalMembers}
          color="blue"
          href="/admin/members"
          icon="👥"
        />
        <StatPill
          label="Active"
          value={activeMembers}
          color="green"
          href="/admin/members?status=active"
          icon="✅"
        />
        <StatPill
          label="Present Today"
          value={Object.keys(attendanceMap).length}
          color="emerald"
          icon="🏋️"
        />
        <StatPill
          label="Expiring ≤30d"
          value={expiringCount}
          color="amber"
          href={`/admin/members?sub_status=active&exp_from=${today}&exp_to=${inThirtyDays}`}
          icon="⏳"
        />
        <StatPill
          label="Expired"
          value={expiredSubs}
          color="red"
          href="/admin/members?sub_status=expired"
          icon="❌"
        />
        <StatPill
          label="Pending"
          value={pendingSubs}
          color="orange"
          href="/admin/members?sub_status=pending"
          icon="🕐"
        />
        <StatPill
          label="Paused"
          value={pausedSubs}
          color="purple"
          href="/admin/members?sub_status=paused"
          icon="⏸️"
        />
        <StatPill
          label="Inactive"
          value={inactiveMembers}
          color="gray"
          href="/admin/members?status=inactive"
          icon="💤"
        />
      </div>

      {/* Main card */}
      <Card className="overflow-hidden">
        <MemberFilters
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          plans={plans.map((p) => ({ id: p.id, name: p.name }))}
          trainers={trainers.map((t) => ({ id: t.id, name: t.name }))}
          basePath="/admin/members"
        />

        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <MemberTableToolbar data={result.data} total={result.total} />
        </div>

        <MembersRegisterTable
          data={result.data}
          basePath="/admin/members"
          attendanceMap={attendanceMap}
          lastVisitMap={lastVisitMap}
          pageOffset={(page - 1) * pageSize}
        />

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, result.total)} of{" "}
            {result.total.toLocaleString()} members
          </span>
          <div className="flex items-center gap-1.5">
            <PaginationLink href={pageUrl(page - 1)} disabled={page <= 1}          label="← Prev" />
            <span className="px-2 text-xs text-muted-foreground">{page} / {totalPages}</span>
            <PaginationLink href={pageUrl(page + 1)} disabled={page >= totalPages} label="Next →" />
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── StatPill ─────────────────────────────────────────────────────────────────

type PillColor = "blue" | "green" | "emerald" | "amber" | "red" | "orange" | "purple" | "gray";

function StatPill({
  label,
  value,
  color,
  href,
  icon,
}: {
  label: string;
  value: number;
  color: PillColor;
  href?: string;
  icon?: string;
}) {
  const colors: Record<PillColor, string> = {
    blue:    "bg-blue-500/10   text-blue-700   dark:text-blue-400",
    green:   "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    amber:   "bg-amber-500/10  text-amber-700   dark:text-amber-400",
    red:     "bg-red-500/10    text-red-700     dark:text-red-400",
    orange:  "bg-orange-500/10 text-orange-700  dark:text-orange-400",
    purple:  "bg-purple-500/10 text-purple-700  dark:text-purple-400",
    gray:    "bg-gray-500/10   text-gray-600    dark:text-gray-400",
  };

  const inner = (
    <>
      {icon && <span className="mb-1 block text-lg leading-none">{icon}</span>}
      <p className="text-[11px] font-medium opacity-70 leading-tight truncate">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value.toLocaleString()}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`block rounded-xl px-3 py-2.5 transition-all hover:brightness-95 hover:-translate-y-0.5 hover:shadow-md ${colors[color]}`}
      >
        {inner}
        <p className="mt-1 text-[10px] opacity-40">Filter →</p>
      </Link>
    );
  }
  return (
    <div className={`rounded-xl px-3 py-2.5 ${colors[color]}`}>
      {inner}
    </div>
  );
}

// ─── PaginationLink ───────────────────────────────────────────────────────────

function PaginationLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-lg border px-3 py-1.5 text-xs opacity-40">
        {label}
      </span>
    );
  }
  return (
    <Link href={href} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
      {label}
    </Link>
  );
}
